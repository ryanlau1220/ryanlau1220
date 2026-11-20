import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, max, ne } from "drizzle-orm";
import { type DiaryEntry, EntryValidationError, LIMITS, parseEntryInput } from "./lib/diary";
import { detectPhotoFormat, hasEmbeddedMetadata } from "./lib/image-safety";
import { siteOrigin } from "./lib/seo";
import { getAuth, isAuthConfigured, isOwnerRequest } from "./server/auth";
import { getDb } from "./server/db";
import { readAllEntries, readEntryBySlug } from "./server/entries";
import { entries, photos } from "./server/schema";

export interface DiaryViewer {
  isOwner: boolean;
}

function assertSameOrigin() {
  const request = getRequest();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new Error("Requests must come from this site.");
  }
}

async function requireOwner() {
  assertSameOrigin();
  if (!(await isOwnerRequest(getRequestHeaders()))) throw new Error("Not found.");
}

function readableError(error: unknown): never {
  if (error instanceof EntryValidationError) throw new Error(error.message);
  const message = error instanceof Error ? error.message : "";
  if (/UNIQUE constraint failed: entries\.slug/i.test(message)) {
    throw new Error("Another entry already uses that link name.");
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export const loadDiary = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ entries: DiaryEntry[]; viewer: DiaryViewer }> => {
    const [allEntries, isOwner] = await Promise.all([
      readAllEntries(),
      isOwnerRequest(getRequestHeaders()),
    ]);
    return { entries: allEntries, viewer: { isOwner } };
  },
);

export const loadAnalyticsToken = createServerFn({ method: "GET" }).handler(
  () => env.CF_ANALYTICS_TOKEN?.trim() || null,
);

export const loadSiteUrl = createServerFn({ method: "GET" }).handler(() =>
  siteOrigin(env.SITE_URL, getRequest().url),
);

export const loadEntryMeta = createServerFn({ method: "GET" })
  .validator((slug: string) => String(slug).slice(0, LIMITS.slug))
  .handler(async ({ data: slug }) => {
    const entry = await readEntryBySlug(slug);
    if (!entry) return null;
    return {
      siteUrl: siteOrigin(env.SITE_URL, getRequest().url),
      slug: entry.slug,
      title: entry.title,
      eventName: entry.eventName,
      entryDate: entry.entryDate,
      feeling: entry.feeling,
      takeaways: entry.takeaways,
      updatedAt: entry.updatedAt,
    };
  });

export const loadLoginState = createServerFn({ method: "GET" }).handler(async () => ({
  configured: isAuthConfigured(),
  isOwner: await isOwnerRequest(getRequestHeaders()),
}));

// ---------------------------------------------------------------------------
// Owner-only writes
// ---------------------------------------------------------------------------

export const createEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
    await requireOwner();
    try {
      const input = parseEntryInput(data);
      const now = new Date();
      const id = crypto.randomUUID();
      await getDb()
        .insert(entries)
        .values({
          id,
          ...input,
          eventName: input.eventName || null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      return { id, slug: input.slug };
    } catch (error) {
      readableError(error);
    }
  });

export const updateEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as { id?: unknown } & Record<string, unknown>)
  .handler(async ({ data }) => {
    await requireOwner();
    const id = typeof data.id === "string" ? data.id : "";
    try {
      const input = parseEntryInput(data);
      const db = getDb();
      const clash = await db
        .select({ id: entries.id })
        .from(entries)
        .where(and(eq(entries.slug, input.slug), ne(entries.id, id)))
        .get();
      if (clash) throw new Error("Another entry already uses that link name.");
      const result = await db
        .update(entries)
        .set({ ...input, eventName: input.eventName || null, updatedAt: new Date() })
        .where(eq(entries.id, id))
        .returning({ id: entries.id })
        .all();
      if (result.length === 0) throw new Error("That entry no longer exists.");
      return { id, slug: input.slug };
    } catch (error) {
      readableError(error);
    }
  });

export const deleteEntry = createServerFn({ method: "POST" })
  .validator((id: unknown) => String(id))
  .handler(async ({ data: id }) => {
    await requireOwner();
    const db = getDb();
    const owned = await db
      .select({ objectKey: photos.objectKey })
      .from(photos)
      .where(eq(photos.entryId, id))
      .all();
    await db.delete(entries).where(eq(entries.id, id)).run();
    if (owned.length > 0) await env.PHOTOS.delete(owned.map((photo) => photo.objectKey));
    return { ok: true };
  });

export const uploadPhoto = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected form data.");
    return data;
  })
  .handler(async ({ data }) => {
    await requireOwner();
    const entryId = String(data.get("entryId") ?? "");
    const alt = String(data.get("alt") ?? "")
      .trim()
      .slice(0, LIMITS.photoAlt);
    const width = Number(data.get("width"));
    const height = Number(data.get("height"));
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Choose a photo to upload.");
    if (file.size > LIMITS.photoBytes) throw new Error("Photos must be 8 MB or smaller.");
    if (!(Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0)) {
      throw new Error("Photo size is missing.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = detectPhotoFormat(bytes);
    if (!format) throw new Error("Photos must be JPEG or WebP.");
    if (hasEmbeddedMetadata(bytes)) {
      throw new Error("This photo still contains metadata. Re-export it without location data.");
    }

    const db = getDb();
    const entry = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.id, entryId))
      .get();
    if (!entry) throw new Error("That entry no longer exists.");

    const id = crypto.randomUUID();
    const objectKey = `entries/${entryId}/${id}.${format === "jpeg" ? "jpg" : "webp"}`;
    await env.PHOTOS.put(objectKey, bytes, {
      httpMetadata: {
        contentType: `image/${format}`,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    const last = await db
      .select({ value: max(photos.sortOrder) })
      .from(photos)
      .where(eq(photos.entryId, entryId))
      .get();
    await db
      .insert(photos)
      .values({ id, entryId, objectKey, width, height, alt, sortOrder: (last?.value ?? -1) + 1 })
      .run();
    await db.update(entries).set({ updatedAt: new Date() }).where(eq(entries.id, entryId)).run();
    return { id };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .validator((id: unknown) => String(id))
  .handler(async ({ data: id }) => {
    await requireOwner();
    const db = getDb();
    const photo = await db.select().from(photos).where(eq(photos.id, id)).get();
    if (!photo) return { ok: true };
    await db.delete(photos).where(eq(photos.id, id)).run();
    await env.PHOTOS.delete(photo.objectKey);
    await db
      .update(entries)
      .set({ updatedAt: new Date() })
      .where(eq(entries.id, photo.entryId))
      .run();
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  assertSameOrigin();
  await getAuth().api.signOut({ headers: getRequestHeaders() });
  return { ok: true };
});
