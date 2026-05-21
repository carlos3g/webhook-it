---
title: Roadmap & status
description: What works in webhook-it today, what has been verified, the known limitations, and the post-MVP backlog.
---

# Roadmap &amp; status

webhook-it is **v0.1.0 — an MVP in active development**. This page is an honest
snapshot: what works, what has been verified and how, what is missing, and what
is planned.

## What works today

The full cycle — receive a webhook, persist it, respond to the provider, forward
it to localhost, with history and replay — works end to end.

| Area | Item | Status |
|---|---|---|
| Toolchain | Bun workspaces (runtime, package manager, bundler) | ✅ |
| Build | `bun run build` → standalone binary (`apps/cli/dist/wi`) | ✅ |
| Config | `~/.webhook-it/config.json` (ngrok domain, port) | ✅ |
| Project | Committed `.webhook-it.json` — per-repo, namespaced endpoints | ✅ |
| CLI | `wi apply` — provision endpoints from `.webhook-it.json` | ✅ |
| Storage | Local SQLite (`bun:sqlite`), `endpoint` and `event` tables | ✅ |
| Dashboard | OpenTUI + Solid interactive UI | ✅ |
| Dashboard | Endpoint list + selection, with target / public-URL detail | ✅ |
| Dashboard | Live event feed per endpoint | ✅ |
| Dashboard | Create (`n`), set ngrok domain (`c`), delete (`d`) | ✅ |
| Dashboard | First-run setup — auto-prompts for the ngrok domain | ✅ |
| Dashboard | Auto-detects `.webhook-it.json` and offers to apply it | ✅ |
| Dashboard | Start/stop the daemon (`u`), toggle mode (`t`) | ✅ |
| Dashboard | Replay the latest event of an endpoint (`r`) | ✅ |
| Daemon | HTTP ingest on `127.0.0.1`, running in-process | ✅ |
| Daemon | Immediate `200`; `404` for an unknown endpoint | ✅ |
| Daemon | Async forward preserving method, headers, body, query | ✅ |
| Daemon | Routing N endpoints by path (`/w/<name>`) on one tunnel | ✅ |
| Tunnel | ngrok adapter (runs the binary, reads its JSON log) | ✅ ＊ |

## What has been verified, and how

- **`bun run typecheck`** — passes for all three packages.
- **`bun run build`** — produces a self-contained executable (~70 MB).
- **Dashboard render** — header, endpoint list with detail, events pane and
  footer all lay out correctly under a correctly-sized terminal.
- **Keyboard** — navigation moves the selection and updates the detail and
  events title; `q` exits cleanly.
- **Daemon end to end** — pressing `u` started the in-process daemon in local
  mode; `curl` webhooks to `127.0.0.1:4505` returned `200`, appeared live in the
  Events pane, and the forward was attempted.
- **`wi apply`** — verified against an isolated `HOME`: fresh apply, idempotent
  re-run, target update, orphan reporting, parent-directory walk-up, and the
  error cases (no file, invalid JSON, bad schema → exit `1`). The dashboard's
  auto-detect → confirm → apply flow was verified too.

### Not yet exercised end to end

＊ **Tunnel mode against a real ngrok tunnel.** The ngrok adapter is implemented
and handles its error cases (missing binary, tunnel fails to come up), but the
happy path has not been run against a live ngrok account. Local mode is fully
exercised.

## Known limitations

These are deliberate trade-offs of the MVP, not bugs:

- **A webhook only arrives with the machine on, the dashboard open and the
  daemon started.** This is the accepted consequence of having no server. See
  the [FAQ](./faq.md#operational-limits).
- **No authentication.** Everything is local and single-user; a public URL is
  public. The worst case is a junk event in your local SQLite.
- **The daemon always responds `200`** to the provider as soon as it persists
  the event — it does not relay your local app's response.
- **Replay targets the latest event** of an endpoint. There is no per-event
  picker yet.

## Post-MVP backlog

Roughly in priority order:

1. **Local web UI** — a browser dashboard reusing `core`, with pretty-printed
   payload viewing, filters and search.
2. **Payload inspection in the dashboard** — a formatted body and headers view
   for a selected event.
3. **Per-event selection** in the Events pane — replay any event, not just the
   latest.
4. **Diff between events** — to spot when a provider changes its schema.
5. **Automatic retry with backoff** when the local target responds `5xx`.
6. **Forward filters** — only deliver events that match a criterion.
7. **Other tunnels** besides ngrok — Cloudflare Tunnel, Tailscale Funnel. The
   tunnel layer is already an isolated adapter for exactly this.
8. **Background daemon** — so webhooks arrive without the dashboard open.
9. **An automated test suite** — `bun test` over `storage` and `forwarder`.

## Explicit non-goals

webhook-it is intentionally **not**:

- An **ngrok replacement** — it uses a tunnel underneath, but adds persistence,
  replay, history and event semantics on top. To just expose a port, use ngrok.
- A **commercial multi-tenant SaaS** — it is local, single-user, no login.
- An **automated webhook testing platform** — it does not generate fake payloads
  or simulate providers. It receives real events and delivers them locally.

## Next

- [FAQ](./faq.md) — common questions, including the no-server trade-off.
- [Contributing](./contributing.md) — help move items off this backlog.
