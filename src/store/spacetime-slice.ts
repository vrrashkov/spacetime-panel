import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { DbConnection } from "@/generated";
import { processTableDataForRedux } from "@/utils/serialization";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface SpacetimeState {
  connectionStatus: ConnectionStatus;
  connection: DbConnection | null;
  identity: string | null;
  error: string | null;
  [key: string]: any;
}

const initialState: SpacetimeState = {
  connectionStatus: "disconnected",
  connection: null,
  identity: null,
  error: null,
};

const comparePrimaryKeys = (a: any, b: any, primaryKey: string): boolean => {
  if (typeof a === "object" && typeof b === "object") {
    return a[primaryKey] === b[primaryKey];
  }
  return a === b;
};

const spacetimeSlice = createSlice({
  name: "spacetime",
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
    },
    setConnection: (state, action: PayloadAction<DbConnection | null>) => {
      state.connection = action.payload;
    },
    setIdentity: (state, action: PayloadAction<string>) => {
      state.identity = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAllTables: (state) => {
      Object.keys(state).forEach((key) => {
        if (
          key !== "connectionStatus" &&
          key !== "connection" &&
          key !== "identity" &&
          key !== "error"
        ) {
          delete state[key];
        }
      });
    },
    initializeTable: (state, action: PayloadAction<string>) => {
      const tableName = action.payload;
      if (!state[tableName]) {
        state[tableName] = [];
      }
    },
    setTableData: (
      state,
      action: PayloadAction<{ tableName: string; data: any[] }>
    ) => {
      const { tableName, data } = action.payload;
      state[tableName] = data;
    },
    insertTableRow: (
      state,
      action: PayloadAction<{ tableName: string; row: any }>
    ) => {
      const { tableName, row } = action.payload;
      if (state[tableName]) {
        state[tableName].push(row);
      }
    },
    updateTableRow: (
      state,
      action: PayloadAction<{
        tableName: string;
        primaryKey: string;
        primaryValue: any;
        row: any;
      }>
    ) => {
      const { tableName, primaryKey, primaryValue, row } = action.payload;
      if (state[tableName]) {
        const index = state[tableName].findIndex((item: any) =>
          comparePrimaryKeys(item[primaryKey], primaryValue, primaryKey)
        );
        if (index !== -1) {
          state[tableName][index] = row;
        }
      }
    },
    deleteTableRow: (
      state,
      action: PayloadAction<{
        tableName: string;
        primaryKey: string;
        primaryValue: any;
      }>
    ) => {
      const { tableName, primaryKey, primaryValue } = action.payload;
      if (state[tableName]) {
        const index = state[tableName].findIndex((item: any) =>
          comparePrimaryKeys(item[primaryKey], primaryValue, primaryKey)
        );
        if (index !== -1) {
          state[tableName].splice(index, 1);
        }
      }
    },
  },
});

export const {
  setConnectionStatus,
  setConnection,
  setIdentity,
  setError,
  clearError,
  clearAllTables,
  initializeTable,
  setTableData,
  insertTableRow,
  updateTableRow,
  deleteTableRow,
} = spacetimeSlice.actions;

export default spacetimeSlice.reducer;

export const selectConnectionStatus = (state: { spacetime: SpacetimeState }) =>
  state.spacetime.connectionStatus;

export const selectConnection = (state: { spacetime: SpacetimeState }) =>
  state.spacetime.connection;

export const selectIsConnected = (state: { spacetime: SpacetimeState }) =>
  state.spacetime.connectionStatus === "connected";

export const selectIsConnecting = (state: { spacetime: SpacetimeState }) =>
  state.spacetime.connectionStatus === "connecting";

export const selectIdentity = (state: { spacetime: SpacetimeState }) =>
  state.spacetime.identity;

export const selectError = (state: { spacetime: SpacetimeState }) =>
  state.spacetime.error;

export const selectTableData =
  (tableName: string) => (state: { spacetime: SpacetimeState }) =>
    state.spacetime[tableName] || [];
