# Motivation

## The problem

Testing webhooks during local development is frustrating. The workflow I use today is:

1. Open [webhook.site](https://webhook.site) and grab a temporary URL.
2. Register that URL with the provider (Stripe, GitHub, Mercado Pago, etc).
3. Trigger the event.
4. Watch the payload arrive on webhook.site.
5. **Copy the payload by hand.**
6. **Paste it into Postman / Insomnia.**
7. **Manually POST it to `http://localhost:3000/webhook`.**
8. Repeat for every new test.

## Why it hurts

- **It is manual and breaks the flow.** Every test becomes a copy/paste sequence across three tools. When I am debugging something that needs many triggers (tweaking an event parser, validating idempotency, reproducing an intermittent bug), the friction becomes the bottleneck.
- **The webhook.site URL expires.** Without a paid plan, the URL can change from one day to the next. I have registered a webhook with a provider in the morning and, the next morning, found the URL no longer received anything. Result: I re-register it with every provider.
- **Headers and signatures get lost along the way.** When I copy the body and paste it into Postman, headers like `Stripe-Signature`, `X-Hub-Signature-256`, `X-Webhook-Id` are left out. Then the local handler rejects the request because the signature does not match — and the problem is not the handler, it is my test workflow.
- **I cannot reproduce an event later.** When webhook.site recycles, old events are gone. If I want to run the same payload again tomorrow, too bad.
- **There is no organized history.** When I work with more than one provider at once (Stripe + GitHub + an internal one), they all land in the same visual inbox on webhook.site. Filtering is manual.

## What I want

A tool that solves all of the friction above at once:

1. **A stable public URL.** I create it once, it is mine until I delete it. I can register it in the Stripe dashboard without worrying it will die tomorrow.
2. **Automatic forwarding to my localhost.** The webhook arrives at the public URL and is delivered, with headers and body intact, to my local endpoint. No copy/paste.
3. **Persistent history and replay.** Every received event is saved. When the local handler breaks, I can redeliver the same payload (same bytes, same headers) with one command.
4. **CLI-first.** I live in the terminal. I do not want to open a browser tab to see what happened. Watching webhooks arrive should feel as natural as `tail -f`.
5. **No server to maintain, no cost.** I do not want to deploy or pay for anything. The tool runs 100% on my machine; the only external piece is the tunnel that provides the public URL (ngrok, on the free plan).
6. **Multi-endpoint.** One endpoint per provider/project, isolated. `stripe-prod`, `stripe-staging`, `github-app-x` — each with its own URL and its own local target, all behind a single tunnel.
7. **A clear path to a UI later.** For now the CLI is enough, but I know I will want a dashboard to inspect large payloads, compare events, see diffs. The project must be ready for that from the start, with no rewrite.

## The network constraint (and the choice it forces)

A public URL that Stripe/GitHub can call **requires** some infrastructure on the internet — my laptop behind NAT is not reachable from outside. There are only two paths:

- **(a)** a server with a public IP that I run/pay for; or
- **(b)** a **tunnel**: a service that already has public infrastructure exposes a URL and forwards the traffic to my localhost.

Since I do not want to maintain or pay for a server, webhook-it goes with **(b)**: it uses **ngrok** (which offers 1 free static domain per account) as the only external dependency. Everything else — receiving, persisting, forwarding, history, replay — runs locally, on my machine.

**Honest trade-off:** webhooks only arrive while my machine is on and the daemon + tunnel are up. With the laptop closed, the webhook is lost — an always-on server would not have this problem. For development testing this is acceptable; it is the price of having no server.

## What is NOT a goal

- **It is not an ngrok replacement.** webhook-it uses a tunnel underneath, but adds what a bare tunnel does not have: persistence, replay, history and event semantics. If you only want to expose a port, use ngrok directly.
- **It is not a commercial multi-tenant SaaS.** It runs locally, single-user, with no login or account — the security boundary is the machine itself.
- **It is not an automated webhook testing platform.** It does not generate fake payloads or simulate providers. The focus is receiving the real event and delivering it locally.
