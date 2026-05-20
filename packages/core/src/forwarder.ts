import type { WebhookEvent } from "@webhook-it/shared";

export interface ForwardResult {
  /** HTTP status returned by the local target; null if it never connected. */
  status: number | null;
  error: string | null;
  latencyMs: number;
}

/**
 * Hop-by-hop headers and the ones `fetch` recomputes. Dropped on forward;
 * everything else (including `Stripe-Signature`, `X-Hub-Signature-256`, etc.)
 * passes through untouched.
 */
const STRIP_HEADERS = new Set([
  "host",
  "content-length",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "accept-encoding",
]);

function joinPath(base: string, suffix: string): string {
  return `${base.replace(/\/+$/, "")}/${suffix.replace(/^\/+/, "")}`;
}

/**
 * Delivers an event to the local target, preserving the method, headers and the
 * raw body bytes. Used both by the daemon (live forward) and by `replay`.
 */
export async function forwardEvent(
  targetUrl: string,
  event: WebhookEvent,
): Promise<ForwardResult> {
  const startedAt = Date.now();

  const url = new URL(targetUrl);
  if (event.pathSuffix) {
    url.pathname = joinPath(url.pathname, event.pathSuffix);
  }
  for (const [key, value] of Object.entries(event.query)) {
    url.searchParams.set(key, value);
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  const hasBody = event.method !== "GET" && event.method !== "HEAD";

  try {
    const response = await fetch(url, {
      method: event.method,
      headers,
      body: hasBody ? Buffer.from(event.bodyBase64, "base64") : undefined,
    });
    // drain the body to release the connection
    await response.arrayBuffer().catch(() => undefined);
    return {
      status: response.status,
      error: null,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      status: null,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - startedAt,
    };
  }
}
