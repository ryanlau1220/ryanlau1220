#!/usr/bin/env node
// Seeds the local (Miniflare) D1 database and R2 bucket with a fixed test entry and a small
// committed image. Runs as the first half of the Playwright webServer command, before
// `wrangler dev` starts, so the two wrangler processes never initialize the same fresh local
// state at once (that race deadlocks on the SQLite lock). Independent of scripts/seed.mjs,
// which needs ImageMagick and real photos and so cannot run on a clean CI runner.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

// Fake signed-in users for the owner-access tests. The owner's GitHub ID comes from test.env, so
// the server's owner check matches; the stranger is a signed-in GitHub user who is NOT the owner.
const identities = JSON.parse(readFileSync(new URL("identities.json", import.meta.url), "utf8"));
const ownerGithubId = /^OWNER_GITHUB_ID="(.*)"$/m.exec(
  readFileSync(new URL("test.env", import.meta.url), "utf8"),
)[1];
const people = [
  { key: "owner", githubId: ownerGithubId, ...identities.owner },
  { key: "stranger", ...identities.stranger },
];
const sessionExpiry = now + 30 * 24 * 60 * 60 * 1000;
const peopleSql = people.flatMap((person) => [
  `INSERT OR REPLACE INTO user (id, name, email, email_verified, created_at, updated_at)
   VALUES (${sql(`e2e-${person.key}-user`)}, ${sql(person.name)}, ${sql(`${person.name}@example.invalid`)}, 1, ${now}, ${now});`,
  `INSERT OR REPLACE INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
   VALUES (${sql(`e2e-${person.key}-account`)}, ${sql(person.githubId)}, 'github', ${sql(`e2e-${person.key}-user`)}, ${now}, ${now});`,
  `INSERT OR REPLACE INTO session (id, expires_at, token, user_id, created_at, updated_at)
   VALUES (${sql(`e2e-${person.key}-session`)}, ${sessionExpiry}, ${sql(person.sessionToken)}, ${sql(`e2e-${person.key}-user`)}, ${now}, ${now});`,
]);

const seedSql = [
  // Pages created by earlier owner tests (their slugs start with "e2e-"), so reruns start clean.
  `DELETE FROM entries WHERE slug LIKE 'e2e-%';`,
  ...peopleSql,
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
