import { createDb } from "@portfolio/db";
import { getEvent } from "vinxi/http";

export function getDb() {
  try {
    const event = getEvent();
    const d1 = event.context.cloudflare?.env?.DB;
    if (d1) {
      return createDb(d1);
    }
  } catch (_e) {
    // Not in HTTP request context (e.g. static build check)
  }
  return null;
}
