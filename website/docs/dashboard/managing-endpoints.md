---
title: Managing endpoints
description: Create, select and delete endpoints from the webhook-it dashboard.
---

# Managing endpoints

This page covers the day-to-day endpoint actions in the dashboard: creating one,
moving the selection, and deleting one. For the concept behind them — names,
targets, URLs — see [Endpoints](../concepts/endpoints.md).

## Creating an endpoint

Press <kbd>n</kbd>. The **New endpoint** form opens.

![The new-endpoint form, mid-entry](/img/screens/prompt-new-endpoint.svg)

*The new-endpoint form — Name and Target URL.*

It has two fields:

| Field | What to enter | Example |
|---|---|---|
| **Name** | A path-safe slug — see [naming rules](../concepts/endpoints.md#naming-rules). | `stripe-dev` |
| **Target URL** | A valid URL where events are forwarded. | `http://localhost:3000/webhook` |

- <kbd>tab</kbd> — move between the fields.
- <kbd>enter</kbd> — create the endpoint.
- <kbd>esc</kbd> — cancel.

### Validation

The form validates on submit and **stays open with an error** if anything is
wrong:

| Error | Cause |
|---|---|
| *use only letters, numbers, '-' or '_'…* | The name is not a valid slug. |
| *target is not a valid URL* | The target does not parse as a URL. |
| *endpoint '&lt;name&gt;' already exists* | An endpoint with that name is already stored. |

Fix the field and press <kbd>enter</kbd> again. On success the new endpoint
appears in the Endpoints pane and the footer confirms it.

:::tip Provisioning many endpoints at once
Creating endpoints one by one is fine for a couple. For a whole project, declare
them in a [`.webhook-it.json`](../concepts/project-config.md) and run `wi apply`
— it creates them all in one go.
:::

## Selecting an endpoint

Move the selection with <kbd>↑</kbd> / <kbd>↓</kbd> (or <kbd>k</kbd> /
<kbd>j</kbd>). The selected endpoint:

- is highlighted in the Endpoints pane;
- shows its **target** and **public url** below the list;
- drives the **Events** pane, which shows only that endpoint's events.

Selecting is how you move between providers — pick `stripe-dev` to watch its
feed, then `github-app` to watch that one.

## Deleting an endpoint

Select the endpoint and press <kbd>d</kbd>. A confirmation appears:

![The delete confirmation](/img/screens/confirm-delete.svg)

*Deleting an endpoint asks for confirmation — and keeps the event history.*

- <kbd>y</kbd> — delete it.
- <kbd>n</kbd> or <kbd>esc</kbd> — keep it.

:::note Deletion keeps the events
Deleting an endpoint removes only the **endpoint**. Its **events stay in the
database**. Recreate an endpoint with the same name later and its history
reappears. See [Endpoints — deleting](../concepts/endpoints.md#deleting-an-endpoint).
:::

If no endpoint is selected (the list is empty), <kbd>d</kbd> simply reports
*no endpoint to delete*.

## Editing an endpoint

There is no in-dashboard "edit" action for an endpoint's target. Two paths to
change one:

- **Project-managed endpoints** — change the `target` in `.webhook-it.json` and
  run `wi apply`. The endpoint is updated in place (`~`), and its event history
  is kept. This is the recommended way.
- **Hand-created endpoints** — delete it (<kbd>d</kbd>) and recreate it
  (<kbd>n</kbd>) with the new target. The events survive the delete, so the
  history is preserved.

## Next

- [The daemon](./the-daemon.md) — start it so your endpoints get a URL.
- [Project config](../concepts/project-config.md) — manage endpoints in a file.
- [Endpoints](../concepts/endpoints.md) — the underlying concept.
