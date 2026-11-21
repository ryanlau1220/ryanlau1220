#!/usr/bin/env node
// Seeds the local (Miniflare) D1 database and R2 bucket with a fixed test entry and a small
// committed image. Runs as the first half of the Playwright webServer command, before
// `wrangler dev` starts, so the two wrangler processes never initialize the same fresh local
// state at once (that race deadlocks on the SQLite lock). Independent of scripts/seed.mjs,
// which needs ImageMagick and real photos and so cannot run on a clean CI runner.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ENTRY_ID = "7a3c9e10-4b2d-4f6e-8a51-0c9d2e7b2026";
const PHOTO_ID = "c41f8b72-9e3a-4d15-b6a0-2e8f7d1c2026";
const OBJECT_KEY = `entries/${ENTRY_ID}/${PHOTO_ID}.jpg`;

function wrangler(args) {
  execFileSync("pnpm", ["exec", "wrangler", ...args], { cwd: root, stdio: "inherit" });
}

const sql = (value) => `'${value.replace(/'/g, "''")}'`;
const now = Date.now();

const seedSql = [
  `DELETE FROM photos WHERE entry_id = ${sql(ENTRY_ID)};`,
  `INSERT INTO entries (id, slug, title, event_name, entry_date, takeaways, feeling, tags, links, created_at, updated_at)
   VALUES (${sql(ENTRY_ID)}, 'placeholder-event', 'Placeholder Event', 'Placeholder Event', '2026-11-18',
     ${sql(JSON.stringify(["First takeaway", "Second takeaway"]))}, 'A calm evening.',
     ${sql(JSON.stringify(["placeholder"]))}, '[]', ${now}, ${now})
   ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title,
     event_name = excluded.event_name, entry_date = excluded.entry_date,
     takeaways = excluded.takeaways, feeling = excluded.feeling, tags = excluded.tags,
     links = excluded.links, updated_at = excluded.updated_at;`,
  `INSERT INTO photos (id, entry_id, object_key, width, height, alt, sort_order, created_at)
   VALUES (${sql(PHOTO_ID)}, ${sql(ENTRY_ID)}, ${sql(OBJECT_KEY)}, 1200, 630, 'Sample image', 0, ${now})
   ON CONFLICT(id) DO UPDATE SET object_key = excluded.object_key;`,
].join("\n");

wrangler(["d1", "migrations", "apply", "DIARY_DB", "--local"]);
wrangler(["d1", "execute", "DIARY_DB", "--local", "-y", "--command", seedSql]);
wrangler([
  "r2",
  "object",
  "put",
  `diary-photos/${OBJECT_KEY}`,
  "--file",
  "tests/fixtures/sample.jpg",
  "--content-type",
  "image/jpeg",
  "--local",
]);
