---
title: Endpoints
description: An endpoint is a named route with a local target. Learn the naming rules, the /w/<name> URL, path suffixes and namespacing.
---

# Endpoints

An **endpoint** is the central object in webhook-it. It is a named route that
maps a public URL to a local target:

```
acme-api-stripe  →  http://localhost:3000/hooks/stripe
   ▲                          ▲
   the name                   the target URL
```

Every endpoint gives you one public URL. Every webhook that arrives at that URL
is persisted and forwarded to the endpoint's target.

## The two fields

An endpoint has exactly two fields you set, plus a creation timestamp:

| Field | Meaning | Example |
|---|---|---|
| **name** | A path-safe slug. Goes into the public URL and is the primary key. | `stripe-dev` |
| **target URL** | The local URL that receives the forwarded webhook. | `http://localhost:3000/webhook` |

You create an endpoint from the dashboard by pressing <kbd>n</kbd> — see
[Managing endpoints](../dashboard/managing-endpoints.md) — or in bulk from a
[project config file](./project-config.md).

## Naming rules

The name goes straight into a public URL and is the SQLite primary key, so it
must be a clean slug:

- **1 to 64 characters.**
- **Letters, numbers, `-` and `_` only.**
- **Must start with a letter or a number.**
- Case-insensitive in the pattern, but treated literally — pick one casing and
  stick with it.

Valid: `stripe`, `stripe-dev`, `github_app`, `billing-prod`, `v2webhook`.

Invalid: `stripe dev` (space), `-stripe` (leading dash), `stripe!` (symbol),
`""` (empty).

If you type an invalid name into the new-endpoint form, webhook-it rejects it
inline with the exact reason and keeps the form open.

## The public URL

Every endpoint is reachable at the path **`/w/<name>`** under whatever base URL
the daemon is serving:

| Mode | Base URL | Endpoint URL |
|---|---|---|
| **Local** | `http://127.0.0.1:4505` | `http://127.0.0.1:4505/w/stripe-dev` |
| **Tunnel** | `https://yourname.ngrok-free.app` | `https://yourname.ngrok-free.app/w/stripe-dev` |

The selected endpoint's full public URL is shown in the dashboard's Endpoints
pane, under **public url** — ready to copy into a provider's settings. See
[The two modes](./modes.md) for the difference between local and tunnel.

## Path suffixes

A provider does not have to call exactly `/w/<name>`. Anything **after** the
endpoint name is captured as a **path suffix** and carried through to your local
target.

```
incoming:  POST /w/stripe-dev/refunds
                 └─ endpoint ─┘└ suffix ┘

forwarded: POST http://localhost:3000/hooks/stripe/refunds
                                                  └ suffix ┘
```

This lets a single endpoint serve a provider that posts to several sub-paths.
In the Events pane the method and suffix are shown together, e.g.
`POST/refunds`.

Query strings are preserved too: `?attempt=2` on the incoming request is
re-attached to the forwarded request.

## One endpoint per provider

The intended model is **one endpoint per provider, per environment**:

```
stripe-dev      →  http://localhost:3000/hooks/stripe
stripe-staging  →  http://localhost:3000/hooks/stripe
github-app      →  http://localhost:3000/hooks/github
```

Each has its own URL and its own slice of event history, so the Events pane
stays organized even when several providers fire at once. All of them are
served by a single daemon and a single tunnel — see
[How it works](./how-it-works.md#one-tunnel-many-endpoints).

## Namespacing with projects

When endpoints come from a [project config file](./project-config.md), they are
**namespaced** by the file's `project` field. An endpoint declared as `stripe`
in project `acme-api` is stored — and exposed in its URL — as
`acme-api-stripe`:

```json
{
  "project": "acme-api",
  "endpoints": {
    "stripe": { "target": "http://localhost:3000/hooks/stripe" }
  }
}
```

→ stored as `acme-api-stripe`, reachable at `/w/acme-api-stripe`.

This guarantees two repositories never collide on a name. Endpoints you create
by hand with <kbd>n</kbd> are **not** namespaced — the name you type is the name
that is stored.

## Deleting an endpoint

Select an endpoint and press <kbd>d</kbd>, then confirm with <kbd>y</kbd>.

:::note Event history survives deletion
Deleting an endpoint removes the **endpoint**, not its **events**. The event
rows stay in the database. If you later recreate an endpoint with the same name,
its old events reappear in the Events pane.
:::

## Next

- [Events &amp; replay](./events-and-replay.md) — what an endpoint receives.
- [The two modes](./modes.md) — local vs. tunnel URLs.
- [Project config](./project-config.md) — declaring endpoints in a file.
