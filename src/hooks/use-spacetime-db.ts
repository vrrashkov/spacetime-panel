import { useCallback, useEffect, useMemo } from "react";
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  DbConnection,
  ErrorContext,
  SubscriptionEventContext,
} from "@/generated";
import {
  setConnectionStatus,
  setConnection,
  setIdentity,
  setError,
  clearAllTables,
  clearError as clearErrorAction,
  initializeTable,
  insertTableRow,
  updateTableRow,
  deleteTableRow,
} from "@/store/spacetime-slice";
import { spacetimeIntrospector } from "@/utils/introspection/spacetime-introspector";
import { spacetimeConfig } from "@/config/spacetime";
import { useEventCallbacks } from "./spacetime/use-event-callbacks";
import { useConnectionState } from "./spacetime/use-connection-state";
import { useTableHandlers } from "./spacetime/use-table-handlers";
import { useReducerHandlers } from "./spacetime/use-reducer-handlers";
import { useReducerCaller } from "./spacetime/use-reducer-caller";

export const useSpacetimeDB = () => {
  const dispatch = useAppDispatch();
  const { connectionStatus, connection, identity, error } = useAppSelector(
    (state) => state.spacetime
  );

  // Get all table data from the state
  const spacetimeState = useAppSelector((state) => state.spacetime);

  // Custom hooks for state management
  const { registerEventCallbacks, unregisterEventCallbacks, getCallback } =
    useEventCallbacks();
  const connectionState = useConnectionState();

  // Discover schema once
  const discoveredTables = spacetimeIntrospector.discoverTables();
  const discoveredReducers = spacetimeIntrospector.discoverReducers();

  // Derived state
  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  // Table and reducer handlers
  const { setupTableHandlers } = useTableHandlers(
    discoveredTables,
    getCallback
  );
  const { setupReducerHandlers } = useReducerHandlers(
    discoveredReducers,
    getCallback
  );
  const { callReducer } = useReducerCaller(connection, discoveredReducers);

  // Table access helpers
  const getTableData = useCallback(
    (tableName: string) => {
      return spacetimeState[tableName] || [];
    },
    [spacetimeState]
  );

  // Specific table getters
  const users = useMemo(() => getTableData("user"), [getTableData]);
  const authEvents = useMemo(() => getTableData("auth_event"), [getTableData]);

  // Current user lookup - handles both camelCase and snake_case field names
  const currentUser = useMemo(() => {
    if (!users || users.length === 0) return null;

    if (!identity) {
      return users[0] || null;
    }

    let user = users.find(
      (user: any) =>
        user.currentIdentity === identity || user.current_identity === identity
    );

    return user || null;
  }, [users, identity]);

  // Get current user by wallet address as fallback
  const getUserByWalletAddress = useCallback(
    (walletAddress: string) => {
      if (!users || users.length === 0) return null;

      return (
        users.find(
          (user: any) =>
            user.walletAddress === walletAddress ||
            user.wallet_address === walletAddress
        ) || null
      );
    },
    [users]
  );

  // Get user's recent auth events
  const getCurrentUserAuthEvents = useMemo(() => {
    if (!authEvents || !currentUser) return [];

    const walletAddress =
      currentUser.walletAddress || currentUser.wallet_address;
    if (!walletAddress) return [];

    return authEvents
      .filter(
        (event: any) =>
          event.userWallet === walletAddress ||
          event.user_wallet === walletAddress
      )
      .sort((a: any, b: any) => {
        const aTime = a.timestamp || a.createdAt;
        const bTime = b.timestamp || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
  }, [authEvents, currentUser]);

  // Initialize tables on mount
  useEffect(() => {
    discoveredTables.forEach((table) => {
      dispatch(initializeTable(table.name));
    });
  }, [dispatch, discoveredTables]);

  const setupSubscriptions = useCallback(
    (conn: DbConnection) => {
      try {
        conn
          .subscriptionBuilder()
          .onApplied((ctx: SubscriptionEventContext) => {
            try {
              setupTableHandlers(ctx);
            } catch (error) {
              console.error("Error setting up table handlers:", error);
            }
          })
          .onError((_ctx: ErrorContext, error?: Error) => {
            const errorMessage = `Subscription failed: ${
              error?.message || "Unknown error"
            }`;
            dispatch(setError(errorMessage));
            dispatch(setConnectionStatus("error"));
          })
          .subscribeToAllTables();

        setupReducerHandlers(conn);
      } catch (error) {
        const errorMessage = `Failed to setup subscriptions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        dispatch(setError(errorMessage));
        dispatch(setConnectionStatus("error"));
      }
    },
    [setupTableHandlers, setupReducerHandlers, dispatch]
  );

  const connect = useCallback(
    async (retryCount = 0) => {
      if (connectionState.isConnecting() || isConnected) {
        return;
      }

      connectionState.setConnecting(true);
      connectionState.setIntentionalDisconnect(false);
      dispatch(setConnectionStatus("connecting"));
      dispatch(clearErrorAction());

      try {
        const token = localStorage.getItem("spacetimedb_token");
        const builder = DbConnection.builder()
          .withUri(spacetimeConfig.uri)
          .withModuleName(spacetimeConfig.moduleName);

        if (token) {
          builder.withToken(token);
        }

        await builder
          .onConnect(
            (conn: DbConnection, identity: Identity, receivedToken: string) => {
              if (receivedToken) {
                localStorage.setItem("spacetimedb_token", receivedToken);
              }

              dispatch(setIdentity(identity.toHexString()));
              dispatch(setConnectionStatus("connected"));
              dispatch(setConnection(conn));
              connectionState.setConnecting(false);

              setTimeout(() => {
                setupSubscriptions(conn);
              }, spacetimeConfig.subscriptionDelay);
            }
          )
          .onDisconnect((_ctx: ErrorContext, error?: Error) => {
            connectionState.setConnecting(false);
            dispatch(setConnectionStatus("disconnected"));
            dispatch(setConnection(null));
            dispatch(clearAllTables());
          })
          .onConnectError((_ctx: ErrorContext, error: Error) => {
            if (!connectionState.isIntentionalDisconnect()) {
              connectionState.setConnecting(false);
              dispatch(setError(error.message));
              dispatch(setConnectionStatus("error"));

              if (retryCount < spacetimeConfig.maxRetries) {
                const retryDelay =
                  spacetimeConfig.retryBackoffMultiplier *
                  1000 *
                  (retryCount + 1);
                setTimeout(() => {
                  connect(retryCount + 1);
                }, retryDelay);
              } else {
                dispatch(
                  setError(
                    `Connection failed after ${spacetimeConfig.maxRetries} attempts: ${error.message}`
                  )
                );
              }
            } else {
              connectionState.setConnecting(false);
              connectionState.setIntentionalDisconnect(false);
              dispatch(setConnectionStatus("disconnected"));
            }
          })
          .build();
      } catch (error) {
        if (!connectionState.isIntentionalDisconnect()) {
          connectionState.setConnecting(false);

          if (retryCount < spacetimeConfig.maxRetries) {
            const retryDelay =
              spacetimeConfig.retryBackoffMultiplier * 1000 * (retryCount + 1);
            setTimeout(() => {
              connect(retryCount + 1);
            }, retryDelay);
          } else {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Unknown connection error";
            dispatch(
              setError(
                `Connection failed after ${spacetimeConfig.maxRetries} attempts: ${errorMessage}`
              )
            );
            dispatch(setConnectionStatus("error"));
          }
        } else {
          connectionState.setConnecting(false);
          connectionState.setIntentionalDisconnect(false);
          dispatch(setConnectionStatus("disconnected"));
        }
      }
    },
    [dispatch, setupSubscriptions, isConnected, connectionState]
  );

  const disconnect = useCallback(() => {
    if (connection) {
      connectionState.setIntentionalDisconnect(true);
      connectionState.setConnecting(false);

      connection.disconnect();
      dispatch(setConnectionStatus("disconnected"));
      dispatch(setConnection(null));
      dispatch(clearAllTables());

      setTimeout(() => {
        connectionState.setIntentionalDisconnect(false);
      }, 1000);
    }
  }, [connection, dispatch, connectionState]);

  const clearError = useCallback(() => {
    dispatch(clearErrorAction());
  }, [dispatch]);

  const refreshSchema = useCallback(() => {
    const newTables = spacetimeIntrospector.discoverTables();
    const newReducers = spacetimeIntrospector.discoverReducers();

    newTables.forEach((table) => {
      dispatch(initializeTable(table.name));
    });

    return { tables: newTables, reducers: newReducers };
  }, [dispatch]);

  // Table operations
  const handleTableInsert = useCallback(
    (tableName: string, row: any) => {
      dispatch(insertTableRow({ tableName, row }));
    },
    [dispatch]
  );

  const handleTableUpdate = useCallback(
    (tableName: string, primaryKey: string, primaryValue: any, row: any) => {
      dispatch(updateTableRow({ tableName, primaryKey, primaryValue, row }));
    },
    [dispatch]
  );

  const handleTableDelete = useCallback(
    (tableName: string, primaryKey: string, primaryValue: any) => {
      dispatch(deleteTableRow({ tableName, primaryKey, primaryValue }));
    },
    [dispatch]
  );

  // User-specific helper functions
  const refreshCurrentUser = useCallback(() => {
    if (isConnected) {
      callReducer("get_current_user", {});
    }
  }, [callReducer, isConnected]);

  const updateUserProfile = useCallback(
    async (nickname?: string) => {
      if (!isConnected) {
        throw new Error("Not connected to SpacetimeDB");
      }

      await callReducer("update_user_profile", { nickname: nickname || null });

      // Refresh user data after update
      setTimeout(() => {
        refreshCurrentUser();
      }, 500);
    },
    [callReducer, isConnected, refreshCurrentUser]
  );

  return {
    // State
    connection,
    connectionStatus,
    identity,
    error,
    isConnected,
    isConnecting,

    // Connection methods
    connect,
    disconnect,
    clearError,

    // Reducer operations
    callReducer,

    // Event callbacks
    registerEventCallbacks,
    unregisterEventCallbacks,

    // Schema
    discoveredTables,
    discoveredReducers,
    refreshSchema,

    // Table operations
    handleTableInsert,
    handleTableUpdate,
    handleTableDelete,

    // Table data access
    getTableData,
    users,
    authEvents,

    // User-specific data and operations
    currentUser,
    isCurrentUserAdmin: true,
    getCurrentUserAuthEvents,
    getUserByWalletAddress,
    refreshCurrentUser,
    updateUserProfile,
  };
};
