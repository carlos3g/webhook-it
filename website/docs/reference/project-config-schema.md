---
title: Project config schema
description: The complete schema reference for .webhook-it.json — every field, every validation rule, and editor autocomplete.
---

# Project config schema

`.webhook-it.json` is the committed file that declares a repository's webhook
endpoints. This page is the **complete reference** for its structure. For the
workflow around it, see [Project config](../concepts/project-config.md) and
[Team workflow](../guides/team-workflow.md).

## Full example

```json title=".webhook-it.json"
{
  "$schema": "https://github.com/carlos3g/webhook-it/blob/main/webhook-it.schema.json",
  "project": "acme-api",
  "endpoints": {
    "stripe": { "target": "http://localhost:3000/hooks/stripe" },
    "github": { "target": "http://localhost:3000/hooks/github" },
    "resend": { "target": "http://localhost:3000/hooks/resend" }
  }
}
```

## Top-level fields

| Field | Type | Required | Description |
|---|---|---|---|
| `$schema` | string | optional | A reference to the JSON Schema, for editor support. Ignored by webhook-it. |
| `project` | string | **required** | The namespace for every endpoint in this file. |
| `endpoints` | object | **required** | A map of endpoint name → endpoint definition. At least one entry. |

No other top-level keys are allowed — `$schema` aside, unknown keys are
rejected.

## `$schema`

Optional. Points editors at the JSON Schema so you get **autocomplete and
inline validation** while editing the file. Use:

```json
"$schema": "https://github.com/carlos3g/webhook-it/blob/main/webhook-it.schema.json"
```

webhook-it itself does not need this field — it strips it before validating.

## `project`

**Required.** A string that namespaces every endpoint declared in the file.

An endpoint listed as `stripe` in a file with `"project": "acme-api"` is stored,
and exposed in its public URL, as **`acme-api-stripe`**. This is what stops two
repositories from colliding on a name.

**Rules:**

- 1 to 64 characters.
- Letters, numbers, `-` and `_` only.
- Must start with a letter or a number.

The pattern is `^[a-zA-Z0-9][a-zA-Z0-9-_]*$`.

Valid: `acme-api`, `billing`, `acme_internal`, `v2`.
Invalid: `acme api` (space), `-acme` (leading dash), `acme.api` (dot).

## `endpoints`

**Required.** An object mapping each **endpoint name** to its definition. It
must contain **at least one** entry.

```json
"endpoints": {
  "<name>": { "target": "<url>" }
}
```

### Endpoint name (the key)

Each key is the endpoint's short name — the part before namespacing. Same rules
as `project`:

- 1 to 64 characters.
- Letters, numbers, `-` and `_` only.
- Must start with a letter or a number.

The **stored** name is `<project>-<name>` and the public route is
`/w/<project>-<name>` — see [Endpoints](../concepts/endpoints.md).

### Endpoint definition (the value)

Each value is an object with exactly one field:

| Field | Type | Required | Description |
|---|---|---|---|
| `target` | string | **required** | The local URL that receives the forwarded webhook. |

`target` must be a **valid, absolute URL**. It is where webhook-it forwards
events for this endpoint — typically a `localhost` address:

```json
{ "target": "http://localhost:3000/api/webhooks/stripe" }
```

No other fields are allowed inside an endpoint definition.

## Validation

`wi apply` (and the dashboard's auto-detect) validate the file before applying
anything. The checks, and the message each failure produces:

| Rule | Failure message |
|---|---|
| File must be valid JSON | `<path> is not valid JSON: <detail>` |
| `project` present and a valid slug | `project: use only letters, numbers, '-' or '_'…` |
| `endpoints` has at least one entry | `endpoints: declare at least one endpoint` |
| Each endpoint name is a valid slug | `endpoints.<name>: use only letters, numbers, '-' or '_'…` |
| Each `target` is present | `endpoints.<name>.target: target is required` |
| Each `target` is a valid URL | `endpoints.<name>.target: target must be a valid URL` |
| No unknown fields | the offending key is reported |

A file that fails any rule causes `wi apply` to print every problem and exit
`1`. Example:

```text
/path/to/repo/.webhook-it.json is invalid:
  - endpoints.bad name!: use only letters, numbers, '-' or '_', starting with a letter or number
  - endpoints.bad name!.target: target must be a valid URL
```

See [Debugging — `wi apply`](../guides/debugging.md#debugging-wi-apply).

## The JSON Schema

webhook-it ships a JSON Schema (Draft 7) for this file —
`webhook-it.schema.json` at the repository root. Reference it via `$schema` (as
above) and editors such as VS Code give you autocomplete, hover docs and live
validation as you type.

## Where to put the file

Place `.webhook-it.json` at the **root of your repository**. `wi apply` walks up
from the current directory to find it, so it works from any subdirectory — but
the root is the conventional, discoverable location, and it is what the
dashboard's auto-detect expects.

## Next

- [Project config](../concepts/project-config.md) — the concept and `wi apply`.
- [Team workflow](../guides/team-workflow.md) — using it across a team.
- [CLI reference — `wi apply`](./cli.md#wi-apply) — output and exit codes.
