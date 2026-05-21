---
title: Files & configuration
description: Where webhook-it stores its state — the ~/.webhook-it directory, config.json, the SQLite database and its schema.
---

# Files &amp; configuration

webhook-it keeps **all** of its state in one directory in your home folder.
Nothing leaves your machine; there is no account, no login and no cloud.

## The `~/.webhook-it/` directory

| File | Contents |
|---|---|
| `~/.webhook-it/config.json` | Your ngrok domain and the ingest port. |
| `~/.webhook-it/db.sqlite` | Endpoints and the full event history. |
| `~/.webhook-it/db.sqlite-wal`, `-shm` | SQLite write-ahead-log files (managed automatically). |

Deleting these files resets webhook-it to a clean state. Backing them up — or
copying them to another machine — moves your endpoints and history with them.

:::tip Isolate state for testing
Because everything is keyed off the home directory, you can run a completely
isolated instance by overriding `HOME`:

```bash
HOME=/tmp/wi-scratch wi
```

This is exactly how webhook-it's own manual tests avoid touching real state.
:::

## `config.json`

A small JSON file with your **per-machine** settings. It is created the first
time you save a setting (e.g. set an ngrok domain).

```json title="~/.webhook-it/config.json"
{
  "ngrokDomain": "yourname.ngrok-free.app",
  "ingestPort": 4505
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `ngrokDomain` | string | *(unset)* | Your reserved ngrok static domain. When set, the dashboard starts in tunnel mode. When absent, local mode. |
| `ingestPort` | integer | `4505` | The local port on `127.0.0.1` that the daemon listens on (and that ngrok forwards to). |

You normally never edit this file by hand — set the domain from the dashboard
with <kbd>c</kbd>. If the file does not exist, webhook-it uses the defaults; a
missing file on first run is not an error.

:::note This file is per-machine — do not commit it
`config.json` holds your personal ngrok domain. It is **not** part of any
repository. The committable, shareable configuration is
[`.webhook-it.json`](./project-config-schema.md), which holds no secrets.
:::

## `db.sqlite` — the database

A single [SQLite](https://www.sqlite.org) file, opened in WAL mode via
`bun:sqlite` (SQLite built into Bun — no external database, no extra process).
It holds two tables.

### `endpoint`

One row per endpoint.

```sql
create table endpoint (
  name        text primary key,   -- slug used in the URL: /w/<name>
  target_url  text not null,      -- local forward target
  created_at  text not null       -- ISO-8601
);
```

### `event`

One row per received webhook.

```sql
create table event (
  id               text primary key,  -- short id, used to replay
  endpoint_name    text not null,
  method           text not null,
  path_suffix      text,               -- e.g. POST to /w/abc/foo -> "/foo"
  query            text not null,      -- json
  headers          text not null,      -- json
  body             blob not null,      -- raw bytes (essential for signatures)
  received_at      text not null,
  delivered_at     text,               -- null = not delivered yet
  delivery_status  integer,            -- HTTP status from the local target
  delivery_error   text
);

create index idx_event_endpoint
  on event (endpoint_name, received_at desc);
```

A few things worth noting:

- **`body` is a `blob`.** The raw request bytes are stored verbatim — never
  re-serialized — so replayed signatures still validate. See
  [Events &amp; replay](../concepts/events-and-replay.md#what-is-stored).
- **`query` and `headers` are JSON strings.** They are serialized into single
  text columns.
- **`delivery_*` columns start `null`.** They are filled in once the forward
  finishes — or stay `null` if it never connected.
- **Events outlive endpoints.** Deleting an endpoint does not delete its event
  rows.

### Inspecting the database

Because it is plain SQLite, you can open it with any SQLite tool:

```bash
sqlite3 ~/.webhook-it/db.sqlite '.tables'
# endpoint  event

sqlite3 ~/.webhook-it/db.sqlite \
  'select id, endpoint_name, method, delivery_status from event order by received_at desc limit 10;'
```

This is read-only curiosity territory — webhook-it expects to be the only writer.

## The ingest port

The daemon listens on `127.0.0.1:<ingestPort>` — `4505` by default. In tunnel
mode, ngrok forwards the public traffic to this port. In local mode, this is the
address you `curl`.

The port lives in `config.json` as `ingestPort`. It is not exposed in the
dashboard UI; the default suits virtually every setup.

## Resetting

| To reset… | Do this |
|---|---|
| The ngrok domain / mode | Press <kbd>c</kbd> and submit an empty domain. |
| All endpoints and history | Delete `~/.webhook-it/db.sqlite` (and its `-wal` / `-shm`). |
| Absolutely everything | Delete the whole `~/.webhook-it/` directory. |

webhook-it recreates whatever it needs on the next run.

## Next

- [Project config schema](./project-config-schema.md) — the committable file.
- [Architecture](./architecture.md) — how these files are used internally.
- [The two modes](../concepts/modes.md) — what `ngrokDomain` switches.
