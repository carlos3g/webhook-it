# Architecture

## Overview

Everything runs on the developer's machine, inside a single Bun process: the
interactive dashboard and the daemon it hosts. The only piece outside the machine
is the ngrok tunnel, which provides the public address.

```
   Provider  (Stripe, GitHub, …)
       │  POST https://yourname.ngrok-free.app/w/stripe-dev
       ▼
   ngrok  — public infrastructure, the only external piece
       │  forwards to 127.0.0.1:4505
       ▼
   ┌───────────────────────────────────────────────────────┐
   │  wi — the interactive dashboard (one Bun process)      │
   │                                                        │
   │   daemon                      OpenTUI + Solid UI       │
   │   - resolve /w/<name>         - endpoint list          │
   │   - store the event      ──▶  - live event feed        │
   │   - respond 200 instantly     - keyboard actions       │
   │   - forward to localhost                               │
   └─────────────┬───────────────────────────┬──────────────┘
                 │                           │
   ~/.webhook-it/db.sqlite          http://localhost:3000/your/webhook
   (endpoints + event history)      (your local app)
```

## Components

### `apps/cli` — the interactive dashboard

A terminal app built with [OpenTUI](https://github.com/anomalyco/opentui) and its
Solid binding, compiled by Bun into a single executable exposed as `webhook-it`
and `wi`.

- **`index.tsx`** — entry point. Handles `--help` / `--version`, opens the
  `Storage`, reads the config, then `render`s the dashboard.
- **`app.tsx`** — the whole dashboard: Solid signals for state, the daemon
  lifecycle, the keyboard router, the layout (header, endpoint pane, event pane,
  footer) and the create/confirm overlays.
- **`theme.ts`** — the color palette.

The dashboard **hosts the daemon in its own process**. Pressing `u` calls
`startDaemon` from `core`; the daemon's `onEvent` / `onLog` hooks update Solid
signals, so the UI reacts to incoming webhooks. A short interval re-reads the
SQLite file so the panes stay in sync with what the daemon writes.

There are no subcommands — `wi` always opens the dashboard (only `--help` and
`--version` short-circuit it).

### `packages/core` — the daemon and the core

Everything that is not presentation. No UI dependency, so a future web UI can
reuse it.

- **`daemon.ts`** — `startDaemon()`: creates an HTTP server on `127.0.0.1:<port>`,
  optionally starts the ngrok tunnel pointing at it, and returns a handle with
  `publicUrl` and `stop()`. With `{ tunnel: false }` it runs local-only.
- **`storage.ts`** — the `Storage` class over `bun:sqlite`. Synchronous on
  purpose (a single-user local database). File at `~/.webhook-it/db.sqlite`.
- **`forwarder.ts`** — `forwardEvent()`: resends an event to the local target
  preserving the method, headers and body bytes. Used by the daemon and replay.
- **`tunnel/ngrok.ts`** — `NgrokTunnel`: runs the `ngrok` binary as a subprocess
  and reads its JSON log to learn when the tunnel came up. The interface is
  isolated to allow other tunnel adapters later.
- **`config.ts` / `paths.ts`** — read/write `~/.webhook-it/config.json` and the
  paths under `~/.webhook-it/`.

### `packages/shared` — contracts

The `Endpoint`, `WebhookEvent`, `HttpMethod` types and the zod schema for the
endpoint name. Pure TypeScript, no runtime APIs — importable by `core`, `cli` and
a future UI.

## The local SQLite database

A single file at `~/.webhook-it/db.sqlite`, in WAL mode.

```sql
create table endpoint (
  name        text primary key,   -- slug used in the URL: /w/<name>
  target_url  text not null,      -- local forward target
  created_at  text not null
);

create table event (
  id               text primary key,  -- short id, used to replay
  endpoint_name    text not null,
  method           text not null,
  path_suffix      text,               -- e.g. POST to /w/abc/foo → "/foo"
  query            text not null,      -- json
  headers          text not null,      -- json
  body             blob not null,      -- raw bytes (essential for signatures)
  received_at      text not null,
  delivered_at     text,               -- null = not delivered yet
  delivery_status  integer,            -- HTTP status from the local target
  delivery_error   text
);

create index idx_event_endpoint on event (endpoint_name, received_at desc);
```

SQLite's implicit `rowid` is used as a cursor for incremental reads.

## The flow of a webhook

1. **The provider does `POST https://yourname.ngrok-free.app/w/stripe-dev`.**
2. ngrok forwards it to `http://127.0.0.1:4505/w/stripe-dev` (the daemon).
3. The daemon splits `endpointName` (`stripe-dev`) and `pathSuffix` from the path.
4. It looks up the endpoint in SQLite. If it does not exist → `404`.
5. It reads the body as a `Buffer`, normalizes headers and query, and `INSERT`s
   into `event`.
6. It responds **`200 {"id": "..."}`** immediately — the provider never waits.
7. **Asynchronously**, it calls `forwardEvent(targetUrl, event)`:
   - rebuilds the URL (`targetUrl` + `pathSuffix` + query);
   - passes every header except the hop-by-hop ones (`host`, `content-length`,
     `connection`, `transfer-encoding`, `accept-encoding`) — signatures pass intact;
   - does a `fetch` with the original method and body bytes.
8. It records the result (`delivered_at`, `delivery_status`, `delivery_error`)
   and reports it through the `onLog` hook, which the dashboard shows.

### If the local target is down

The event is already saved and the provider already received `200`. The forward
records the error in `delivery_error`. Later, with localhost back up, pressing
`r` in the dashboard redelivers it.

### If the dashboard is not open

The tunnel is not up → the provider gets an error from ngrok and the webhook is
lost. This is the accepted limitation of the "no server" model: to receive, the
machine must be on with `wi` open and the daemon started. See
[`MOTIVATION.md`](MOTIVATION.md).

## Technical decisions

### Why Bun

OpenTUI only runs on Bun — it loads its native Zig core through `bun:ffi`, and
`@opentui/core` declares `engines: { bun: ">=1.3.0" }`. Choosing OpenTUI for the
interactive UI therefore meant adopting Bun. Bun also collapses the toolchain: it
runs TypeScript directly, is the package manager, compiles a standalone binary,
and ships `bun:sqlite`.

### Why SQLite via `bun:sqlite`

Built into Bun — zero external dependency, zero extra processes, and the state is
a single file (easy to inspect, copy or delete). The API is synchronous, which
keeps the code simple: a single-user local database has no real concurrency.

### Why the daemon runs inside the dashboard process

The dashboard is what the user keeps open, and the daemon must be up to receive
webhooks — so they are the same process. The daemon's `onEvent` / `onLog` hooks
feed Solid signals directly, so live webhooks update the UI with no IPC.

### Why a tunnel, and why ngrok

A public URL needs infrastructure on the internet (see `MOTIVATION.md`). Between
running your own server and using a tunnel, the tunnel avoids deployment and cost.
ngrok was chosen because it offers **1 free static domain per account** — which
solves the core problem of the expiring URL. The daemon runs the `ngrok` binary
the user already installed, so we embed no native SDK.

### Why one tunnel for several endpoints

The ngrok free plan allows one active tunnel at a time. This is not a limitation:
the tunnel points at the daemon, and **per-endpoint routing is done by the daemon
via the path** (`/w/<name>`). One daemon, N logical endpoints.

## Known risks

| Risk | Mitigation |
|---|---|
| Dashboard closed → webhook lost | Accepted limitation of the no-server model. Documented. Backlog: background daemon. |
| Provider requires a specific synchronous response (e.g. Slack challenge) | Today we always respond `200 {id}`. Real case → a special handler that waits for the local target. Out of MVP scope. |
| Body larger than the ngrok plan limit | Document the limit; most webhooks are small. |
| `ngrok` not installed / no authtoken / wrong domain | The adapter detects it and gives a clear error message, shown in the dashboard. |
