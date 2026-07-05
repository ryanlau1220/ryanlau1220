import { createRequire } from "node:module";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";

export * from "./schema";

export function createDb(d1: any) {
  if (d1 && typeof d1.prepare === "function") {
    return drizzleD1(d1, { schema });
  }

  try {
    const require = createRequire(import.meta.url);
    const { Database } = require("node:sqlite");
    const { drizzle: drizzleNode } = require("drizzle-orm/node-sqlite");
    const path = require("node:path");
    const fs = require("node:fs");

    const workspaceRoot = process.cwd();

    // Look up local SQLite file under apps/portfolio or workspace root
    const wranglerDir = path.join(
      workspaceRoot,
      "apps/portfolio/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
    );
    let sqlitePath = "";

    if (fs.existsSync(wranglerDir)) {
      const files = fs.readdirSync(wranglerDir);
      const sqlFile = files.find((f: string) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
      if (sqlFile) {
        sqlitePath = path.join(wranglerDir, sqlFile);
      }
    }

    if (!sqlitePath) {
      const localDir = path.join(workspaceRoot, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
      if (fs.existsSync(localDir)) {
        const files = fs.readdirSync(localDir);
        const sqlFile = files.find((f: string) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
        if (sqlFile) {
          sqlitePath = path.join(localDir, sqlFile);
        }
      }
    }

    if (sqlitePath) {
      const sqliteDb = new Database(sqlitePath);
      return drizzleNode(sqliteDb, { schema });
    }
  } catch (_err) {
    // Silence error for non-Node.js/unsupported environments
  }

  return null;
}
