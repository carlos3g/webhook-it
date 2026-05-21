import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";

export interface NgrokStartOptions {
  /** local port the tunnel forwards to. */
  port: number;
  /** free static domain, e.g. "yourname.ngrok-free.app". */
  domain: string;
}

const STARTUP_TIMEOUT_MS = 15_000;
/** log levels ngrok uses for errors (the "eror" spelling is ngrok's own). */
const ERROR_LEVELS = new Set(["eror", "error", "crit"]);

function readLines(stream: Readable | null, onLine: (line: string) => void): void {
  if (!stream) return;
  createInterface({ input: stream }).on("line", onLine);
}

/** ngrok's JSON log values are untyped; coerce a field to a string safely. */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Starts the tunnel by running the `ngrok` binary the user already installed, so
 * webhook-it does not have to bundle any native SDK. The authtoken lives in
 * ngrok's own config; here we only pass the port and the static domain.
 */
export class NgrokTunnel {
  #proc: ChildProcess | null = null;
  #url: string | null = null;

  get url(): string | null {
    return this.#url;
  }

  start(opts: NgrokStartOptions): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "ngrok",
        [
          "http",
          String(opts.port),
          "--domain",
          opts.domain,
          "--log",
          "stdout",
          "--log-format",
          "json",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      this.#proc = proc;

      let settled = false;
      const fail = (message: string): void => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      };
      const succeed = (url: string): void => {
        if (settled) return;
        settled = true;
        this.#url = url;
        resolve(url);
      };

      proc.on("error", (err) => {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          fail(
            "'ngrok' binary not found in PATH. Install it from https://ngrok.com/download",
          );
        } else {
          fail(`failed to start ngrok: ${err.message}`);
        }
      });

      proc.on("exit", (code) => {
        fail(`ngrok exited (code ${String(code)}) before opening the tunnel`);
      });

      const onLine = (line: string): void => {
        const trimmed = line.trim();
        if (!trimmed) return;
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
          return;
        }
        if (
          parsed["msg"] === "started tunnel" &&
          typeof parsed["url"] === "string"
        ) {
          succeed(parsed["url"]);
          return;
        }
        const level = asString(parsed["lvl"]);
        if (ERROR_LEVELS.has(level)) {
          const detail =
            asString(parsed["err"]) || asString(parsed["msg"]) || "unknown error";
          fail(`ngrok: ${detail}`);
        }
      };

      readLines(proc.stdout, onLine);
      readLines(proc.stderr, onLine);

      setTimeout(() => {
        fail("timed out waiting for the ngrok tunnel to come up (15s)");
      }, STARTUP_TIMEOUT_MS).unref();
    });
  }

  stop(): void {
    if (this.#proc && !this.#proc.killed) {
      this.#proc.kill("SIGTERM");
    }
    this.#proc = null;
  }
}
