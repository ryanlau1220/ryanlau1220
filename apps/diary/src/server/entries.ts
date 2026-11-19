import { asc, desc, eq, inArray } from "drizzle-orm";
import type { DiaryEntry } from "../lib/diary";
import { getDb } from "./db";
import { entries, photos } from "./schema";

export function photoUrl(objectKey: string) {
  return `/photos/${objectKey}`;
}

type EntryRow = typeof entries.$inferSelect;
type PhotoRow = typeof photos.$inferSelect;

function toDiaryEntry(row: EntryRow, photoRows: PhotoRow[]): DiaryEntry & { updatedAt: number } {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    eventName: row.eventName,
    entryDate: row.entryDate,
    takeaways: row.takeaways,
    feeling: row.feeling,
    tags: row.tags,
    links: row.links,
    updatedAt: row.updatedAt.getTime(),
    photos: photoRows.map((photo) => ({
      id: photo.id,
      url: photoUrl(photo.objectKey),
      width: photo.width,
      height: photo.height,
      alt: photo.alt,
    })),
  };
}

/** Every entry, newest first, each with its photos in display order. */
export async function readAllEntries() {
  const db = getDb();
  const rows = await db.select().from(entries).orderBy(desc(entries.entryDate)).all();
  if (rows.length === 0) return [];
  const photoRows = await db
    .select()
    .from(photos)
    .where(
      inArray(
        photos.entryId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .all();
  return rows.map((row) =>
    toDiaryEntry(
      row,
      photoRows.filter((photo) => photo.entryId === row.id),
    ),
  );
}

export async function readEntryBySlug(slug: string) {
  const db = getDb();
  const row = await db.select().from(entries).where(eq(entries.slug, slug)).get();
  if (!row) return null;
  const photoRows = await db
    .select()
    .from(photos)
    .where(eq(photos.entryId, row.id))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .all();
  return toDiaryEntry(row, photoRows);
}
