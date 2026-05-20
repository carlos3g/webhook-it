import { mkdirSync } from "node:fs";
import solidPlugin from "@opentui/solid/bun-plugin";

// Compile the interactive CLI into a standalone executable. The Solid plugin
// handles JSX; `compile` embeds the Bun runtime so the binary needs nothing
// installed to run.
mkdirSync("./dist", { recursive: true });

const result = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  plugins: [solidPlugin],
  compile: { outfile: "./dist/wi" },
});

if (!result.success) {
  console.error("build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("built ./dist/wi");
