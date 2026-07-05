import { createDb } from "@portfolio/db";
import { getEvent } from "vinxi/http";

export function getDb() {
  let d1: any = null;
  try {
    const event = getEvent();
    d1 = event.context.cloudflare?.env?.DB;
  } catch (_e) {
    // Silent catch (runs outside of an active HTTP request scope)
  }
  return createDb(d1);
}
