import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { CONFIG_PATH, HOME_DIR } from "./paths.js";

export const configSchema = z.object({
  /** free ngrok static domain, e.g. "yourname.ngrok-free.app". */
  ngrokDomain: z.string().min(1).optional(),
  /** local port on 127.0.0.1 that ngrok forwards to the daemon. */
  ingestPort: z.number().int().positive().default(4505),
});

export type WebhookItConfig = z.infer<typeof configSchema>;

/**
 * Reads the config. If the file does not exist, returns the defaults — the
 * first run is not an error.
 */
export async function readConfig(): Promise<WebhookItConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return configSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return configSchema.parse({});
    }
    throw err;
  }
}

export async function writeConfig(config: WebhookItConfig): Promise<void> {
  await mkdir(HOME_DIR, { recursive: true });
  const normalized = configSchema.parse(config);
  await writeFile(
    CONFIG_PATH,
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );
}
