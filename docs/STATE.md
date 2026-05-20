# Current state

A snapshot of what exists and works today. Last updated: 2026-05-20.

**Version:** 0.1.0 (MVP in development) · interactive terminal CLI, no web UI.

## Summary

webhook-it does the full cycle: it receives a webhook at a URL, persists it,
responds to the provider and forwards it to localhost — with history and replay.
It runs 100% locally as an interactive dashboard (OpenTUI + Solid on Bun). What
is left is polishing, automating tests and (in the backlog) a web UI.

## Implemented and working

| Area | Item | Status |
|---|---|---|
| Toolchain | Bun workspaces (runtime, package manager, bundler) | ✅ |
| Build | `bun run build` → standalone binary (`apps/cli/dist/wi`) | ✅ |
| Config | `~/.webhook-it/config.json` (ngrok domain, port) | ✅ |
| Storage | local SQLite (`bun:sqlite`), `endpoint` and `event` tables | ✅ |
| Dashboard | OpenTUI + Solid interactive UI | ✅ |
| Dashboard | endpoint list + selection, with target / public URL detail | ✅ |
| Dashboard | live event feed per endpoint | ✅ |
| Dashboard | create endpoint (`n`), set ngrok domain (`c`), delete (`d`) | ✅ |
| Dashboard | first-run setup: auto-prompts for the ngrok domain if unset | ✅ |
| Dashboard | start/stop the daemon (`u`), toggle tunnel/local mode (`t`) | ✅ |
| Dashboard | replay the latest event of an endpoint (`r`) | ✅ |
| Daemon | HTTP ingest server on `127.0.0.1`, running in-process | ✅ |
| Daemon | immediate `200` response; `404` for an unknown endpoint | ✅ |
| Daemon | async forward preserving method, headers, body and query | ✅ |
| Daemon | routing N endpoints by path (`/w/<name>`) on a single tunnel | ✅ |
| Tunnel | ngrok adapter (runs the binary, reads its JSON log) | ✅ \* |

\* The tunnel path depends on the user having `ngrok` installed, authenticated and
with a reserved static domain. The logic is implemented; see below for what has
actually been verified.

## What has been verified, and how

- **`bun run typecheck`** — passes for all 3 packages.
- **`bun run build`** — produces a ~70 MB self-contained executable.
- **Dashboard render** — run under a correctly-sized PTY: header, endpoint list
  with selection detail, events pane and footer all lay out correctly.
- **Keyboard** — navigation (`j`/`k`) moves the selection and updates the detail
  and events title; `q` exits cleanly.
- **Daemon end-to-end** — pressing `u` started the in-process daemon (local
  mode); two `curl` webhooks to `127.0.0.1:4505` returned `200`, appeared live in
  the Events pane, and the forward was attempted (it correctly reported a
  delivery failure because no local target was running in the test).

### What has NOT been exercised end-to-end yet

- **Tunnel mode with a real ngrok tunnel** — requires an ngrok account/authtoken/
  domain. The adapter is implemented and handles errors (missing binary, tunnel
  fails to come up), but the happy path has not been run against real ngrok.

## Not implemented (in the backlog)

Details and ordering in [`PROJECT.md`](PROJECT.md), section *Features — Post-MVP*.

- **Web interface** — does not exist. The interactive UI is terminal-only. The
  monorepo is structured so a web UI could reuse `core` + `shared`.
- Payload inspection — view a formatted body and headers for a selected event.
- Per-event selection in the Events pane (today `r` replays the latest event).
- Automatic retry with backoff when the target responds 5xx.
- Forward filters; diff between events.
- Other tunnels (Cloudflare, Tailscale) — the tunnel interface is already isolated.
- Background daemon (so webhooks arrive without the dashboard open).
- Automated test suite.

## Known limitations

- **A webhook only arrives with the machine on, the dashboard open and the daemon
  started.** Accepted consequence of having no server. See [`MOTIVATION.md`](MOTIVATION.md).
- **No authentication.** Everything is local and single-user; the public URL is
  public.
- The daemon always responds `200` to the provider; it does not relay the local
  app's response.
