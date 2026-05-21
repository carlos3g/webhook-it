---
title: Keybindings
description: The complete keyboard reference for the webhook-it dashboard — global keys, form keys and confirmation keys.
---

# Keybindings

The webhook-it dashboard is **keyboard-only** — there is no mouse interaction.
Every key is listed in the footer at all times; this page is the complete
reference.

## Global keys

These work whenever no overlay is open:

| Key | Action |
|---|---|
| <kbd>↑</kbd> / <kbd>↓</kbd> | Move the endpoint selection |
| <kbd>k</kbd> / <kbd>j</kbd> | Move the endpoint selection (vim-style) |
| <kbd>u</kbd> | Start / stop the daemon (and the ngrok tunnel) |
| <kbd>t</kbd> | Toggle tunnel / local-only mode (only while stopped) |
| <kbd>n</kbd> | Create a new endpoint — opens a form |
| <kbd>c</kbd> | Set the ngrok static domain — opens a form |
| <kbd>d</kbd> | Delete the selected endpoint — asks to confirm |
| <kbd>r</kbd> | Replay the most recent event of the selected endpoint |
| <kbd>q</kbd> | Quit — stops the daemon and exits cleanly |
| <kbd>Ctrl</kbd>+<kbd>C</kbd> | Quit (same as <kbd>q</kbd>) |

Selecting a different endpoint also re-points the **Events** pane at that
endpoint's feed.

## In a form (prompt)

When a prompt is open — after <kbd>n</kbd> or <kbd>c</kbd> — the keys change:

| Key | Action |
|---|---|
| <kbd>tab</kbd> | Move to the next field |
| <kbd>enter</kbd> | Submit the form |
| <kbd>esc</kbd> | Cancel and close the form |
| <kbd>backspace</kbd> | Delete the last character of the active field |
| *printable keys* | Type into the active field |

If the form fails validation, it stays open and shows the reason — fix the
field and press <kbd>enter</kbd> again.

## In a confirmation

When a yes/no confirmation is open — after <kbd>d</kbd>, or the project-apply
prompt:

| Key | Action |
|---|---|
| <kbd>y</kbd> | Confirm — yes |
| <kbd>n</kbd> | Cancel — no |
| <kbd>esc</kbd> | Cancel — no |

## Quick reference

You can also see the dashboard keys without opening it, via `wi --help`:

![wi --help listing the dashboard keys](/img/screens/cmd-help.svg)

*`wi --help` prints the keybindings — handy before you even open the dashboard.*

## Cheat sheet

A typical session, in keys:

```
wi          → open the dashboard
c           → set your ngrok domain   (first time only)
n           → create an endpoint
u           → start the daemon
↑ / ↓       → switch between endpoints, watch their events
r           → replay the latest event while debugging
q           → quit
```

## Next

- [Managing endpoints](./managing-endpoints.md) — <kbd>n</kbd>, <kbd>d</kbd> and
  selection in detail.
- [The daemon](./the-daemon.md) — <kbd>u</kbd>, <kbd>t</kbd> and <kbd>c</kbd>.
- [Replaying events](./replaying.md) — <kbd>r</kbd> in detail.
