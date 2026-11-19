#!/usr/bin/env node
/**
 * Seeds the first diary entry into D1 and its photo into R2.
 *
 *   pnpm seed:local    # Miniflare state used by `pnpm dev`
 *   pnpm seed:remote   # the real Cloudflare D1 database and R2 bucket
 *
 * The original photo in seed-photos/ is never uploaded or committed. ImageMagick re-encodes it
 * with every metadata block stripped (EXIF, GPS, camera model) and the long edge capped at 2000px.
 * Re-running is safe: rows are upserted by fixed IDs.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv.includes("--remote") ? "--remote" : "--local";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, ".seed-output");
mkdirSync(output, { recursive: true });

const ENTRY = {
  id: "5b1f5f0e-8f4a-4c3e-9d65-2f7a1c0d2026",
  slug: "road-to-devfest-cloud-kl",
  title: "Antigravity & Local LLMs",
  eventName: "Road to DevFest Cloud KL 2026 #2 · GDG Cloud KL",
  entryDate: "2026-11-18",
  takeaways: [
    "(Placeholder) Write your first key takeaway from the Antigravity talk here.",
    "(Placeholder) Write a takeaway from “Local Hosting Models 101” here.",
    "(Placeholder) Add anything else worth remembering.",
  ],
  feeling: "(Placeholder) Write how the evening felt for you here.",
  tags: ["gdg", "devfest", "local-llms", "ai"],
  links: [
    {
      label: "Event page",
      url: "https://gdg.community.dev/events/details/google-gdg-cloud-kl-presents-road-to-devfest-cloud-kl-2026-2-antigravity-amp-local-llms/",
    },
  ],
};

const PHOTOS = [
  {
    id: "9c2e6a41-3d7b-4f0a-8e21-6b5d4c3a2026",
    source: "roadtodevfest-1.jpg",
    alt: "A speaker presents the slide “Local AI is 7 layers, and every tool hides some of them” to the audience in an auditorium.",
  },
];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    ...options,
  });
}

const sql = (value) => `'${String(value).replace(/'/g, "''")}'`;

console.log(`Applying migrations (${target})…`);
run("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", "DIARY_DB", target], {
  stdio: "inherit",
});

const now = Date.now();
const statements = [
  `INSERT INTO entries (id, slug, title, event_name, entry_date, takeaways, feeling, tags, links, created_at, updated_at)
   VALUES (${[ENTRY.id, ENTRY.slug, ENTRY.title, ENTRY.eventName, ENTRY.entryDate, JSON.stringify(ENTRY.takeaways), ENTRY.feeling, JSON.stringify(ENTRY.tags), JSON.stringify(ENTRY.links)].map(sql).join(", ")}, ${now}, ${now})
   ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, event_name = excluded.event_name,
     entry_date = excluded.entry_date, takeaways = excluded.takeaways, feeling = excluded.feeling,
     tags = excluded.tags, links = excluded.links, updated_at = excluded.updated_at;`,
];

for (const [index, photo] of PHOTOS.entries()) {
  const processed = join(output, `${photo.id}.jpg`);
  run("magick", [
    join(root, "seed-photos", photo.source),
    "-auto-orient",
    "-resize",
    "2000x2000>",
    "-strip",
    "-sampling-factor",
    "4:2:0",
    "-quality",
    "86",
    "-interlace",
    "JPEG",
    processed,
  ]);
  const [width, height] = run("magick", ["identify", "-format", "%w %h", processed])
    .trim()
    .split(" ")
    .map(Number);
  const metadata = run("magick", ["identify", "-format", "%[EXIF:*]", processed]).trim();
  if (metadata) throw new Error(`Metadata survived processing for ${photo.source}`);

  const objectKey = `entries/${ENTRY.id}/${photo.id}.jpg`;
  console.log(`Uploading ${photo.source} → ${objectKey} (${width}×${height}, metadata stripped)…`);
  run(
    "pnpm",
    [
      "exec",
      "wrangler",
      "r2",
      "object",
      "put",
      `diary-photos/${objectKey}`,
      "--file",
      processed,
      "--content-type",
      "image/jpeg",
      "--cache-control",
      "public, max-age=31536000, immutable",
      target,
    ],
    { stdio: "inherit" },
  );
  statements.push(
    `INSERT INTO photos (id, entry_id, object_key, width, height, alt, sort_order, created_at)
     VALUES (${[photo.id, ENTRY.id, objectKey].map(sql).join(", ")}, ${width}, ${height}, ${sql(photo.alt)}, ${index}, ${now})
     ON CONFLICT(id) DO UPDATE SET object_key = excluded.object_key, width = excluded.width,
       height = excluded.height, alt = excluded.alt, sort_order = excluded.sort_order;`,
  );
}

const seedFile = join(output, "seed.sql");
writeFileSync(seedFile, statements.join("\n"));
console.log(`Writing entry rows (${target})…`);
run("pnpm", ["exec", "wrangler", "d1", "execute", "DIARY_DB", target, "--file", seedFile, "-y"], {
  stdio: "inherit",
});
console.log(`Seeded “${ENTRY.title}” at /${ENTRY.slug}.`);
