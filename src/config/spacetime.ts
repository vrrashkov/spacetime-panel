import { z } from "zod";

const SpacetimeConfigSchema = z.object({
  uri: z.string().url().default("ws://127.0.0.1:3000"),
  moduleName: z.string().default("blockdrop-main"),
  maxRetries: z.coerce.number().min(1).max(10).default(3),
  subscriptionDelay: z.coerce.number().min(0).max(5000).default(500),
  retryBackoffMultiplier: z.coerce.number().min(1).max(5).default(2),
  generatedPath: z.string().default("./generated"),
});

export type SpacetimeConfig = z.infer<typeof SpacetimeConfigSchema>;

export const spacetimeConfig = SpacetimeConfigSchema.parse({
  uri: import.meta.env.VITE_SPACETIME_URI,
  moduleName: import.meta.env.VITE_SPACETIME_MODULE,
  maxRetries: import.meta.env.VITE_SPACETIME_MAX_RETRIES,
  subscriptionDelay: import.meta.env.VITE_SPACETIME_SUBSCRIPTION_DELAY,
  retryBackoffMultiplier: import.meta.env.VITE_SPACETIME_RETRY_BACKOFF,
  generatedPath: import.meta.env.VITE_SPACETIME_GENERATED_PATH,
});
