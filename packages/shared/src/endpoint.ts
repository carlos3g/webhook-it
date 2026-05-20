import { z } from "zod";

/**
 * The endpoint name goes straight into the public URL (`/w/<name>`), so it must
 * be a path-safe slug. It is also the primary key in SQLite.
 */
export const endpointNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z0-9][a-z0-9-_]*$/i,
    "use only letters, numbers, '-' or '_', starting with a letter or number",
  );

export interface Endpoint {
  /** slug used in the public URL and as the primary key. */
  name: string;
  /** local URL that receives the forward, e.g. http://localhost:3000/api/webhooks/stripe */
  targetUrl: string;
  /** ISO-8601. */
  createdAt: string;
}
