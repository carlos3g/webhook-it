import { z } from "zod";

export const httpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

export type HttpMethod = z.infer<typeof httpMethodSchema>;

/**
 * A received webhook. Persisted in the local SQLite database; it is the unit of
 * replay and history. The body is stored byte-for-byte (base64 in this
 * representation) because any change breaks the providers' signature validation.
 */
export interface WebhookEvent {
  /** short id, used in `wi replay <id>`. */
  id: string;
  endpointName: string;
  method: HttpMethod;
  /** extra path segment, e.g. provider POSTs to /w/abc/foo → "/foo". */
  pathSuffix: string | null;
  query: Record<string, string>;
  headers: Record<string, string>;
  /** raw body in base64 — preserves the bytes for signature validation. */
  bodyBase64: string;
  /** ISO-8601 of when it reached the daemon. */
  receivedAt: string;
  /** ISO-8601 of when the local forward finished; null = not delivered yet. */
  deliveredAt: string | null;
  /** HTTP status returned by the local target; null if there was no response. */
  deliveryStatus: number | null;
  /** forward error message, if it failed. */
  deliveryError: string | null;
}
