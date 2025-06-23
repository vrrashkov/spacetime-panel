import { FieldMetadata } from "@/types/spacetime";
import { categorizeItem } from "./categorization";

export class DescriptionGenerator {
  generateTableDescription(tableName: string, fields: FieldMetadata[]): string {
    const category = categorizeItem(tableName);
    const fieldCount = fields.length;
    const fieldText = fieldCount === 1 ? "field" : "fields";
    const cleanName = tableName.replace(/_/g, " ");

    return `${category} table with ${fieldCount} ${fieldText}. Stores ${cleanName} related data.`;
  }

  generateReducerDescription(
    reducerName: string,
    fields: FieldMetadata[]
  ): string {
    const action = this.inferAction(reducerName);
    const target = this.inferTarget(reducerName);

    if (fields.length === 0) {
      return `${action} ${target} operation with no parameters.`;
    }

    const primaryField =
      fields.find((f) => f.name.includes("id") || f.name.includes("name")) ||
      fields[0];

    const additionalParams =
      fields.length > 1
        ? ` and ${fields.length - 1} other parameter${
            fields.length > 2 ? "s" : ""
          }`
        : "";

    return `${action} ${target} operation. Requires ${primaryField.displayName.toLowerCase()}${additionalParams}.`;
  }

  private inferAction(reducerName: string): string {
    const name = reducerName.toLowerCase();

    const actionPatterns: Record<string, string[]> = {
      Create: ["create", "add", "register"],
      Update: ["update", "modify", "edit"],
      Delete: ["delete", "remove", "destroy"],
      Retrieve: ["get", "fetch", "retrieve"],
      Join: ["join", "connect", "attach"],
      Leave: ["leave", "disconnect", "detach"],
      Open: ["open", "unlock", "activate"],
      Close: ["close", "lock", "deactivate"],
      Start: ["start", "begin", "init"],
      Stop: ["stop", "end", "finish"],
      Send: ["send", "post", "publish"],
      Generate: ["generate", "produce", "build"],
    };

    for (const [action, patterns] of Object.entries(actionPatterns)) {
      if (patterns.some((pattern) => name.includes(pattern))) {
        return action;
      }
    }

    return "Execute";
  }

  private inferTarget(reducerName: string): string {
    const name = reducerName.toLowerCase();

    const targetPatterns: Record<string, string[]> = {
      user: ["user", "player", "member"],
      room: ["room", "session", "lobby"],
      block: ["block", "item", "asset"],
      message: ["message", "post", "comment"],
      configuration: ["config", "setting", "preference"],
      statistics: ["stat", "metric", "analytics"],
    };

    for (const [target, patterns] of Object.entries(targetPatterns)) {
      if (patterns.some((pattern) => name.includes(pattern))) {
        return target;
      }
    }

    const parts = name.split("_");
    return parts.length > 1 ? parts[parts.length - 1] : "operation";
  }
}
