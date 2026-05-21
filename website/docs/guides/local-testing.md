---
title: Local testing
description: Test a webhook handler end to end on your own machine with webhook-it's local mode and curl — no ngrok account needed.
---

# Local testing

This guide uses **local mode** to test a webhook handler entirely on your
machine. No ngrok account, no internet — just the binary and `curl`. It is the
fastest way to iterate on a handler.

## When to use local mode

Reach for local mode when **no real provider needs to reach you**:

- You are building or refactoring a handler and want to fire test payloads.
- You are reproducing a bug from a payload you already have.
- You are offline.

When a real provider must call you, use tunnel mode instead — see
[Connecting a real provider](./connecting-a-provider.md).

## Step 1 — Open the dashboard in local mode

```bash
wi
```

If this is your first run, press <kbd>esc</kbd> at the ngrok domain prompt to
skip it. If a domain is already set, press <kbd>t</kbd> (while the daemon is
stopped) until the header reads `stopped (local)`.

## Step 2 — Create an endpoint

Press <kbd>n</kbd> and fill the form:

- **Name** — `local-test`
- **Target URL** — wherever your handler listens, e.g.
  `http://localhost:3000/webhooks/stripe`

Press <kbd>enter</kbd>.

## Step 3 — Start the daemon

Press <kbd>u</kbd>. The header turns green:
`running (local) — http://127.0.0.1:4505`.

Your endpoint is live at:

```
http://127.0.0.1:4505/w/local-test
```

## Step 4 — Send test webhooks

From a second terminal, POST to that URL. A basic JSON payload:

```bash
curl -X POST http://127.0.0.1:4505/w/local-test \
  -H 'content-type: application/json' \
  -d '{"event":"checkout.session.completed","amount":4200}'
```

webhook-it answers instantly:

```json
{"ok":true,"id":"k4m2p9x1c7"}
```

![Sending a webhook with curl](/img/screens/cmd-curl.svg)

*The daemon returns `200` and the new event id the moment it persists.*

The event appears in the **Events** pane, and webhook-it forwards it to
`http://localhost:3000/webhooks/stripe`.

## Going further

### Send a real-looking signature header

webhook-it forwards every header untouched, so you can include the headers a
provider would send and verify your signature-checking code path:

```bash
curl -X POST http://127.0.0.1:4505/w/local-test \
  -H 'content-type: application/json' \
  -H 'stripe-signature: t=1700000000,v1=8d9f2c1a...' \
  -H 'x-webhook-id: evt_test_001' \
  -d '{"type":"invoice.paid"}'
```

### Replay a payload from a file

Keep a fixture file and POST it whenever you need that exact event:

```bash
curl -X POST http://127.0.0.1:4505/w/local-test \
  -H 'content-type: application/json' \
  --data-binary @./fixtures/invoice-paid.json
```

`--data-binary` (rather than `-d`) preserves the bytes exactly — important if
your handler validates a signature over the file.

### Use a path suffix

Anything after the endpoint name is carried through to your target. This:

```bash
curl -X POST http://127.0.0.1:4505/w/local-test/refunds \
  -H 'content-type: application/json' -d '{"id":"re_1"}'
```

is forwarded to `http://localhost:3000/webhooks/stripe/refunds`. The Events pane
shows it as `POST/refunds`. See [Endpoints — path suffixes](../concepts/endpoints.md#path-suffixes).

### Pass a query string

Query parameters are preserved on the forward:

```bash
curl -X POST 'http://127.0.0.1:4505/w/local-test?attempt=2' \
  -H 'content-type: application/json' -d '{}'
```

reaches your target as `…/webhooks/stripe?attempt=2`.

## Reading the result

In the Events pane, the **delivery status** column tells you what your handler
did:

| Shown | Meaning |
|---|---|
| `200` (normal color) | Your handler accepted the event. |
| `400` / `500` (red) | Your handler responded with an error. |
| `···` (dim) | Nothing answered — wrong port, or the app is not running. |

If you see `···`, that is fine — the event is saved. Start your handler and
press <kbd>r</kbd> to [replay](../dashboard/replaying.md) it.

## Tips

:::tip Use an isolated HOME for throwaway tests
webhook-it keeps all state in `~/.webhook-it/`. To experiment without touching
your real endpoints and history, point `HOME` somewhere temporary:

```bash
HOME=/tmp/wi-scratch wi
```

Everything — config and database — is then created under `/tmp/wi-scratch`.
Delete the directory to reset.
:::

## Next

- [Connecting a real provider](./connecting-a-provider.md) — move from `curl` to
  real Stripe / GitHub events.
- [Debugging failed events](./debugging.md) — when the forward goes wrong.
- [Events &amp; replay](../concepts/events-and-replay.md) — the model behind it.
