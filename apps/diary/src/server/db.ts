import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "./schema";

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
  return drizzle(env.DIARY_DB, { schema });
}

export function getDb() {
  database ??= createDatabase();
  return database;
}
