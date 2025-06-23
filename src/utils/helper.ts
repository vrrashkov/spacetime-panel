import { parse, stringify } from "flatted";

const createReplacer = () => {
  return (key: string, value: any) => {
    // Handle BigInt
    if (typeof value === "bigint") {
      return { __type: "bigint", value: value.toString() };
    }

    // Handle Date objects
    if (value instanceof Date) {
      return { __type: "date", value: value.toISOString() };
    }

    // Handle functions
    if (typeof value === "function") {
      return { __type: "function", name: value.name || "anonymous" };
    }

    // Handle undefined (JSON doesn't support undefined)
    if (value === undefined) {
      return { __type: "undefined" };
    }

    // Handle Symbol
    if (typeof value === "symbol") {
      return { __type: "symbol", value: value.toString() };
    }

    return value;
  };
};

// Custom reviver to restore special types when parsing
const createReviver = () => {
  return (key: string, value: any) => {
    if (value && typeof value === "object" && value.__type) {
      switch (value.__type) {
        case "bigint":
          return BigInt(value.value);
        case "date":
          return new Date(value.value);
        case "undefined":
          return undefined;
        case "function":
          return `[Function: ${value.name}]`;
        case "symbol":
          return value.value;
        default:
          return value;
      }
    }
    return value;
  };
};

export const safeStringify = (obj: any): string => {
  try {
    return stringify(obj, createReplacer(), 2);
  } catch (error: any) {
    return `Error serializing: ${error.message}`;
  }
};

export const safeParse = (str: string): any => {
  try {
    return parse(str, createReviver());
  } catch (error: any) {
    return { error: `Parse error: ${error.message}` };
  }
};

export const safeDisplay = (obj: any): string => {
  try {
    const flattedString = stringify(obj, createReplacer());
    const parsed = parse(flattedString, createReviver());
    return JSON.stringify(parsed, null, 2);
  } catch (error: any) {
    return `Error formatting: ${error.message}`;
  }
};
