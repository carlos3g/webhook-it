import { rmSync } from "node:fs";
import solidPlugin from "@opentui/solid/bun-plugin";

// Bundles the CLI into a plain ESM file for the npm package.
//
// build.ts (the other build) uses `--compile` to embed the Bun runtime into a
// standalone, platform-specific binary. That is great for a direct download,
// but wrong for npm: a single compiled binary only runs on one OS/arch.
//
// This build keeps the output as JavaScript that runs on the user's own Bun
// (OpenTUI requires Bun anyway). The internal @webhook-it/* workspace packages
// are bundled in; OpenTUI and Solid stay external — they are real npm
// dependencies declared in package.json.

rmSync("./dist-npm", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist-npm",
  target: "bun",
  format: "esm",
  external: [
    "@opentui/core",
    "@opentui/core/*",
    "@opentui/solid",
    "@opentui/solid/*",
    "solid-js",
    "solid-js/*",
  ],
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
