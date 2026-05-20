# webhook-it

Stable public URLs for webhooks, forwarded in real time to your localhost —
through an interactive terminal dashboard. Runs 100% on your machine; the only
external piece is the ngrok tunnel.

> 📚 **Full documentation in [`docs/`](docs/README.md).**
> Shortcuts: [current state](docs/STATE.md) · [usage](docs/USAGE.md) ·
> [motivation](docs/MOTIVATION.md) · [architecture](docs/ARCHITECTURE.md) ·
> [development](docs/DEVELOPMENT.md)

## What it is

`wi` opens an interactive dashboard (built with [OpenTUI](https://github.com/anomalyco/opentui)
+ Solid). From it you start/stop the daemon, manage endpoints, watch webhooks
arrive live, and replay events — all from the keyboard.

```
╭ webhook-it ──────────────────────────── running (tunnel) — https://you.ngrok-free.app ╮
╭ Endpoints ─────────╮╭ Events — stripe-dev ───────────────────────────────────────────╮
│ > stripe-dev       ││ 14:02:51  a1b2c3d4e5  POST          200                        │
│   github-app       ││ 14:02:31  f6g7h8i9j0  POST/refunds  200                        │
│ ...                ││ ...                                                           │
╰────────────────────╯╰───────────────────────────────────────────────────────────────╯
╭ up/down select - u start/stop - n new - c domain - d delete - r replay - q quit ──────╮
```

## How it works

1. Press `u` in the dashboard to start the local daemon + an ngrok tunnel.
2. A webhook arrives at the stable public URL → the daemon saves the event and
   forwards it to your `localhost`, with headers and body intact.
3. History and replay live in a local SQLite database — nothing leaves your machine.

## Structure

```
apps/
  cli/       interactive dashboard (OpenTUI + Solid) — `webhook-it` / `wi`
packages/
  core/      daemon, bun:sqlite storage, forwarder, ngrok adapter
  shared/    shared types and zod schemas
  tsconfig/  base TypeScript configs
docs/
  README.md (index), STATE.md, USAGE.md, MOTIVATION.md,
  PROJECT.md, ARCHITECTURE.md, DEVELOPMENT.md
```

## Prerequisites

- **Bun 1.3+** — the runtime, package manager and bundler ([install](https://bun.sh)).
- **ngrok** — only for tunnel mode: installed and authenticated
  (`ngrok config add-authtoken <token>`), plus a free static domain reserved at
  <https://dashboard.ngrok.com/domains>. Local-only testing needs none of this.

## Development

```bash
bun install
bun run typecheck
bun run dev          # runs the dashboard from source (hot reload)
bun run build        # compiles a standalone binary at apps/cli/dist/wi
```

## Usage

After `bun run build`, run the binary (it is self-contained — no Bun needed to run it):

```bash
./apps/cli/dist/wi
```

Inside the dashboard: `u` start/stop the daemon · `n` new endpoint · `c` set the
ngrok domain · `t` toggle tunnel/local mode · `r` replay · `d` delete · `q` quit.
See [`docs/USAGE.md`](docs/USAGE.md) for the full reference.

## Status

MVP in development. What already works is in [`docs/STATE.md`](docs/STATE.md);
the backlog is in [`docs/PROJECT.md`](docs/PROJECT.md).
