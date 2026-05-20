import { render } from "@opentui/solid";
import { Storage, readConfig } from "@webhook-it/core";
import { App } from "./app.js";

const VERSION = "0.1.0";

const HELP = `webhook-it ${VERSION} — stable public URLs for webhooks, forwarded to your localhost.

Usage: wi

Runs the interactive dashboard (no arguments needed).

Keys inside the dashboard:
  up/down or j/k   move the endpoint selection
  u                start / stop the daemon (+ ngrok tunnel)
  t                toggle tunnel / local-only mode (while stopped)
  n                create a new endpoint
  c                set the ngrok domain
  d                delete the selected endpoint
  r                replay the most recent event of the selected endpoint
  q                quit
`;

const args = process.argv;
if (args.includes("--version") || args.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}

const storage = Storage.open();
const config = await readConfig();

render(() => <App storage={storage} initialConfig={config} />, {
  exitOnCtrlC: false,
});
