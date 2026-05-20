# Project: webhook-it

## One-sentence vision

An interactive terminal tool that runs 100% on your machine, exposes stable
public URLs for webhooks (via an ngrok tunnel) and delivers every event, with
headers and body intact, to your localhost — with local history and replay.

## Personas and scenarios

**Single persona:** a backend/full-stack developer who integrates third-party
webhooks (Stripe, GitHub, Mercado Pago, Resend, etc) day to day.

**Scenario 1 — New integration.**
I am building the Stripe integration. I run `wi`, press `n` and create the
`stripe-dev` endpoint pointing at `http://localhost:3000/api/webhooks/stripe`. I
press `u` to start the daemon; the header shows my public URL. I paste
`https://myname.ngrok-free.app/w/stripe-dev` into the Stripe dashboard, trigger
`checkout.session.completed`, and watch the event land in the Events pane and get
delivered to my local endpoint with `Stripe-Signature` intact.

**Scenario 2 — Debugging a failed event.**
The local handler broke while processing a webhook. The event is saved. I select
the endpoint, see the event in the pane, fix the code and press `r` — the same
payload (identical bytes) is redelivered to localhost.

**Scenario 3 — Several providers at once.**
I have `stripe-dev`, `github-app` and an internal webhook. One running daemon
serves a single tunnel; I move between endpoints with the arrow keys and the
Events pane shows each one's traffic, routed by path (`/w/<name>`).

**Scenario 4 — A teammate joins the project.**
The repository has a committed `.webhook-it.json` listing its webhook endpoints.
A new developer clones it, sets their own ngrok domain once, and runs `wi apply` —
every endpoint is created locally, namespaced under the project. No endpoint set
up by hand; nothing shared but the file in git.

## How it works (summary)

- `wi` opens an interactive dashboard (OpenTUI + Solid). Pressing `u` starts a
  **local daemon in the same process**: an HTTP server on `127.0.0.1` + the ngrok
  tunnel pointing at it.
- A webhook arrives at the public URL → ngrok forwards it to the daemon → the
  daemon **saves it to the local SQLite database** and **forwards** it to the
  endpoint's target.
- A single tunnel serves all endpoints; routing is by path (`/w/<name>`).
- The dashboard reads the same SQLite file the daemon writes, so the endpoint and
  event panes always reflect current state.
- A repo can commit a `.webhook-it.json`; `wi apply` reconciles its endpoints
  into webhook-it, so a teammate provisions them in one command.

Technical details in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Features — MVP (v0.1)

| # | Feature | In the dashboard |
|---|---|---|
| 1 | Set the ngrok domain | press `c` |
| 2 | Create a named endpoint with a local target | press `n` |
| 3 | List endpoints / show the selected one's detail | arrow keys |
| 4 | Delete an endpoint | press `d` |
| 5 | Start / stop the daemon (+ ngrok tunnel) | press `u` |
| 6 | Toggle tunnel / local-only mode | press `t` |
| 7 | Receive a webhook, persist it and respond 200 instantly | automatic |
| 8 | Forward the event to localhost, headers and body intact | automatic |
| 9 | Live event feed per endpoint | Events pane |
| 10 | Replay the most recent event of an endpoint | press `r` |
| 11 | Provision a repo's endpoints from a committed `.webhook-it.json` | `wi apply` |

## Features — Post-MVP (ordered backlog)

1. **Local web UI**: a browser dashboard reusing `core`, with payload viewing
   (pretty-print), filters and search.
2. **Payload inspection** in the dashboard: a formatted body and headers for a
   selected event.
3. **Per-event selection** in the Events pane (today `r` replays the latest).
4. **Diff between events** (to debug provider schema changes).
5. **Automatic retry with backoff** when localhost responds 5xx.
6. **Forward filters**: only deliver locally events that match a criterion.
7. **Other tunnels** besides ngrok (Cloudflare Tunnel, Tailscale Funnel) — the
   tunnel interface is already isolated for this.
8. **Background daemon** so webhooks arrive without the dashboard open.

## Constraints and principles

- **TypeScript everywhere.** Build scripts included. No JS fallback.
- **Bun for the whole toolchain.** Runtime, package manager and bundler. Required
  by OpenTUI; also gives `bun:sqlite` and standalone-binary compilation.
- **Monorepo with Bun workspaces.** Justified because the CLI, the core (daemon)
  and a future web UI share types and schemas.
- **Minimum external services.** In production: no service other than the tunnel.
  Persistence is **SQLite built into Bun** (`bun:sqlite`) — a file on disk, zero
  extra processes. No cloud database, no Redis, no queue. (Runtime libraries:
  OpenTUI + Solid for the UI, zod for validation.)
- **Tunnel = a binary the user already has.** The daemon runs the installed
  `ngrok`; webhook-it bundles no native tunnel SDK.
- **No auth in the tool.** Everything runs locally, single-user. The public URL
  is public by nature; the worst case is a junk event in the local SQLite.
- **Shipped as a standalone binary.** `bun build --compile` embeds the runtime,
  so end users need nothing installed to run it.

## Monorepo structure

```
webhook-it/
├── apps/
│   └── cli/                   # interactive dashboard (OpenTUI + Solid)
│       ├── src/               # index.ts, app.tsx, theme.ts
│       └── build.ts           # Bun.build → standalone binary
├── packages/
│   ├── core/                  # the daemon and everything it needs
│   │   └── src/
│   │       ├── daemon.ts      # HTTP ingest + forward server
│   │       ├── storage.ts     # local SQLite (bun:sqlite)
│   │       ├── forwarder.ts   # POST to the local target
│   │       ├── config.ts      # ~/.webhook-it/config.json
│   │       ├── paths.ts       # paths under ~/.webhook-it/
│   │       ├── project.ts     # .webhook-it.json + `wi apply` reconcile
│   │       └── tunnel/ngrok.ts# ngrok tunnel adapter
│   ├── shared/                # types + zod schemas (Endpoint, WebhookEvent)
│   └── tsconfig/              # reusable base tsconfigs
├── docs/
└── package.json               # Bun workspaces declared here
```

## Prerequisites

- **To build:** Bun 1.3+ (<https://bun.sh>).
- **To run the compiled binary:** nothing — it is self-contained.
- **For tunnel mode:** `ngrok` installed and authenticated
  (`ngrok config add-authtoken <token>`), plus a reserved static domain (free,
  1 per account) at <https://dashboard.ngrok.com/domains>. Local mode needs none.

## Success metrics (personal)

- I uninstall webhook.site from my bookmarks.
- I never copy a webhook payload into Postman again.
- When I switch machines, I rebuild the binary and reuse ngrok — the URLs stay.

## Decisions already made

- **Runtime:** Bun. OpenTUI requires it; it also collapses the toolchain.
- **Terminal UI:** OpenTUI + the Solid binding — interactive dashboard.
- **Tunnel:** ngrok, with a free static domain. The only external dependency.
  The tunnel layer is an isolated adapter, so Cloudflare/Tailscale can come later.
- **No server, no auth:** everything runs locally, single-user. Accepted
  consequence: webhooks only arrive with the machine on and the dashboard open.
- **Persistence:** SQLite via `bun:sqlite`. A single file at `~/.webhook-it/db.sqlite`.
- **Binary name:** `webhook-it`, with the alias `wi`.
