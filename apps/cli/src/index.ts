import {
  Storage,
  readConfig,
  loadProjectConfig,
  planProjectApply,
  executeProjectApply,
  ProjectConfigError,
  PROJECT_CONFIG_FILENAME,
  type ApplyAction,
  type ProjectApplyPlan,
} from "@webhook-it/core";

const VERSION = "0.1.2";

const HELP = `webhook-it ${VERSION} — stable public URLs for webhooks, forwarded to your localhost.

Usage:
  wi            open the interactive dashboard
  wi apply      create/update endpoints from ${PROJECT_CONFIG_FILENAME} (current project)

Run 'wi' with no arguments for the dashboard. 'wi apply' is non-interactive — it
reconciles the endpoints declared in ${PROJECT_CONFIG_FILENAME} and exits, so a new
teammate only has to set their ngrok domain and run it.

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

/** Prints a `wi apply` plan as a readable summary. */
function printApplyPlan(plan: ProjectApplyPlan): void {
  const mark: Record<ApplyAction, string> = { create: "+", update: "~", unchanged: "=" };
  const width = Math.max(12, ...plan.endpoints.map((e) => e.name.length));

  console.log(`webhook-it — applied ${plan.configPath}`);
  console.log(`project: ${plan.project}\n`);
  for (const ep of plan.endpoints) {
    console.log(`  ${mark[ep.action]} ${ep.name.padEnd(width)}  ${ep.target}`);
  }

  const count = (action: string): number =>
    plan.endpoints.filter((e) => e.action === action).length;
  console.log(
    `\n${String(plan.endpoints.length)} endpoint(s): ` +
      `${String(count("create"))} created, ${String(count("update"))} updated, ` +
      `${String(count("unchanged"))} unchanged`,
  );

  if (plan.orphans.length > 0) {
    console.log(
      `\nnote: ${String(plan.orphans.length)} endpoint(s) under this namespace are not in ` +
        `the file (kept, not deleted):`,
    );
    for (const name of plan.orphans) console.log(`  ? ${name}`);
  }

  console.log(`\nrun 'wi' to open the dashboard and start the daemon.`);
}

/** Runs the `wi apply` subcommand, then exits the process. */
async function runApply(): Promise<never> {
  let loaded;
  try {
    loaded = await loadProjectConfig();
  } catch (err) {
    console.error(err instanceof ProjectConfigError ? err.message : String(err));
    process.exit(1);
  }

  if (!loaded) {
    console.error(
      `no ${PROJECT_CONFIG_FILENAME} found in the current directory or any parent.\n` +
        `create one at your repo root to declare its endpoints — see docs/USAGE.md.`,
    );
    process.exit(1);
  }

  const storage = Storage.open();
  try {
    const plan = planProjectApply(storage, loaded);
    executeProjectApply(storage, plan);
    printApplyPlan(plan);
  } finally {
    storage.close();
  }
  process.exit(0);
}

/** Opens the interactive dashboard. OpenTUI is imported lazily so the headless
 * commands above never load the native terminal core. */
async function runDashboard(): Promise<void> {
  const { startDashboard } = await import("./app.js");
  startDashboard(Storage.open(), await readConfig());
}

const args = process.argv;
if (args.includes("--version") || args.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}
if (args.includes("apply")) {
  await runApply();
} else {
  await runDashboard();
}
