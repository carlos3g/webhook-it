---
title: FAQ
description: Frequently asked questions about webhook-it — the no-server trade-off, security, ngrok, replay, data and more.
---

# FAQ

## What problem does webhook-it solve?

Testing webhooks locally normally means: grab a temporary URL, register it with
the provider, trigger the event, **copy the payload by hand**, **paste it into
Postman**, and **manually POST it to localhost**. Every test, every time.

That loop is slow and lossy — temporary URLs expire, and copy-pasting a body
drops the signature headers, so your handler rejects a request that was actually
fine.

webhook-it removes the loop. You get a **stable** public URL, events are
**forwarded automatically** with headers and body intact, and every event is
**saved** so you can **replay** it on demand.

## Why does the dashboard have to stay open? {#operational-limits}

webhook-it has **no server**. The daemon that receives webhooks runs *inside*
the dashboard process. So a webhook only arrives when:

1. your machine is on,
2. `wi` is open,
3. the daemon is started, and
4. (in tunnel mode) the ngrok tunnel is up.

Close your laptop and webhooks are missed. An always-on server would not have
this limitation — but it would also mean something to deploy, maintain and pay
for. webhook-it deliberately trades always-on for zero-cost and zero-ops. For a
local development tool, that trade is the right one. A background daemon is on
the [roadmap](./roadmap.md).

## Is it secure? Anyone with the URL can POST to it.

Correct — a public URL is public, and webhook-it has **no authentication**. But
consider the blast radius: everything is local and single-user, the database is
a file on your machine, and the daemon only runs while you have the dashboard
open. The worst case is a junk event row in your local SQLite. There is no
account to compromise and no data in the cloud.

## Does it replace ngrok?

No. webhook-it *uses* ngrok underneath, and adds what a bare tunnel does not
have: **persistence, history, replay and event semantics**. If all you want is
to expose a port, use ngrok directly. If you want to receive, inspect and replay
webhooks, that is what webhook-it is for.

## Do I need an ngrok account?

Only for **tunnel mode** — receiving events from real providers over the
internet. For **local mode** (testing with `curl` against `127.0.0.1`) you need
nothing but the binary. See [The two modes](../concepts/modes.md).

The ngrok free plan is enough: it includes one static domain, which is exactly
what gives you a *stable* URL.

## Why is the URL "stable"? Temporary-URL services give me one too.

A temporary-URL service hands you a URL that can change between sessions —
register it with Stripe today and tomorrow it may receive nothing. webhook-it
uses an ngrok **static domain**, reserved to your account. It does not change.
The URL you register with a provider keeps working.

## Can I use Stripe / GitHub / Resend / …?

Yes — any provider that calls an HTTPS URL. Create an endpoint, start the daemon
in tunnel mode, and paste the endpoint's public URL into the provider's webhook
settings. See [Connecting a real provider](../guides/connecting-a-provider.md).

## Will signature verification still pass?

Yes. webhook-it stores the request body **byte-for-byte** and forwards (and
replays) those exact bytes with the original headers. `Stripe-Signature`,
`X-Hub-Signature-256` and the like survive intact, so a signature that would
validate in production validates here too.

## Can I run several providers at once?

Yes, on a single tunnel. Create one endpoint per provider — each gets its own
`/w/<name>` URL — and switch between them with the arrow keys. The Events pane
shows the selected endpoint's traffic. See
[How it works](../concepts/how-it-works.md#one-tunnel-many-endpoints).

## What does "replay" actually do?

It re-sends a stored event to its endpoint's current target — the same method,
headers and body bytes — without involving the provider at all. It is the core
debugging loop: a webhook breaks your handler, you fix the code, you press
<kbd>r</kbd>. See [Events &amp; replay](../concepts/events-and-replay.md).

Today <kbd>r</kbd> replays the **latest** event of the selected endpoint;
per-event selection is planned.

## Where is my data stored? Does anything leave my machine?

Everything lives in `~/.webhook-it/` — `config.json` and a SQLite database.
Nothing leaves your machine except the webhook traffic itself passing through
the ngrok tunnel. No account, no login, no cloud. See
[Files &amp; configuration](../reference/files-and-config.md).

## How do I reset everything?

Delete the `~/.webhook-it/` directory. webhook-it recreates what it needs on the
next run. To reset just the event history, delete `~/.webhook-it/db.sqlite`.

## Why Bun? Why not Node?

The interactive UI is built with OpenTUI, which **only runs on Bun** — it loads
a native core through `bun:ffi`. Adopting Bun for that also collapsed the
toolchain: Bun runs TypeScript directly, is the package manager, compiles the
standalone binary, and ships `bun:sqlite`. See
[Architecture](../reference/architecture.md#why-bun).

## Do end users need Bun installed?

No. `bun run build` compiles a **standalone binary** that embeds the Bun runtime.
You need Bun to *build* webhook-it; you need nothing to *run* the result.

## Is there a web UI?

Not yet. The dashboard is terminal-only. The monorepo is structured so a future
web UI could reuse `core` + `shared` without a rewrite — it is the top item on
the [roadmap](./roadmap.md).

## Is it production-ready?

webhook-it is a **local development tool** — it is not meant to run in
production. It is also still an MVP (v0.1.0). The core cycle works end to end;
see the [Roadmap](./roadmap.md) for what is verified and what is still ahead.

## Still stuck?

- [Debugging failed events](../guides/debugging.md) — the troubleshooting guide.
- [GitHub](https://github.com/carlos3g/webhook-it) — issues and source.
