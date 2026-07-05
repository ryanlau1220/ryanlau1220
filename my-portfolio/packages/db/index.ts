import { createRequire } from "node:module";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export * from "./schema";

export interface D1Database {
  prepare(sql: string): unknown;
}

export type DB = DrizzleD1Database<typeof schema> | BetterSQLite3Database<typeof schema>;

export function createDb(d1: D1Database | null | undefined): DB | null {
  if (d1 && typeof d1.prepare === "function") {
    return drizzleD1(d1, { schema }) as unknown as DB;
  }

  try {
    // Dynamic CJS require to hide Node modules from Vite compile-time static analysis
    const req = createRequire(import.meta.url);
    if (req) {
      const Database = req("better-sqlite3");
      const { drizzle: drizzleNode } = req("drizzle-orm/better-sqlite3");
      const path = req("node:path");
      const fs = req("node:fs");

      const workspaceRoot = typeof process !== "undefined" ? process.cwd() : "";
      if (workspaceRoot) {
        // Look up local SQLite file under apps/portfolio or workspace root
        const wranglerDir = path.join(
          workspaceRoot,
          "apps/portfolio/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
        );
        let sqlitePath = "";

        if (fs.existsSync(wranglerDir)) {
          const files = fs.readdirSync(wranglerDir);
          const sqlFile = files.find(
            (f: string) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
          );
          if (sqlFile) {
            sqlitePath = path.join(wranglerDir, sqlFile);
          }
        }

        if (!sqlitePath) {
          const localDir = path.join(
            workspaceRoot,
            ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
          );
          if (fs.existsSync(localDir)) {
            const files = fs.readdirSync(localDir);
            const sqlFile = files.find(
              (f: string) => f.endsWith(".sqlite") && f !== "metadata.sqlite",
            );
            if (sqlFile) {
              sqlitePath = path.join(localDir, sqlFile);
            }
          }
        }

        if (sqlitePath) {
          const sqliteDb = new Database(sqlitePath);
          return drizzleNode(sqliteDb, { schema }) as unknown as DB;
        }
      }
    }
  } catch (_err) {
    // Silence error for non-Node.js/unsupported environments
  }

  return null;
}
