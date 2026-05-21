import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Endpoint, HttpMethod, WebhookEvent } from "@webhook-it/shared";
import { DB_PATH } from "./paths.js";
import { shortId } from "./ids.js";

const SCHEMA = `
create table if not exists endpoint (
  name        text primary key,
  target_url  text not null,
  created_at  text not null
);

create table if not exists event (
  id               text primary key,
  endpoint_name    text not null,
  method           text not null,
  path_suffix      text,
  query            text not null,
  headers          text not null,
  body             blob not null,
  received_at      text not null,
  delivered_at     text,
  delivery_status  integer,
  delivery_error   text
);

create index if not exists idx_event_endpoint
  on event (endpoint_name, received_at desc);
`;

interface EndpointRow {
  name: string;
  target_url: string;
  created_at: string;
}

interface EventRow {
  id: string;
  endpoint_name: string;
  method: string;
  path_suffix: string | null;
  query: string;
  headers: string;
  body: Uint8Array;
  received_at: string;
  delivered_at: string | null;
  delivery_status: number | null;
  delivery_error: string | null;
}

export interface InsertEventInput {
  endpointName: string;
  method: HttpMethod;
  pathSuffix: string | null;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: Buffer;
}

function toEndpoint(row: EndpointRow): Endpoint {
  return {
    name: row.name,
    targetUrl: row.target_url,
    createdAt: row.created_at,
  };
}

function toEvent(row: EventRow): WebhookEvent {
  return {
    id: row.id,
    endpointName: row.endpoint_name,
    method: row.method as HttpMethod,
    pathSuffix: row.path_suffix,
    query: JSON.parse(row.query) as Record<string, string>,
    headers: JSON.parse(row.headers) as Record<string, string>,
    bodyBase64: Buffer.from(row.body).toString("base64"),
    receivedAt: row.received_at,
    deliveredAt: row.delivered_at,
    deliveryStatus: row.delivery_status,
    deliveryError: row.delivery_error,
  };
}

/**
 * Local persistence in SQLite (`bun:sqlite`, built into Bun — no external
 * service). Synchronous on purpose: it is a single-user database on the
 * developer's machine, so simplicity wins over concurrency here.
 */
export class Storage {
  readonly #db: Database;

  private constructor(db: Database) {
    this.#db = db;
  }

  static open(path: string = DB_PATH): Storage {
    mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path, { create: true });
    db.run("pragma journal_mode = wal;");
    db.run(SCHEMA);
    return new Storage(db);
  }

  close(): void {
    this.#db.close();
  }

  // --- endpoints --------------------------------------------------------

  createEndpoint(name: string, targetUrl: string): Endpoint {
    const createdAt = new Date().toISOString();
    this.#db.run(
      "insert into endpoint (name, target_url, created_at) values (?, ?, ?)",
      [name, targetUrl, createdAt],
    );
    return { name, targetUrl, createdAt };
  }

  listEndpoints(): Endpoint[] {
    const rows = this.#db
      .query("select name, target_url, created_at from endpoint order by created_at")
      .all() as EndpointRow[];
    return rows.map(toEndpoint);
  }

  getEndpoint(name: string): Endpoint | null {
    const row = this.#db
      .query("select name, target_url, created_at from endpoint where name = ?")
      .get(name) as EndpointRow | null;
    return row ? toEndpoint(row) : null;
  }

  updateEndpointTarget(name: string, targetUrl: string): boolean {
    const result = this.#db.run(
      "update endpoint set target_url = ? where name = ?",
      [targetUrl, name],
    );
    return result.changes > 0;
  }

  deleteEndpoint(name: string): boolean {
    const result = this.#db.run("delete from endpoint where name = ?", [name]);
    return result.changes > 0;
  }

  // --- events -----------------------------------------------------------

  insertEvent(input: InsertEventInput): WebhookEvent {
    const id = shortId();
    const receivedAt = new Date().toISOString();
    this.#db.run(
      `insert into event
         (id, endpoint_name, method, path_suffix, query, headers, body, received_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.endpointName,
        input.method,
        input.pathSuffix,
        JSON.stringify(input.query),
        JSON.stringify(input.headers),
        input.body,
        receivedAt,
      ],
    );
    return {
      id,
      endpointName: input.endpointName,
      method: input.method,
      pathSuffix: input.pathSuffix,
      query: input.query,
      headers: input.headers,
      bodyBase64: input.body.toString("base64"),
      receivedAt,
      deliveredAt: null,
      deliveryStatus: null,
      deliveryError: null,
    };
  }

  getEvent(id: string): WebhookEvent | null {
    const row = this.#db
      .query("select * from event where id = ?")
      .get(id) as EventRow | null;
    return row ? toEvent(row) : null;
  }

  listEvents(endpointName: string | null, limit: number): WebhookEvent[] {
    const rows = (
      endpointName
        ? this.#db
            .query(
              "select * from event where endpoint_name = ? order by received_at desc limit ?",
            )
            .all(endpointName, limit)
        : this.#db
            .query("select * from event order by received_at desc limit ?")
            .all(limit)
    ) as EventRow[];
    return rows.map(toEvent);
  }

  /** Current max rowid — used as the initial cursor for live tailing. */
  latestSeq(): number {
    const row = this.#db
      .query("select max(rowid) as seq from event")
      .get() as { seq: number | null };
    return row.seq ?? 0;
  }

  /** Events with a rowid above the cursor, in arrival order. */
  eventsSince(
    cursor: number,
    limit = 200,
  ): { seq: number; event: WebhookEvent }[] {
    const rows = this.#db
      .query(
        "select rowid as seq, * from event where rowid > ? order by rowid limit ?",
      )
      .all(cursor, limit) as (EventRow & { seq: number })[];
    return rows.map((row) => ({ seq: row.seq, event: toEvent(row) }));
  }

  markDelivered(
    id: string,
    status: number | null,
    error: string | null,
  ): void {
    this.#db.run(
      "update event set delivered_at = ?, delivery_status = ?, delivery_error = ? where id = ?",
      [new Date().toISOString(), status, error, id],
    );
  }
}
