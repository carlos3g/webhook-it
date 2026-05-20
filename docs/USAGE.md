# Usage

`webhook-it` is an interactive terminal dashboard. You run `wi` and everything
happens with the keyboard inside it. The one subcommand, `wi apply`, provisions a
project's endpoints from a committed file — see *Project config* below.

For why the project exists see [`MOTIVATION.md`](MOTIVATION.md); for how it works
inside, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Running it

There is no npm package published yet. Build the standalone binary and run it:

```bash
bun install
bun run build            # produces apps/cli/dist/wi (a self-contained binary)
./apps/cli/dist/wi
```

The compiled binary embeds the Bun runtime — it needs nothing installed to run.
A handy alias (run from the repo root):

```bash
alias wi="$(pwd)/apps/cli/dist/wi"
```

During development you can skip the build and run from source with hot reload:

```bash
bun run dev
```

`wi --version`, `wi --help` and `wi apply` print and exit without opening the
dashboard.

## Where the files live

Everything lives in `~/.webhook-it/` — nothing leaves your machine:

| File | Content |
|---|---|
| `~/.webhook-it/config.json` | ngrok domain and ingest port |
| `~/.webhook-it/db.sqlite` | endpoints and event history (+ `-wal`/`-shm` files) |

Deleting those files resets the state. There is no account, no login, no cloud.

## Project config (`.webhook-it.json`)

A repository can declare its webhook endpoints in a committed file, so a new
teammate provisions everything with one command instead of recreating each
endpoint by hand.

Put `.webhook-it.json` at the repo root:

```json
{
  "$schema": "https://github.com/carlos3g/webhook-it/blob/main/webhook-it.schema.json",
  "project": "acme-api",
  "endpoints": {
    "stripe": { "target": "http://localhost:3000/webhooks/stripe" },
    "github": { "target": "http://localhost:3000/webhooks/github" }
  }
}
```

- **`project`** namespaces every endpoint. `stripe` above is stored — and exposed
  in its public URL — as `acme-api-stripe`, so two repositories never collide.
- **`endpoints`** maps a name to the local URL that receives the forward.
- **Commit it.** It holds no secrets. The personal bits (your ngrok domain) stay
  in `~/.webhook-it/config.json`, which is per-machine and never committed.

Then run `wi apply` from anywhere inside the repo:

```bash
wi apply
```

```
webhook-it — applied /path/to/repo/.webhook-it.json
project: acme-api

  + acme-api-stripe  http://localhost:3000/webhooks/stripe
  + acme-api-github  http://localhost:3000/webhooks/github

2 endpoint(s): 2 created, 0 updated, 0 unchanged
```

`wi apply` is idempotent, like `terraform apply`: it creates missing endpoints,
updates changed targets and leaves the rest untouched (`+` created, `~` updated,
`=` unchanged). It **never deletes** — an endpoint dropped from the file is
reported but kept, with its event history. Safe to re-run, and safe in CI: it
exits `1` on a missing or invalid file, `0` otherwise.

You can also skip the command: when you open `wi` inside a repo that has a
`.webhook-it.json`, the dashboard detects it and offers to apply any pending
changes — the same way it prompts for the ngrok domain on first run.

## The two modes

The dashboard runs the daemon in one of two modes; toggle with `t` while the
daemon is stopped.

| | Local mode | Tunnel mode |
|---|---|---|
| Needs ngrok | no | yes |
| URL that receives webhooks | `http://127.0.0.1:4505/w/<name>` | `https://<your>.ngrok-free.app/w/<name>` |
| For | testing locally with `curl` | real providers (Stripe, GitHub…) |

Tunnel mode requires an ngrok static domain. **On first run, if no domain is
configured, the dashboard opens the setup automatically** — fill it in, or press
`esc` to skip and use local mode. You can change it any time with `c`.

## The dashboard

```
╭ webhook-it ───────────────────────  running (tunnel) — https://you.ngrok-free.app ╮
╭ Endpoints ─────────╮╭ Events — stripe-dev ──────────────────────────────────────╮
│ > stripe-dev       ││ 14:02:51  a1b2c3d4e5  POST          200                   │
│   github-app       ││ 14:02:31  f6g7h8i9j0  POST/refunds  200                   │
│                    ││                                                           │
│ target             ││                                                           │
│ http://localhost.. ││                                                           │
│ public url         ││                                                           │
│ https://you.ngro.. ││                                                           │
╰────────────────────╯╰───────────────────────────────────────────────────────────╯
╭ keybindings ──────────────────────────────────────  latest status message ───────╮
```

- **Header** — the daemon status and, when running, the public base URL.
- **Endpoints** — the list of endpoints; the selected one shows its target and
  its public URL below.
- **Events** — webhooks received by the selected endpoint, newest first, with the
  delivery status (the HTTP code your local app returned, `···` if not delivered).
- **Footer** — the keybindings and the latest status message.

## Keys

| Key | Action |
|---|---|
| `up` / `down`, or `k` / `j` | move the endpoint selection |
| `u` | start / stop the daemon (+ ngrok tunnel) |
| `t` | toggle tunnel / local-only mode (while the daemon is stopped) |
| `n` | create a new endpoint (a small form opens) |
| `c` | set the ngrok static domain |
| `d` | delete the selected endpoint (its event history is kept) |
| `r` | replay the most recent event of the selected endpoint |
| `q` | quit |

In a form (`n` / `c`): `tab` moves between fields, `enter` confirms, `esc` cancels.

## Typical flows

### Local test (no ngrok)

1. `n` → create an endpoint, target `http://localhost:3000/your/webhook`.
2. `u` → start the daemon (local mode, since no ngrok domain is set).
3. From another terminal, send a webhook:
   ```bash
   curl -X POST http://127.0.0.1:4505/w/<name> \
     -H 'content-type: application/json' -d '{"event":"test"}'
   ```
4. Watch it appear in the Events pane and get forwarded to your local app.

### Real provider (ngrok)

1. `ngrok config add-authtoken <token>` (once, outside the tool).
2. `c` → set your reserved domain, e.g. `yourname.ngrok-free.app`.
3. `n` → create an endpoint.
4. `u` → start the daemon; the public URL appears in the header.
5. Paste `https://yourname.ngrok-free.app/w/<name>` into the provider's dashboard.

### Joining a project that already uses webhook-it

1. `ngrok config add-authtoken <token>` and reserve a domain — once per machine.
2. Open `wi`, press `c`, set your ngrok domain.
3. `wi apply` in the repo — every endpoint is created from `.webhook-it.json`.
4. `u` to start the daemon. Done — no endpoint set up by hand.

## Operational limitations

- **The dashboard must be open.** Webhooks only arrive while `wi` is running with
  the daemon started and the machine on. Laptop closed = webhook lost. This is the
  accepted consequence of having no server — see [`MOTIVATION.md`](MOTIVATION.md).
- **No authentication.** Anyone with the URL can send a webhook. Since everything
  is local and single-user, the worst case is a junk event in your SQLite.
- The daemon always responds `200` to the provider as soon as it persists the
  event; it does not wait for (nor relay) your local app's response.
