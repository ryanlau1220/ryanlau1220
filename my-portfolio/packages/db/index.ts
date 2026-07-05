import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export * from "./schema";
export { schema };

export interface D1Database {
  prepare(sql: string): unknown;
}

export type DB = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database | null | undefined): DB | null {
  if (d1 && typeof d1.prepare === "function") {
    return drizzleD1(d1, { schema });
  }

  return null;
}
