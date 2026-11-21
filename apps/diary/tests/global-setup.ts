import { execFileSync } from "node:child_process";

// Seeds the local D1 database and R2 bucket (via scripts/seed.mjs --local) so the built Worker
// has the placeholder entry and its photo to serve. Safe to re-run: the seed upserts by id.
export default function globalSetup() {
  execFileSync("node", ["scripts/seed.mjs", "--local"], {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: "inherit",
  });
}
