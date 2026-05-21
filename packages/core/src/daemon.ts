import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { httpMethodSchema, type HttpMethod } from "@webhook-it/shared";
import type { WebhookItConfig } from "./config.js";
import { forwardEvent } from "./forwarder.js";
import type { Storage } from "./storage.js";
import { NgrokTunnel } from "./tunnel/ngrok.js";

/** Summary of a received webhook, handed to the CLI hooks for display. */
export interface DaemonEventInfo {
  endpointName: string;
  eventId: string;
  method: string;
  pathSuffix: string | null;
  /** false = a webhook arrived for an endpoint that does not exist. */
  matched: boolean;
}

export interface DaemonHooks {
  onEvent?: (info: DaemonEventInfo) => void;
  onLog?: (message: string) => void;
}

export interface DaemonHandle {
  /** Base URL for receiving webhooks (ngrok tunnel, or 127.0.0.1 without tunnel). */
  publicUrl: string;
  stop: () => Promise<void>;
}

export interface DaemonOptions {
  /**
   * false starts only the local HTTP server, without the ngrok tunnel — useful
   * for testing locally (sending webhooks with curl to 127.0.0.1) without an
   * account. Default: true.
   */
  tunnel?: boolean;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function normalizeHeaders(
  raw: IncomingMessage["headers"],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  storage: Storage,
  hooks: DaemonHooks,
): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = new URL(req.url ?? "/", "http://localhost");
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    sendJson(res, 200, { service: "webhook-it", ok: true });
    return;
  }
  if (segments[0] !== "w" || !segments[1]) {
    sendJson(res, 404, { error: "invalid route; use /w/<endpoint>" });
    return;
  }

  const endpointName = segments[1];
  const pathSuffix =
    segments.length > 2 ? `/${segments.slice(2).join("/")}` : null;

  // the body is always read (even for an unknown endpoint) so the connection
  // does not hang.
  const body = await readBody(req);
  const endpoint = storage.getEndpoint(endpointName);

  if (!endpoint) {
    hooks.onEvent?.({
      endpointName,
      eventId: "-",
      method,
      pathSuffix,
      matched: false,
    });
    sendJson(res, 404, { error: `endpoint '${endpointName}' does not exist` });
    return;
  }

  const methodParse = httpMethodSchema.safeParse(method);
  const httpMethod: HttpMethod = methodParse.success ? methodParse.data : "POST";

  const event = storage.insertEvent({
    endpointName,
    method: httpMethod,
    pathSuffix,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: normalizeHeaders(req.headers),
    body,
  });

  // Respond 200 right away: the provider never waits for the local forward. The
  // webhook is saved in SQLite — even if the forward fails, it can be replayed.
  sendJson(res, 200, { ok: true, id: event.id });
  hooks.onEvent?.({
    endpointName,
    eventId: event.id,
    method,
    pathSuffix,
    matched: true,
  });

  // async forward — does not block the response to the provider.
  void forwardEvent(endpoint.targetUrl, event)
    .then((result) => {
      storage.markDelivered(event.id, result.status, result.error);
      hooks.onLog?.(
        result.error
          ? `${event.id} → delivery failed: ${result.error}`
          : `${event.id} → delivered (${String(result.status)}) in ${String(result.latencyMs)}ms`,
      );
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      storage.markDelivered(event.id, null, message);
    });
}

/**
 * Starts the local daemon: an HTTP server on 127.0.0.1 that receives the
 * webhooks coming through the tunnel, persists them and forwards them — plus the
 * ngrok tunnel itself pointing at it. A single tunnel; per-endpoint routing is
 * done here by path.
 */
export async function startDaemon(
  storage: Storage,
  config: WebhookItConfig,
  hooks: DaemonHooks = {},
  options: DaemonOptions = {},
): Promise<DaemonHandle> {
  const useTunnel = options.tunnel !== false;
  const port = config.ingestPort;

  const server: Server = createServer((req, res) => {
    handleRequest(req, res, storage, hooks).catch((err: unknown) => {
      hooks.onLog?.(`handler error: ${String(err)}`);
      if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve();
    });
  });
  hooks.onLog?.(`local ingest listening on http://127.0.0.1:${String(port)}`);

  const closeServer = (): Promise<void> =>
    new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });

  if (!useTunnel) {
    return {
      publicUrl: `http://127.0.0.1:${String(port)}`,
      stop: closeServer,
    };
  }

  const tunnel = new NgrokTunnel();
  let publicUrl: string;
  try {
    if (!config.ngrokDomain) {
      throw new Error(
        "ngrok domain not configured — run: wi config --ngrok-domain <your>.ngrok-free.app",
      );
    }
    publicUrl = await tunnel.start({ port, domain: config.ngrokDomain });
  } catch (err) {
    await closeServer();
    throw err;
  }

  return {
    publicUrl,
    stop: async () => {
      tunnel.stop();
      await closeServer();
    },
  };
}
