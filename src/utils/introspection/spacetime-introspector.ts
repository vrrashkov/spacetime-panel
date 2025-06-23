import * as GeneratedModule from "@/generated";
import { TypeAnalyzer } from "./type-analyzer";
import { ModuleDiscovery } from "./module-discovery";
import { DescriptionGenerator } from "./description-generator";
import { ExampleGenerator } from "./example-generator";
import { categorizeItem, getIconForItem } from "./categorization";
import { ReducerMetadata, TableMetadata } from "@/types/spacetime";

export class SpacetimeIntrospector {
  private typeAnalyzer = new TypeAnalyzer();
  private moduleDiscovery = new ModuleDiscovery();
  private descriptionGenerator = new DescriptionGenerator();

  discoverTables(): TableMetadata[] {
    const tables: TableMetadata[] = [];
    const tableTypes = this.moduleDiscovery.findTableTypes();

    for (const tableName of tableTypes) {
      try {
        const tableType = (GeneratedModule as any)[tableName];

        if (!tableType?.getTypeScriptAlgebraicType) continue;

        const algebraicType = tableType.getTypeScriptAlgebraicType();
        const fields = this.typeAnalyzer.analyzeAlgebraicType(
          algebraicType,
          tableName
        );
        const snakeCaseName = this.toSnakeCase(tableName);

        tables.push({
          name: snakeCaseName,
          displayName: this.formatDisplayName(tableName),
          primaryKey: this.inferPrimaryKey(fields),
          fields,
          icon: getIconForItem(tableName),
          category: categorizeItem(tableName),
          description: this.descriptionGenerator.generateTableDescription(
            tableName,
            fields
          ),
          actions: this.inferTableActions(tableName, fields),
        });
      } catch (error) {
        console.warn(`Failed to introspect table ${tableName}:`, error);
      }
    }

    return tables.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  discoverReducers(): ReducerMetadata[] {
    const reducers: ReducerMetadata[] = [];
    const reducerTypes = this.moduleDiscovery.findReducerTypes();

    for (const reducerName of reducerTypes) {
      try {
        const reducerType = (GeneratedModule as any)[reducerName];

        if (!reducerType?.getTypeScriptAlgebraicType) continue;

        const algebraicType = reducerType.getTypeScriptAlgebraicType();
        const fields = this.typeAnalyzer.analyzeAlgebraicType(
          algebraicType,
          reducerName
        );
        const isDestructive = this.isDestructiveReducer(reducerName);
        const snakeCaseName = this.toSnakeCase(reducerName);

        reducers.push({
          name: snakeCaseName,
          displayName: this.formatDisplayName(reducerName),
          description: this.descriptionGenerator.generateReducerDescription(
            reducerName,
            fields
          ),
          category: categorizeItem(reducerName),
          fields,
          icon: getIconForItem(reducerName),
          color: this.getReducerColor(reducerName, isDestructive),
          isDestructive,
          exampleArgs: ExampleGenerator.generateExampleArgs(fields),
        });
      } catch (error) {
        console.warn(`Failed to introspect reducer ${reducerName}:`, error);
      }
    }

    return reducers.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }

  private inferPrimaryKey(fields: any[]): string {
    const idField = fields.find(
      (f) => f.name === "id" || f.name.endsWith("_id") || f.name === "identity"
    );
    return idField?.name || (fields.length > 0 ? fields[0].name : "id");
  }

  private inferTableActions(tableName: string, fields: any[]): string[] {
    const actions = ["view", "export"];

    if (fields.some((f) => f.name.includes("id"))) {
      actions.push("search", "filter");
    }

    const actionsByType: Record<string, string[]> = {
      user: ["ban", "promote"],
      player: ["ban", "promote"],
      room: ["close", "moderate"],
      session: ["close", "moderate"],
      config: ["edit", "reset"],
      setting: ["edit", "reset"],
    };

    for (const [type, typeActions] of Object.entries(actionsByType)) {
      if (tableName.includes(type)) {
        actions.push(...typeActions);
        break;
      }
    }

    return actions;
  }

  private isDestructiveReducer(reducerName: string): boolean {
    const destructivePatterns = [
      "delete",
      "remove",
      "destroy",
      "clear",
      "reset",
      "purge",
      "ban",
      "kick",
      "terminate",
      "cancel",
      "abort",
    ];

    return destructivePatterns.some((pattern) =>
      reducerName.toLowerCase().includes(pattern)
    );
  }

  private getReducerColor(reducerName: string, isDestructive: boolean): string {
    if (isDestructive) return "red";

    const name = reducerName.toLowerCase();

    const colorPatterns: Record<string, string[]> = {
      green: ["create", "add", "register"],
      blue: ["update", "modify", "edit"],
      emerald: ["join", "connect"],
      orange: ["leave", "disconnect"],
      purple: ["open", "unlock"],
      indigo: ["generate", "produce"],
    };

    for (const [color, patterns] of Object.entries(colorPatterns)) {
      if (patterns.some((pattern) => name.includes(pattern))) {
        return color;
      }
    }

    return "gray";
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
  }

  private formatDisplayName(name: string): string {
    return name
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}

export const spacetimeIntrospector = new SpacetimeIntrospector();
