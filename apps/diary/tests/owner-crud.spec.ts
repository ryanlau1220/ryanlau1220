import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type BrowserContext,
  expect,
  type Page,
  request as playwrightRequest,
  test,
} from "@playwright/test";
import { hasEmbeddedMetadata } from "../src/lib/image-safety";
import {
  BASE_URL,
  OWNER_TOKEN,
  STRANGER_TOKEN,
  sessionCookie,
  sessionCookieValue,
} from "./helpers/session";

// The owner's whole write path, driven through the real UI against the built Worker, plus the same
// write request replayed by people who must be refused. The tests share one signed-in browser and
// run in order, so they use one browser project (the flow changes data).
// Each step drives the real editor while the 3D scene renders behind it. On a machine without a GPU
// (a developer laptop's headless browser, a CI runner) that is slow, so steps get 2 minutes.
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.skip(({ isMobile }) => isMobile, "State-changing flow; the desktop run covers it.");

const run = randomUUID().slice(0, 8);
const SLUG = `e2e-owner-${run}`;
const RENAMED = `e2e-renamed-${run}`;
const INTRUDER = `e2e-intruder-${run}`;
const CONTROL = `e2e-control-${run}`;
const PHOTO_WITH_EXIF = fileURLToPath(new URL("./fixtures/with-exif.jpg", import.meta.url));

interface CapturedCall {
  url: string;
  headers: Record<string, string>;
  body: string;
}

let context: BrowserContext;
let page: Page;
const serverFnCalls: CapturedCall[] = [];
let photoPath = "";

// A visitor's view of the site: no cookies. Each call uses a fresh, short-lived client (a long-lived
// one can reuse a connection the server has already closed) and a timeout, so a stall fails fast.
async function visit(path: string) {
  const client = await playwrightRequest.newContext({ baseURL: BASE_URL });
  try {
    const response = await client.get(path, { timeout: 20_000 });
    return { status: response.status(), headers: response.headers(), body: await response.body() };
  } finally {
    await client.dispose();
  }
}

async function status(path: string) {
  return (await visit(path)).status;
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1280, height: 860 } });
  await context.addCookies([sessionCookie(OWNER_TOKEN)]);
  page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  page.on("request", (request) => {
    const body = request.postData();
    if (request.method() === "POST" && request.url().includes("_serverFn") && body) {
      serverFnCalls.push({ url: request.url(), headers: request.headers(), body });
    }
  });
});

test.afterAll(async () => {
  await context?.close();
});

