import { expect, test } from "@playwright/test";
import { OWNER_TOKEN, sessionCookieValue } from "./helpers/session";

// The framework (TanStack Start) turns away cross-site write requests before they reach the app:
// this is what stops another website from making a signed-in owner's browser write to the diary.
// It is a framework default, not code we wrote, so this guards against an upgrade ever changing it.
//
// This file runs in its own project, after every other test (see playwright.config.ts). On the
// local `wrangler dev` server the request that follows a cross-site rejection can stall; that was
// not seen on the live site (0 of 40), but it would break whichever test happened to go next.
test("a cross-site write is rejected even with the owner's valid session", async ({ request }) => {
  const response = await request.post(`/_serverFn/${"ab".repeat(32)}`, {
    headers: {
      // What a browser sends when another site makes the request.
      origin: "https://evil.example",
      "sec-fetch-site": "cross-site",
      "content-type": "application/json",
      cookie: `better-auth.session_token=${sessionCookieValue(OWNER_TOKEN)}`,
    },
    data: { title: "written from another site" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(403);
  expect(await response.text()).toBe("Forbidden");
});
