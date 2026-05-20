import { homedir } from "node:os";
import { join } from "node:path";

/** Everything webhook-it uses lives here, in the user's home. Nothing leaves the machine. */
export const HOME_DIR = join(homedir(), ".webhook-it");
export const CONFIG_PATH = join(HOME_DIR, "config.json");
export const DB_PATH = join(HOME_DIR, "db.sqlite");