test("the owner sees the writing controls", async () => {
  await page.goto("/");
  await page.waitForSelector(".loading-candle[data-done='true']", { timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Write a page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("the owner writes a page with a photo, and its location data is stripped", async () => {
  // Guard the fixture itself: it must really contain EXIF, or the stripping check proves nothing.
  expect(hasEmbeddedMetadata(new Uint8Array(readFileSync(PHOTO_WITH_EXIF)))).toBe(true);

  await page.getByRole("button", { name: "Write a page" }).click();
  const editor = page.getByRole("dialog", { name: "Write a new page" });
  await editor.getByLabel("Title", { exact: true }).fill(`E2E ${run}`);
  await editor.getByLabel("Date", { exact: true }).fill("2026-11-20");
  await editor.getByLabel("Event name", { exact: true }).fill("E2E Event");
  await editor.getByLabel(/Link name/).fill(SLUG);
  await editor.getByLabel(/Key takeaways/).fill("First lesson\n\nSecond lesson");
  await editor.getByLabel("How I felt", { exact: true }).fill("Curious");
  await editor.getByLabel(/Tags/).fill("E2E, testing, e2e");
  await editor.getByLabel(/^Links/).fill("Slides | https://example.com/slides");
  await editor.locator('input[type="file"]').setInputFiles(PHOTO_WITH_EXIF);
  await editor.getByLabel(/Describe the new photos/).fill("E2E photo");
  await editor.getByRole("button", { name: "Save page" }).click();

  // If saving fails, report what the editor said instead of a bare timeout.
  await page.waitForURL(`${BASE_URL}/${SLUG}`, { timeout: 60_000 }).catch(async (cause) => {
    const said = (await editor.getByRole("alert").allInnerTexts()).join(" | ");
    throw new Error(`Saving the page did not finish. The editor said: ${said || "(nothing)"}`, {
      cause,
    });
  });

  const article = page.locator("article");
  await expect(page.locator("#entry-title")).toHaveText(`E2E ${run}`);
  await expect(article).toContainText("Second lesson");
  await expect(article).toContainText("Curious");
  await expect(article.getByRole("link", { name: "Slides" })).toHaveAttribute(
    "href",
    "https://example.com/slides",
  );
  // Tags are normalized: lower-cased and de-duplicated.
  await expect(article.getByRole("button", { name: "#e2e" })).toHaveCount(1);

  const photo = article.locator("img").first();
  await expect(photo).toHaveAttribute("alt", "E2E photo");
  photoPath = (await photo.getAttribute("src")) ?? "";
  expect(photoPath).toMatch(/^\/photos\/entries\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);

  const stored = await visit(photoPath);
  expect(stored.status).toBe(200);
  expect(stored.headers["content-type"]).toBe("image/jpeg");
  expect(hasEmbeddedMetadata(new Uint8Array(stored.body))).toBe(false);

  // Anyone can now read the page, and it is in the feed.
  expect(await status(`/${SLUG}`)).toBe(200);
  expect((await visit("/rss.xml")).body.toString()).toContain(`/${SLUG}</link>`);
});

test("the editor rejects a duplicate link name, a reserved one, and an unsafe link", async () => {
  await page.getByRole("button", { name: "Edit page" }).click();
  const editor = page.getByRole("dialog", { name: "Edit this page" });
  const save = editor.getByRole("button", { name: "Save page" });
  const alert = editor.getByRole("alert");

  await editor.getByLabel(/Link name/).fill("placeholder-event");
  await save.click();
  await expect(alert).toContainText("already uses that link name");

  await editor.getByLabel(/Link name/).fill("login");
  await save.click();
  await expect(alert).toContainText("reserved");

  await editor.getByLabel(/Link name/).fill(SLUG);
  await editor.getByLabel(/^Links/).fill("Bad | javascript:alert(1)");
  await save.click();
  await expect(alert).toContainText("http");

  await editor.getByRole("button", { name: "Close the editor" }).click();
  await expect(editor).toHaveCount(0);
});

test("the owner renames the page and removes its photo", async () => {
  await page.getByRole("button", { name: "Edit page" }).click();
  const editor = page.getByRole("dialog", { name: "Edit this page" });
  await editor.getByLabel("Title", { exact: true }).fill(`E2E renamed ${run}`);
  await editor.getByLabel(/Link name/).fill(RENAMED);
  await editor.getByRole("button", { name: "remove" }).click();
  // Removing a photo must not close the editor or lose what was typed.
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Title", { exact: true })).toHaveValue(`E2E renamed ${run}`);
  await expect.poll(() => status(photoPath)).toBe(404);

  await editor.getByRole("button", { name: "Save page" }).click();
  await page.waitForURL(`${BASE_URL}/${RENAMED}`, { timeout: 60_000 });
  await expect(page.locator("#entry-title")).toHaveText(`E2E renamed ${run}`);
  await expect(page.locator("article img")).toHaveCount(0);
  expect(await status(`/${SLUG}`)).toBe(404);
  expect(await status(`/${RENAMED}`)).toBe(200);
});

test("the same write request is refused for a visitor and a signed-in non-owner", async () => {
  const createCall = serverFnCalls.find(
    (call) => call.body.includes(SLUG) && !call.headers["content-type"]?.includes("multipart"),
  );
  expect(createCall, "the create request captured from the UI").toBeDefined();

  // (Cross-site requests are covered in csrf-last.spec.ts, which must run after everything else.)
  const replay = async (slug: string, token: string | null, origin: string) => {
    const headers: Record<string, string> = { origin };
    for (const [name, value] of Object.entries(createCall!.headers)) {
      if (name === "content-type" || name.startsWith("x-")) headers[name] = value;
    }
    if (token) headers.cookie = `better-auth.session_token=${sessionCookieValue(token)}`;
    const client = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const response = await client.fetch(createCall!.url, {
      method: "POST",
      headers,
      data: createCall!.body.replaceAll(SLUG, slug),
      maxRedirects: 0,
    });
    const result = { status: response.status(), text: await response.text() };
    await client.dispose();
    return result;
  };

  // A visitor and a signed-in non-owner both reach the app, which refuses them with its own error.
  for (const [who, token] of [
    ["a visitor", null],
    ["a non-owner", STRANGER_TOKEN],
  ] as const) {
    const refused = await replay(INTRUDER, token, BASE_URL);
    expect(refused.text, `${who} must be refused by the app`).toContain("Not found.");
    expect(refused.text, `${who} must not receive the created page`).not.toContain('"slug"');
  }
  expect(await status(`/${INTRUDER}`), "refused requests must create nothing").toBe(404);

  // Control: the identical request from the owner on the real origin does work, so the refusals
  // above are about who sent it and not about a malformed replay.
  const allowed = await replay(CONTROL, OWNER_TOKEN, BASE_URL);
  expect(allowed.text).toContain('"slug"');
  await expect.poll(() => status(`/${CONTROL}`)).toBe(200);
});

test("the owner deletes the pages, and the original entry is untouched", async () => {
  for (const slug of [RENAMED, CONTROL]) {
    await page.goto(`/${slug}`);
    await page.getByRole("button", { name: "Tear out page" }).click();
    await page.waitForURL(`${BASE_URL}/`);
    await expect.poll(() => status(`/${slug}`)).toBe(404);
  }
  expect(await status("/placeholder-event")).toBe(200);
  const feed = (await visit("/rss.xml")).body.toString();
  expect(feed).toContain("/placeholder-event</link>");
  expect(feed).not.toContain(`e2e-`);
});
