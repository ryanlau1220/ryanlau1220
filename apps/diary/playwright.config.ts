import { defineConfig, devices } from "@playwright/test";
import { readTestEnv } from "./tests/helpers/session";

// Worker variables for the test server, from tests/test.env. They go in as `--var` flags: that is
// what sets Worker variables (`--env-file` would only configure wrangler itself), and they take
// precedence over any real .dev.vars on a developer's machine, so tests behave the same everywhere.
const workerVars = Object.entries(readTestEnv())
  .map(([name, value]) => `--var '${name}:${value}'`)
  .join(" ");

// The built Worker runs on local (Miniflare) D1 and R2. tests/seed-local.mjs seeds that local state
// (one entry and its photo, plus fake signed-in users) before the server starts, so a fresh CI
// checkout has data to render. The server reads the same state through --persist-to.
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  // The 3D scene renders in software on machines without a GPU, which slows every interaction.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /csrf-last\.spec\.ts/ },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
      testIgnore: /csrf-last\.spec\.ts/,
    },
    {
      // Runs only after both projects above have finished (see tests/csrf-last.spec.ts for why).
      name: "csrf-last",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /csrf-last\.spec\.ts/,
      dependencies: ["chromium", "mobile-chromium"],
    },
  ],
  webServer: {
    // Seed first, then start the server in the same shell. Playwright runs webServer and any
    // globalSetup concurrently, and two wrangler processes initializing fresh local state at
    // once deadlock on the SQLite lock — so the seed must finish before `wrangler dev` starts.
    command: `node tests/seed-local.mjs && pnpm exec wrangler dev --config dist/server/wrangler.json --persist-to .wrangler/state ${workerVars} --local --ip 127.0.0.1 --port 3101 --inspector-port 9232 --log-level warn`,
    url: "http://127.0.0.1:3101",
    // Never reuse a running server: the owner tests need this exact test.env configuration.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
