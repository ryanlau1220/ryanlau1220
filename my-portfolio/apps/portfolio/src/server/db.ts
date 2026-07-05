import { createDb } from "@portfolio/db";
import type { D1Database, DB } from "@portfolio/db";

// @ts-expect-error - "cloudflare:workers" is a runtime module provided by the
// Cloudflare Vite Plugin (dev, runs SSR in Miniflare) and by the Workers runtime (prod)
// eslint-disable-next-line import/no-unresolved
import { env } from "cloudflare:workers";

let cachedDb: DB | null | undefined;

export async function getDb(): Promise<DB | null> {
  if (cachedDb !== undefined) return cachedDb;

  try {
    const d1 = env.DB as D1Database | undefined;
    if (!d1 || typeof d1.prepare !== "function") {
      console.error("D1 binding 'DB' not available via cloudflare:workers");
      cachedDb = null;
      return null;
    }
    cachedDb = createDb(d1);
    return cachedDb;
  } catch (e) {
    console.error("Failed to access D1 database via cloudflare:workers:", e);
    cachedDb = null;
    return null;
  }
}
