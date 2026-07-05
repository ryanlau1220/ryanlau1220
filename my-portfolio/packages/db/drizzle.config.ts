import { defineConfig } from "drizzle-kit";

const url = process.env.DB_URL || "";

export default defineConfig({
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  ...(url ? { dbCredentials: { url } } : {}),
});
