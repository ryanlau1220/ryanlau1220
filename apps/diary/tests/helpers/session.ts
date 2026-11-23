import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

// Test identities, shared with the seed step (tests/seed-local.mjs), which inserts matching
// users, GitHub accounts, and sessions into local D1.
const identities = JSON.parse(
  readFileSync(new URL("../identities.json", import.meta.url), "utf8"),
) as Record<"owner" | "stranger", { sessionToken: string }>;
export const OWNER_TOKEN = identities.owner.sessionToken;
export const STRANGER_TOKEN = identities.stranger.sessionToken;

/** The fake settings the test server runs with, parsed from tests/test.env. */
export function readTestEnv(): Record<string, string> {
  const text = readFileSync(new URL("../test.env", import.meta.url), "utf8");
  const values: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const match = /^([A-Z_]+)="(.*)"$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

const env = readTestEnv();

/** The origin the test server runs on; also the Better Auth base URL. */
export const BASE_URL = env.BETTER_AUTH_URL;

/**
 * Better Auth stores the session token in a cookie signed with HMAC-SHA256 using the auth
 * secret: `<token>.<base64 signature>`, URL-encoded. Signing it here lets a test act as a
 * signed-in user without going through GitHub.
 */
export function sessionCookieValue(token: string) {
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET).update(token).digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

export function sessionCookie(token: string) {
  return {
    name: "better-auth.session_token",
    value: sessionCookieValue(token),
    url: BASE_URL,
    httpOnly: true,
    sameSite: "Lax" as const,
  };
}
