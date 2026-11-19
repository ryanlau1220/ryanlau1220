import { defineConfig } from "drizzle-kit";

// Generates SQL migrations only; Wrangler applies them to D1 (pnpm db:migrate:local / :remote).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/schema.ts",
  out: "./migrations",
});
