import { useCallback } from "react";
import { camelCase } from "lodash";
import type { SubscriptionEventContext, EventContext } from "@/generated";
import { useAppDispatch } from "@/store/hooks";
import { setTableData } from "@/store/spacetime-slice";
import { processTableDataForRedux } from "@/utils/serialization";
import type { EventCallbacks } from "./use-event-callbacks";
import { TableMetadata } from "@/types/spacetime";

export const useTableHandlers = (
  discoveredTables: TableMetadata[],
  getCallback: (name: string) => EventCallbacks[string]
) => {
  const dispatch = useAppDispatch();

  const setupTableHandlers = useCallback(
    (ctx: SubscriptionEventContext) => {
      discoveredTables.forEach((table) => {
        const tableName = table.name;
        const camelCaseTableName = camelCase(tableName);

        try {
          const tableHandle = (ctx.db as any)[camelCaseTableName];

          if (!tableHandle) {
            return;
          }

          const initialData = Array.from(tableHandle.iter());
          const serializedData = processTableDataForRedux(initialData);
          dispatch(setTableData({ tableName, data: serializedData }));

          setupTableEventHandlers(
            tableHandle,
            table,
            camelCaseTableName,
            getCallback,
            dispatch
          );
        } catch (error) {
          console.error(`Failed to setup table ${tableName}:`, error);
        }
      });
    },
    [discoveredTables, dispatch, getCallback]
  );

  return { setupTableHandlers };
};

const setupTableEventHandlers = (
  tableHandle: any,
  table: TableMetadata,
  camelCaseTableName: string,
  getCallback: (name: string) => EventCallbacks[string],
  dispatch: ReturnType<typeof useAppDispatch>
) => {
  const { name: tableName, displayName } = table;

  tableHandle.onInsert((eventCtx: EventContext, row: any) => {
    updateTableData(eventCtx, tableName, camelCaseTableName, dispatch);

    const callbackName = `on${displayName.replace(/\s+/g, "")}Insert`;
    const callback = getCallback(callbackName) as
      | ((ctx: EventContext, row: any) => void)
      | undefined;
    callback?.(eventCtx, row);
  });

  tableHandle.onUpdate((eventCtx: EventContext, oldRow: any, newRow: any) => {
    updateTableData(eventCtx, tableName, camelCaseTableName, dispatch);

    const callbackName = `on${displayName.replace(/\s+/g, "")}Update`;
    const callback = getCallback(callbackName) as
      | ((ctx: EventContext, oldRow: any, newRow: any) => void)
      | undefined;
    callback?.(eventCtx, oldRow, newRow);
  });

  tableHandle.onDelete((eventCtx: EventContext, row: any) => {
    updateTableData(eventCtx, tableName, camelCaseTableName, dispatch);

    const callbackName = `on${displayName.replace(/\s+/g, "")}Delete`;
    const callback = getCallback(callbackName) as
      | ((ctx: EventContext, row: any) => void)
      | undefined;
    callback?.(eventCtx, row);
  });
};

const updateTableData = (
  eventCtx: EventContext,
  tableName: string,
  camelCaseTableName: string,
  dispatch: ReturnType<typeof useAppDispatch>
) => {
  try {
    const allRows = Array.from((eventCtx.db as any)[camelCaseTableName].iter());
    const serializedRows = processTableDataForRedux(allRows);
    dispatch(setTableData({ tableName, data: serializedRows }));
  } catch (error) {
    console.error(`Error updating table data for ${tableName}:`, error);
  }
};
