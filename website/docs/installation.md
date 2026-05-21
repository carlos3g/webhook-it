---
title: Installation
description: Build the webhook-it standalone binary with Bun, set up the wi alias, and verify the install.
---

# Installation

webhook-it ships as a **single self-contained binary**. You build it once with
[Bun](https://bun.sh); the compiled binary embeds the Bun runtime, so it then
needs nothing installed to run.

:::info No npm package yet
There is no published npm package at this stage. You build from source — it
takes one command and under a minute.
:::

## Prerequisites

| Tool | Needed for | Notes |
|---|---|---|
| **Bun 1.3+** | Building the binary | Runtime, package manager and bundler — [install](https://bun.sh). |
| **ngrok** | Tunnel mode only | Installed and authenticated. Skip it for local-only testing. |

Local-only testing (sending webhooks with `curl` to `127.0.0.1`) needs **only
Bun**. ngrok is required only when a real provider must reach you over the
internet — see [The two modes](./concepts/modes.md).

## Build the binary

Clone the repository and build:

```bash
git clone https://github.com/carlos3g/webhook-it.git
cd webhook-it

bun install
bun run build
```

`bun run build` compiles the interactive CLI into a standalone executable at
**`apps/cli/dist/wi`**. The compiled file is around 70 MB because it embeds the
Bun runtime.

![Installing dependencies and building the binary](/img/screens/cmd-build.svg)

*`bun run build` produces `apps/cli/dist/wi` — a self-contained executable.*

## Run it

Run the binary directly:

```bash
./apps/cli/dist/wi
```

This opens the [interactive dashboard](./dashboard/anatomy.md).

### Add a `wi` alias

The binary is exposed under two names — `webhook-it` and `wi`. For convenience,
alias `wi` to the built binary (run from the repository root):

```bash
alias wi="$(pwd)/apps/cli/dist/wi"
```

Add that line to your `~/.zshrc` or `~/.bashrc` to make it permanent. The rest
of this documentation assumes `wi` is on your `PATH`.

## Verify the install

A few subcommands run **headless** — they print and exit without opening the
dashboard. They are the quickest way to confirm the binary works:

```bash
wi --version
# 0.1.0

wi --help
# webhook-it 0.1.0 — stable public URLs for webhooks, forwarded to your localhost.
# ...
```

If `wi --version` prints `0.1.0`, you are ready. Continue to the
[Quick Start](./quick-start.md).

## Set up ngrok (optional)

You only need this for **tunnel mode**, where a real provider calls a public
`https://` URL. It is a one-time setup per machine.

1. **Install ngrok** from <https://ngrok.com/download>.
2. **Authenticate** it with the token from your ngrok dashboard:
   ```bash
   ngrok config add-authtoken <your-token>
   ```
3. **Reserve a static domain.** The ngrok free plan includes **one** static
   domain per account — reserve it at
   <https://dashboard.ngrok.com/domains>. It looks like
   `yourname.ngrok-free.app`.

That static domain is the key to a *stable* URL: it does not change between
sessions, so a webhook you register with Stripe keeps working tomorrow.

You hand the domain to webhook-it later, from inside the dashboard (press
<kbd>c</kbd>) — not here. See [Connecting a real provider](./guides/connecting-a-provider.md).

:::tip The authtoken stays in ngrok
webhook-it never sees your ngrok authtoken. It lives in ngrok's own config
file; webhook-it only runs the `ngrok` binary and passes it a port and a domain.
:::

## Development mode

While hacking on webhook-it itself, skip the build and run from source with hot
reload:

```bash
bun run dev
```

See [Contributing](./project/contributing.md) for the full development setup.

## Updating

webhook-it stores no state inside the repository — all of it lives in
`~/.webhook-it/` (see [Files &amp; configuration](./reference/files-and-config.md)).
To update, pull the latest code and rebuild:

```bash
git pull
bun install
bun run build
```

Your endpoints, event history and ngrok domain are untouched.
