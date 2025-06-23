import { useCallback } from "react";
import type { DbConnection, ReducerEventContext } from "@/generated";
import type { EventCallbacks } from "./use-event-callbacks";
import { ReducerMetadata } from "@/types/spacetime";

export const useReducerHandlers = (
  discoveredReducers: ReducerMetadata[],
  getCallback: (name: string) => EventCallbacks[string]
) => {
  const setupReducerHandlers = useCallback(
    (conn: DbConnection) => {
      discoveredReducers.forEach((reducer) => {
        const { name: reducerName } = reducer;

        try {
          const camelCaseMethodName = toCamelCase(reducerName);
          const eventHandlerName = `on${capitalize(camelCaseMethodName)}`;

          const callback = getCallback(eventHandlerName);
          if (!callback) {
            return;
          }

          const reducerHandler = (conn.reducers as any)[eventHandlerName];

          if (!reducerHandler || typeof reducerHandler !== "function") {
            console.warn(
              `Event handler not found: ${reducerName} (${eventHandlerName})`
            );
            return;
          }

          reducerHandler((ctx: ReducerEventContext, ...args: any[]) => {
            callback(ctx, ...args);
          });
        } catch (error) {
          console.error(
            `Failed to setup reducer handler ${reducerName}:`,
            error
          );
        }
      });
    },
    [discoveredReducers, getCallback]
  );

  return { setupReducerHandlers };
};

const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);
