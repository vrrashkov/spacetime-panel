import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import type { DbConnection } from "@/generated";

export const ConnectionStatusSchema = z.enum([
  "disconnected",
  "connecting",
  "connected",
  "error",
]);

export const BaseSpacetimeStateSchema = z.object({
  connectionStatus: ConnectionStatusSchema,
  connection: z.custom<DbConnection>().nullable(),
  identity: z.string().nullable(),
  error: z.string().nullable(),
});

export const SpacetimeStateSchema = BaseSpacetimeStateSchema.extend({
  selectedRoom: z.bigint().nullable().optional(),
}).catchall(z.array(z.any()));

// Field metadata schema
export const FieldMetadataSchema = z.object({
  name: z.string(),
  type: z.string(),
  isOptional: z.boolean(),
  isArray: z.boolean(),
  enumValues: z.array(z.string()).optional(),
  displayName: z.string(),
  inputType: z.enum([
    "text",
    "number",
    "boolean",
    "select",
    "textarea",
    "date",
    "email",
    "url",
    "password",
  ]),
  validation: z
    .object({
      required: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  _enumConstructor: z.any().optional(),
});

// Table metadata schema
export const TableMetadataSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  primaryKey: z.string(),
  fields: z.array(FieldMetadataSchema),
  icon: z.custom<LucideIcon>(),
  category: z.string(),
  description: z.string(),
  actions: z.array(z.string()),
});

// Reducer metadata schema
export const ReducerMetadataSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  category: z.string(),
  fields: z.array(FieldMetadataSchema),
  icon: z.custom<LucideIcon>(),
  color: z.string(),
  isDestructive: z.boolean(),
  exampleArgs: z.any(),
});

export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export type BaseSpacetimeState = z.infer<typeof BaseSpacetimeStateSchema>;

export interface SpacetimeState extends BaseSpacetimeState {
  [tableName: string]: any;
}

export type FieldMetadata = z.infer<typeof FieldMetadataSchema>;
export type TableMetadata = z.infer<typeof TableMetadataSchema>;
export type ReducerMetadata = z.infer<typeof ReducerMetadataSchema>;
