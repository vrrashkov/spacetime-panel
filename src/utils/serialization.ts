// serialization.ts
import { parse, stringify } from "flatted";

// Simple serialization for Redux (converts BigInt to string)
export const serializeForRedux = (data: any): any => {
  if (data === null || data === undefined) return data;

  if (typeof data === "bigint") {
    return data.toString();
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(serializeForRedux);
  }

  if (typeof data === "object") {
    if (data.__timestamp_micros_since_unix_epoch__ !== undefined) {
      const micros =
        typeof data.__timestamp_micros_since_unix_epoch__ === "bigint"
          ? data.__timestamp_micros_since_unix_epoch__.toString()
          : data.__timestamp_micros_since_unix_epoch__.toString();

      const millis = Math.floor(Number(micros) / 1000);
      return new Date(millis).toISOString();
    }

    if (data.toHexString && typeof data.toHexString === "function") {
      return data.toHexString();
    }

    if (
      data.toString &&
      typeof data.toString === "function" &&
      (data.constructor?.name === "Identity" ||
        data.constructor?.name === "Address" ||
        data.constructor?.name?.includes("Id"))
    ) {
      return data.toString();
    }

    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeForRedux(value);
    }
    return serialized;
  }

  return data;
};

export const processTableDataForRedux = (tableData: any[]): any[] => {
  return tableData.map(serializeForRedux);
};

const TypeHandlers = {
  bigint: {
    serialize: (value: bigint) => ({
      __type: "bigint",
      value: value.toString(),
    }),
    deserialize: (data: any) => BigInt(data.value),
  },
  timestamp: {
    serialize: (value: any) => ({
      __type: "timestamp",
      micros: value.__timestamp_micros_since_unix_epoch__.toString(),
    }),
    deserialize: (data: any) => {
      const millis = Math.floor(Number(data.micros) / 1000);
      return new Date(millis);
    },
  },
  date: {
    serialize: (value: Date) => ({
      __type: "date",
      value: value.toISOString(),
    }),
    deserialize: (data: any) => new Date(data.value),
  },
  function: {
    serialize: (value: Function) => ({
      __type: "function",
      name: value.name || "anonymous",
    }),
    deserialize: (data: any) => `[Function: ${data.name}]`,
  },
  undefined: {
    serialize: () => ({ __type: "undefined" }),
    deserialize: () => undefined,
  },
  symbol: {
    serialize: (value: symbol) => ({
      __type: "symbol",
      value: value.toString(),
    }),
    deserialize: (data: any) => data.value,
  },
} as const;

type TypeHandlerKey = keyof typeof TypeHandlers;

const createReplacer = () => (key: string, value: any) => {
  const type = typeof value;

  if (type === "bigint") return TypeHandlers.bigint.serialize(value);

  // Handle SpacetimeDB timestamps
  if (
    value &&
    typeof value === "object" &&
    value.__timestamp_micros_since_unix_epoch__ !== undefined
  ) {
    return TypeHandlers.timestamp.serialize(value);
  }

  if (value instanceof Date) return TypeHandlers.date.serialize(value);
  if (type === "function") return TypeHandlers.function.serialize(value);
  if (value === undefined) return TypeHandlers.undefined.serialize();
  if (type === "symbol") return TypeHandlers.symbol.serialize(value);

  return value;
};

const createReviver = () => (key: string, value: any) => {
  if (value && typeof value === "object" && value.__type) {
    const handlerType = value.__type as TypeHandlerKey;
    if (handlerType in TypeHandlers) {
      return TypeHandlers[handlerType].deserialize(value);
    }
  }
  return value;
};

export const safeStringify = (obj: any): string => {
  try {
    return stringify(obj, createReplacer(), 2);
  } catch (error) {
    return `Serialization error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};

export const safeParse = (str: string): any => {
  try {
    return parse(str, createReviver());
  } catch (error) {
    return {
      error: `Parse error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};

export const safeDisplay = (obj: any): string => {
  try {
    const flattedString = stringify(obj, createReplacer());
    const parsed = parse(flattedString, createReviver());
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return `Error formatting: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};

export const deserializeFromRedux = (data: any[]): any[] => data;

// Helper function to format timestamp for display
export const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return "N/A";

  if (typeof timestamp === "string") {
    return new Date(timestamp).toLocaleString();
  }

  if (timestamp.__timestamp_micros_since_unix_epoch__ !== undefined) {
    const micros = Number(timestamp.__timestamp_micros_since_unix_epoch__);
    const millis = Math.floor(micros / 1000);
    return new Date(millis).toLocaleString();
  }

  return timestamp.toString();
};
