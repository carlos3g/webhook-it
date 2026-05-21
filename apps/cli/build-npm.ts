import { rmSync } from "node:fs";
import solidPlugin from "@opentui/solid/bun-plugin";

// Bundles the CLI into a plain ESM file for the npm package.
//
// build.ts (the other build) uses `--compile` to embed the Bun runtime into a
// standalone, platform-specific binary. That is great for a direct download,
// but wrong for npm: a single compiled binary only runs on one OS/arch.
//
// This build keeps the output as JavaScript that runs on the user's own Bun.
// Solid and @opentui/solid are bundled IN — they must be resolved at build
// time (with the Solid plugin) so the correct browser/universal build of
// solid-js is used. If solid-js were left external, the Bun runtime would
// resolve it to its server build and createMemo/createSignal would break.
// Only @opentui/core stays external: it loads a native core that cannot be
// bundled into a portable .js file, so it remains a real npm dependency.

rmSync("./dist-npm", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist-npm",
  target: "bun",
  format: "esm",
  external: ["@opentui/core", "@opentui/core/*"],
  plugins: [solidPlugin],
  naming: "wi.js",
  // Make the entry directly executable: `wi` / `bunx @carlos3g/webhook-it`.
  banner: "#!/usr/bin/env bun",
});

if (!result.success) {
  console.error("npm build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("built ./dist-npm/wi.js");
