import { createDb } from "@portfolio/db";
import type { D1Database } from "@portfolio/db";
import { getEvent } from "vinxi/http";

export function getDb() {
  let d1: D1Database | null = null;
  try {
    const event = getEvent();
    d1 = event.context.cloudflare?.env?.DB;
  } catch (_e: unknown) {
    // Silent catch (runs outside of an active HTTP request scope)
  }
  return createDb(d1);
}
