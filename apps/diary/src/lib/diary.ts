/** Shapes and validation shared by the server functions and the browser. */

export interface DiaryLink {
  label: string;
  url: string;
}

export interface DiaryPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface DiaryEntry {
  id: string;
  slug: string;
  title: string;
  eventName: string | null;
  entryDate: string;
  takeaways: string[];
  feeling: string;
  tags: string[];
  links: DiaryLink[];
  photos: DiaryPhoto[];
}

export interface EntryInput {
  slug: string;
  title: string;
  eventName: string;
  entryDate: string;
  takeaways: string[];
  feeling: string;
  tags: string[];
  links: DiaryLink[];
}

/** Paths the app owns; an entry slug may never shadow them. */
export const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "logout",
  "photos",
  "og",
  "rss",
  "rss.xml",
  "feed",
  "assets",
  "fonts",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
]);

export const LIMITS = {
  slug: 80,
  title: 120,
  eventName: 160,
  takeaway: 500,
  takeaways: 12,
  feeling: 2000,
  tag: 32,
  tags: 10,
  linkLabel: 80,
  links: 10,
  photoAlt: 200,
  photoBytes: 8 * 1024 * 1024,
} as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class EntryValidationError extends Error {}

function fail(message: string): never {
  throw new EntryValidationError(message);
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string) {
  return slug.length <= LIMITS.slug && SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function isValidDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function text(value: unknown, field: string, max: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) fail(`${field} is required.`);
  if (result.length > max) fail(`${field} must be ${max} characters or fewer.`);
  return result;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Normalizes untrusted editor input; throws EntryValidationError with a readable message. */
export function parseEntryInput(raw: unknown): EntryInput {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = text(data.title, "Title", LIMITS.title, true);
  const slug = text(data.slug, "Link name", LIMITS.slug) || slugify(title);
  if (!isValidSlug(slug)) {
    fail(
      "Link name may use lowercase letters, numbers and single hyphens, and cannot be reserved.",
    );
  }
  const entryDate = text(data.entryDate, "Date", 10, true);
  if (!isValidDate(entryDate)) fail("Date must be a real date in YYYY-MM-DD form.");

  const takeaways = list(data.takeaways)
    .map((item) => text(item, "Takeaway", LIMITS.takeaway))
    .filter(Boolean);
  if (takeaways.length > LIMITS.takeaways) fail(`Use at most ${LIMITS.takeaways} takeaways.`);

  const tags = [
    ...new Set(
      list(data.tags)
        .map((item) => text(item, "Tag", LIMITS.tag).toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (tags.length > LIMITS.tags) fail(`Use at most ${LIMITS.tags} tags.`);

  const links = list(data.links)
    .map((item) => {
      const link = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const url = text(link.url, "Link URL", 2048);
      if (!url) return null;
      if (!isSafeHttpUrl(url)) fail("Links must start with http:// or https://.");
      return {
        label: text(link.label, "Link label", LIMITS.linkLabel) || new URL(url).hostname,
        url,
      };
    })
    .filter((link): link is DiaryLink => link !== null);
  if (links.length > LIMITS.links) fail(`Use at most ${LIMITS.links} links.`);

  return {
    slug,
    title,
    eventName: text(data.eventName, "Event name", LIMITS.eventName),
    entryDate,
    takeaways,
    feeling: text(data.feeling, "Feeling", LIMITS.feeling),
    tags,
    links,
  };
}

export function chapterOf(entry: Pick<DiaryEntry, "entryDate">) {
  return entry.entryDate.slice(0, 4);
}

export function formatEntryDate(entryDate: string) {
  const [year, month, day] = entryDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Case-insensitive match against title, event, takeaways, feeling and tags. */
export function matchesQuery(entry: DiaryEntry, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [entry.title, entry.eventName ?? "", entry.feeling, ...entry.takeaways, ...entry.tags]
    .join("\n")
    .toLowerCase()
    .includes(needle);
}
