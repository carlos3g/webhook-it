# @carlos3g/webhook-it

> Stable public URLs for webhooks, forwarded in real time to your `localhost` —
> through an interactive terminal dashboard.

`wi` opens an interactive dashboard where you start a local daemon, manage
webhook endpoints, watch events arrive live, and replay them. It runs 100% on
your machine; the only external piece is the ngrok tunnel.

📚 **Full documentation:** <https://carlos3g.github.io/webhook-it/>

## Requirements

webhook-it is built with [OpenTUI](https://github.com/anomalyco/opentui), which
runs on **[Bun](https://bun.sh) 1.3+**. Bun must be installed to run this
package.

## Install

```bash
# run it without installing
bunx @carlos3g/webhook-it

# or install it globally
bun add -g @carlos3g/webhook-it
wi
```

## Usage

```bash
wi            # open the interactive dashboard
wi apply      # provision endpoints from .webhook-it.json
wi --help     # usage and keybindings
```

Inside the dashboard: `u` start/stop the daemon · `n` new endpoint · `c` set the
ngrok domain · `t` toggle tunnel/local mode · `r` replay · `d` delete · `q` quit.

## Documentation

- [Quick Start](https://carlos3g.github.io/webhook-it/docs/quick-start)
- [How it works](https://carlos3g.github.io/webhook-it/docs/concepts/how-it-works)
- [CLI reference](https://carlos3g.github.io/webhook-it/docs/reference/cli)

## License

See the [webhook-it repository](https://github.com/carlos3g/webhook-it).
