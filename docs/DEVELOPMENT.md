# Development

How the code is organized, how to build and test it, and why each tooling choice
was made.

## Stack

| Layer | Choice | Version |
|---|---|---|
| Runtime / package manager / bundler | Bun | `>=1.3.0` |
| Language | TypeScript | `~5.7` |
| Terminal UI | OpenTUI + Solid | `@opentui/* 0.2`, `solid-js 1.9` |
| Validation | zod | `^3.24` |
| Persistence | `bun:sqlite` | built into Bun |
| Tunnel | `ngrok` binary | installed by the user |

Bun is the whole toolchain: it runs TypeScript directly, installs dependencies,
and compiles the standalone binary. No external service other than the tunnel.

## Monorepo structure

```
webhook-it/
├── apps/
│   └── cli/                 @carlos3g/webhook-it — the interactive dashboard
│       ├── src/
│       │   ├── index.ts          entry: args + `wi apply`, lazy-loads the UI
│       │   ├── app.tsx           the dashboard (state, daemon, keyboard, layout)
│       │   └── theme.ts          color palette
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
│   │       ├── index.ts
│   │       ├── endpoint.ts       Endpoint, endpointNameSchema
│   │       └── event.ts          WebhookEvent, httpMethodSchema
│   └── tsconfig/            @webhook-it/tsconfig — base tsconfigs
│       ├── base.json
│       └── bun.json
├── docs/
└── package.json             Bun workspaces declared here
```

### Layers and dependencies

```
cli  ──▶  core  ──▶  shared
 └──────────────────▶ shared
```

- **`shared`** — types and zod schemas only. No runtime APIs. Importable anywhere.
- **`core`** — all the behavior (daemon, storage, forward, tunnel). Depends on
  `shared`. Knows nothing about the UI.
- **`cli`** — the OpenTUI + Solid dashboard. Presentation only; it calls `core`.

The daemon runs **inside the dashboard process**: pressing `u` calls
`core`'s `startDaemon`, and its `onEvent` / `onLog` hooks feed the UI.

## Development commands

```bash
bun install

bun run typecheck        # tsc --noEmit across all packages
bun run dev              # runs the dashboard from source with hot reload
bun run build            # compiles apps/cli/dist/wi (standalone binary)
```

Each is wired through Bun workspace filters (`bun run --filter ...`) in the root
`package.json`.

## Tooling decisions

### Why Bun

OpenTUI only runs on Bun — it loads its native Zig core through `bun:ffi`, and its
`@opentui/core` package declares `engines: { bun: ">=1.3.0" }` (Node support is
[tracked but unfinished](https://github.com/anomalyco/opentui/issues/2)). Bun also
removes moving parts the project used to need: it runs TypeScript directly (no
`tsx`), bundles and compiles a standalone binary (no `tsup`), is the package
manager (no Yarn), and ships `bun:sqlite` (no `node:sqlite` experimental flag).

### Why OpenTUI + Solid

The CLI is interactive, so it needs a real terminal UI layer. OpenTUI provides a
flexbox layout engine and renderables; the Solid binding (`@opentui/solid`) drives
them with fine-grained reactivity — the daemon's `onEvent` hook sets a signal and
the relevant pane re-renders, nothing else.

### `bun:sqlite`

Built into Bun, stable (not experimental), and a single file on disk. The `Storage`
class wraps it synchronously — it is a single-user local database, so there is no
concurrency to manage.

### The build

`apps/cli/build.ts` calls `Bun.build` with `@opentui/solid/bun-plugin` (which
compiles the Solid JSX) and `compile` (which embeds the Bun runtime). The result
is a self-contained executable — the same approach OpenCode uses to ship OpenTUI
apps. `apps/cli/bunfig.toml` preloads the same Solid runtime for `bun run dev`.

## Code conventions

- **Strict TypeScript.** `strict`, `noUncheckedIndexedAccess`,
  `verbatimModuleSyntax` (see `packages/tsconfig/base.json`).
- **ESM.** Relative imports carry the `.js` extension (even when they point at
  `.ts`/`.tsx`); type-only imports use `import type`.
- **Language.** Everything is in **English** — documentation, code comments, UI
  text, errors and identifiers.
- **Synchronous storage.** The `Storage` class is synchronous on purpose — a
  single-user local database, with no real concurrency to handle.

## How to test

There is no automated test suite yet. Current validation is manual:

1. **Typecheck + build:** `bun run typecheck && bun run build`.
2. **Run the dashboard:** `bun run dev`, or run the compiled `apps/cli/dist/wi`.
   Use an isolated `HOME` to avoid touching real state:
   `HOME=/tmp/wi-test ./apps/cli/dist/wi`.
3. **End-to-end:** start the daemon with `u` (local mode), then send webhooks
   with `curl` to `http://127.0.0.1:4505/w/<name>` and watch them appear in the
   Events pane. See [`STATE.md`](STATE.md) for what has been verified this way.
4. **`wi apply`:** drop a `.webhook-it.json` in a scratch directory and run
   `HOME=/tmp/wi-test ./apps/cli/dist/wi apply` from it — re-run it to confirm it
   is idempotent.

An automated suite (`bun test` covering `storage` and `forwarder`) is a natural
next step.
