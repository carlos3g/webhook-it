---
title: Contributing
description: The webhook-it development setup — the stack, the monorepo, build commands, code conventions and how to test.
---

# Contributing

This page is for working **on** webhook-it itself. To just use it, start at
[Installation](../installation.md).

## The stack

| Layer | Choice | Version |
|---|---|---|
| Runtime / package manager / bundler | Bun | `>=1.3.0` |
| Language | TypeScript | `~5.7` |
| Terminal UI | OpenTUI + Solid | `@opentui/* 0.2`, `solid-js 1.9` |
| Validation | zod | `^3.24` |
| Persistence | `bun:sqlite` | built into Bun |
| Tunnel | `ngrok` binary | installed by the user |

Bun is the whole toolchain — it runs TypeScript directly, installs dependencies,
and compiles the standalone binary. No external service other than the tunnel.

## Monorepo structure

```
webhook-it/
├── apps/
│   └── cli/                 @carlos3g/webhook-it — the interactive dashboard
│       ├── src/
│       │   ├── index.ts          entry: args + `wi apply`, lazy-loads the UI
│       │   ├── app.tsx           the dashboard (state, daemon, keyboard, layout)
│       │   └── theme.ts          colour palette
│       ├── build.ts              Bun.build → standalone binary
│       ├── bunfig.toml           preloads the OpenTUI Solid JSX runtime
│       └── tsconfig.json
├── packages/
│   ├── core/                @webhook-it/core — the daemon and the core
│   │   └── src/
│   │       ├── index.ts          the package's public API
│   │       ├── daemon.ts         HTTP ingest + forward server
│   │       ├── storage.ts        bun:sqlite persistence
│   │       ├── forwarder.ts      POST to the local target
│   │       ├── config.ts         ~/.webhook-it/config.json
│   │       ├── paths.ts          paths under ~/.webhook-it/
│   │       ├── project.ts        .webhook-it.json + `wi apply` reconcile
│   │       ├── ids.ts            short id generator
│   │       └── tunnel/ngrok.ts   ngrok tunnel adapter
│   ├── shared/              @webhook-it/shared — types + zod schemas
│   │   └── src/
│   │       ├── endpoint.ts       Endpoint, endpointNameSchema
│   │       └── event.ts          WebhookEvent, httpMethodSchema
│   └── tsconfig/            @webhook-it/tsconfig — base tsconfigs
├── docs/                    project documentation (Markdown)
├── website/                 this documentation site (Docusaurus)
└── package.json             Bun workspaces declared here
```

The layering is strict — see [Architecture](../reference/architecture.md#the-monorepo):
`cli → core → shared`. `shared` has no runtime APIs; `core` has no UI
dependency; `cli` is presentation only.

## Development commands

```bash
bun install

bun run typecheck        # tsc --noEmit across all packages
bun run dev              # run the dashboard from source, with hot reload
bun run build            # compile apps/cli/dist/wi (standalone binary)
bun run lint             # eslint
bun run lint:fix         # eslint --fix
```

Each is wired through Bun workspace filters in the root `package.json`.

For iterating on the dashboard, `bun run dev` is the fastest loop — it runs
straight from source with hot reload, no build step.

## Code conventions

- **Strict TypeScript** — `strict`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax` (see `packages/tsconfig/base.json`).
- **ESM** — relative imports carry the `.js` extension (even when they point at
  `.ts` / `.tsx`); type-only imports use `import type`.
- **English everywhere** — documentation, comments, UI text, errors and
  identifiers.
- **Synchronous storage** — the `Storage` class is synchronous on purpose; a
  single-user local database has no real concurrency to manage.

## How to test

There is no automated suite yet — an early backlog item (see the
[Roadmap](./roadmap.md)). Current validation is manual:

1. **Typecheck + build:** `bun run typecheck && bun run build`.
2. **Run the dashboard:** `bun run dev`, or the compiled `apps/cli/dist/wi`. Use
   an isolated `HOME` so you do not touch real state:
   ```bash
   HOME=/tmp/wi-test ./apps/cli/dist/wi
   ```
3. **End to end:** start the daemon with <kbd>u</kbd> (local mode), then send
   webhooks with `curl` to `http://127.0.0.1:4505/w/<name>` and watch them in
   the Events pane.
4. **`wi apply`:** drop a `.webhook-it.json` in a scratch directory and run
   `HOME=/tmp/wi-test ./apps/cli/dist/wi apply` from it — re-run it to confirm
   it is idempotent.

An automated suite (`bun test` covering `storage` and `forwarder`) is the
natural next step.

## The build

`apps/cli/build.ts` calls `Bun.build` with `@opentui/solid/bun-plugin` (which
compiles the Solid JSX) and `compile` (which embeds the Bun runtime). The result
is a self-contained executable — `apps/cli/dist/wi`. `apps/cli/bunfig.toml`
preloads the same Solid runtime for `bun run dev`.

## Working on this documentation site

The site you are reading lives in `website/` and is built with
[Docusaurus](https://docusaurus.io):

```bash
cd website
npm install
npm start            # dev server with hot reload
npm run build        # production build into website/build
```

The terminal screenshots are **generated**, not captured — `website/scripts/gen-assets.mjs`
renders them as SVG. Re-run it after changing the script:

```bash
node website/scripts/gen-assets.mjs
```

## Next

- [Architecture](../reference/architecture.md) — the deep technical view.
- [Roadmap](./roadmap.md) — what needs doing.
