import { useCallback } from "react";
import type { DbConnection } from "@/generated";
import { FieldMetadata, ReducerMetadata } from "@/types/spacetime";

export const useReducerCaller = (
  connection: DbConnection | null,
  discoveredReducers: ReducerMetadata[]
) => {
  const callReducer = useCallback(
    async (reducerName: string, args: any) => {
      if (!connection) {
        throw new Error("Not connected to SpacetimeDB");
      }

      const reducerMetadata = discoveredReducers.find(
        (r) => r.name === reducerName
      );
      if (!reducerMetadata) {
        throw new Error(`Reducer metadata not found: ${reducerName}`);
      }

      const camelCaseMethodName = toCamelCase(reducerName);
      const reducerMethod = (connection.reducers as any)[camelCaseMethodName];

      if (!reducerMethod || typeof reducerMethod !== "function") {
        throw new Error(`Reducer method not found: ${camelCaseMethodName}`);
      }

      try {
        const convertedArgs = convertArgsToObject(args);
        const orderedArgs = createOrderedArgs(
          reducerMetadata.fields,
          convertedArgs
        );

        return await reducerMethod.call(connection.reducers, ...orderedArgs);
      } catch (error) {
        console.error(`Failed to call reducer ${reducerName}:`, error);
        throw error;
      }
    },
    [connection, discoveredReducers]
  );

  return { callReducer };
};

const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const convertArgsToObject = (args: any): Record<string, any> => {
  const converted: Record<string, any> = {};

  Object.keys(args).forEach((key) => {
    const camelCaseKey = toCamelCase(key);
    converted[camelCaseKey] = args[key];
  });

  return converted;
};

const createOrderedArgs = (
  fields: FieldMetadata[],
  convertedArgs: Record<string, any>
): any[] => {
  return fields.map((field) => {
    let value = convertedArgs[field.name];

    if (value !== null && value !== undefined) {
      value = convertValueByType(value, field.type);
    }

    if (
      field.isOptional &&
      (value === null || value === undefined || value === "")
    ) {
      return undefined;
    }

    return value;
  });
};

const convertValueByType = (value: any, type: string): any => {
  if (type === "string" || type.includes("String")) {
    return String(value);
  }

  if (type === "u64" || type === "i64") {
    return BigInt(value);
  }

  if (type === "boolean" || type === "Bool") {
    return Boolean(value);
  }

  if (type.startsWith("u") || type.startsWith("i") || type.startsWith("f")) {
    return Number(value);
  }

  return value;
};
