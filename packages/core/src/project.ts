import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { endpointNameSchema } from "@webhook-it/shared";
import type { Storage } from "./storage.js";

/** The committed, per-repo config file `wi apply` reads. */
export const PROJECT_CONFIG_FILENAME = ".webhook-it.json";

const endpointEntrySchema = z.object({
  /** local URL that receives the forwarded webhook. */
  target: z.string().min(1, "target is required").url("target must be a valid URL"),
});

/**
 * Schema of `.webhook-it.json`. The `project` field namespaces every endpoint:
 * an endpoint declared as `stripe` in project `acme-api` is stored, and exposed
 * in the public URL, as `acme-api-stripe` — so two repos never collide.
 *
 * Unknown keys (e.g. `$schema`) are stripped, not rejected.
 */
export const projectConfigSchema = z.object({
  project: endpointNameSchema,
  endpoints: z
    .record(endpointNameSchema, endpointEntrySchema)
    .refine((eps) => Object.keys(eps).length > 0, {
      message: "declare at least one endpoint",
    }),
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export interface LoadedProjectConfig {
  /** absolute path of the file that was loaded. */
  path: string;
  config: ProjectConfig;
}

/** Thrown when a `.webhook-it.json` exists but cannot be read or is invalid. */
export class ProjectConfigError extends Error {
  override readonly name = "ProjectConfigError";
}

/**
 * Walks up from `startDir` looking for a `.webhook-it.json`, the way git finds
 * `.git`. Returns the absolute path, or null if none exists up to the root.
 */
export function findProjectConfig(startDir: string = process.cwd()): string | null {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, PROJECT_CONFIG_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Finds and parses the project config. Returns null when no file exists (not an
 * error — most directories have none); throws `ProjectConfigError` when a file
 * is present but broken.
 */
export async function loadProjectConfig(
  startDir: string = process.cwd(),
): Promise<LoadedProjectConfig | null> {
  const path = findProjectConfig(startDir);
  if (!path) return null;

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    throw new ProjectConfigError(`could not read ${path}: ${(err as Error).message}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new ProjectConfigError(`${path} is not valid JSON: ${(err as Error).message}`);
  }

  const parsed = projectConfigSchema.safeParse(json);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ProjectConfigError(`${path} is invalid:\n${details}`);
  }

  return { path, config: parsed.data };
}

/** The namespaced name an endpoint is actually stored under. */
export function qualifiedEndpointName(project: string, shortName: string): string {
  return `${project}-${shortName}`;
}

export type ApplyAction = "create" | "update" | "unchanged";

export interface PlannedEndpoint {
  /** name as written in the file. */
  shortName: string;
  /** namespaced name actually stored: `<project>-<shortName>`. */
  name: string;
  /** desired forward target from the file. */
  target: string;
  /** the stored target today, or null if the endpoint does not exist yet. */
  currentTarget: string | null;
  action: ApplyAction;
}

export interface ProjectApplyPlan {
  project: string;
  configPath: string;
  endpoints: PlannedEndpoint[];
  /**
   * Endpoints stored under this project's namespace that the file no longer
   * declares. Reported only — `wi apply` never deletes (event history is kept).
   */
  orphans: string[];
}

/**
 * Diffs the file against what is in storage, without writing anything. Pure, so
 * the dashboard can preview the change before asking the user to confirm.
 */
export function planProjectApply(
  storage: Storage,
  loaded: LoadedProjectConfig,
): ProjectApplyPlan {
  const { project, endpoints } = loaded.config;
  const planned: PlannedEndpoint[] = [];
  const declared = new Set<string>();

  for (const [shortName, entry] of Object.entries(endpoints)) {
    const name = qualifiedEndpointName(project, shortName);
    declared.add(name);
    const existing = storage.getEndpoint(name);
    const currentTarget = existing?.targetUrl ?? null;
    const action: ApplyAction = !existing
      ? "create"
      : existing.targetUrl === entry.target
        ? "unchanged"
        : "update";
    planned.push({ shortName, name, target: entry.target, currentTarget, action });
  }

  const prefix = `${project}-`;
  const orphans = storage
    .listEndpoints()
    .filter((ep) => ep.name.startsWith(prefix) && !declared.has(ep.name))
    .map((ep) => ep.name);

  return { project, configPath: loaded.path, endpoints: planned, orphans };
}

/** Executes a plan: creates missing endpoints, updates changed targets. Idempotent. */
export function executeProjectApply(storage: Storage, plan: ProjectApplyPlan): void {
  for (const ep of plan.endpoints) {
    if (ep.action === "create") {
      storage.createEndpoint(ep.name, ep.target);
    } else if (ep.action === "update") {
      storage.updateEndpointTarget(ep.name, ep.target);
    }
  }
}
