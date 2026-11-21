import { expect, test } from "@playwright/test";

const ENTRY_SLUG = "placeholder-event";
const ENTRY_TITLE = "Placeholder Event";

test("serves the home page with the expected security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  // The real page text exists for crawlers and no-WebGL visitors even behind the 3D scene.
  await expect(page.getByRole("link", { name: new RegExp(ENTRY_TITLE) })).toBeAttached();
});

test("every entry is reachable through a real link, independent of the 3D scene", async ({
  page,
}) => {
  // These anchors are always server-rendered (for crawlers, screen readers, and no-WebGL
  // clients), so following one must land on the entry's own page.
  await page.goto("/");
  const href = await page
    .getByRole("link", { name: new RegExp(ENTRY_TITLE) })
    .first()
    .getAttribute("href");
  expect(href).toBe(`/${ENTRY_SLUG}`);

  await page.goto(href!);
  await expect(page).toHaveURL(new RegExp(`/${ENTRY_SLUG}$`));
  await expect(page.getByRole("heading", { name: ENTRY_TITLE })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key takeaways" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How I felt" })).toBeVisible();
});

test("a shared entry link renders the entry server-side", async ({ page }) => {
  const response = await page.goto(`/${ENTRY_SLUG}`);
  expect(response?.status()).toBe(200);
  const html = (await response?.text()) ?? "";
  expect(html).toContain('id="entry-title"');
  expect(html).toContain(ENTRY_TITLE);
  // A canonical link and a preview-card image are present. The origin comes from SITE_URL,
  // which differs between local dev and production, so only the path is asserted here.
  expect(html).toMatch(/rel="canonical" href="https?:\/\/[^"]+\/placeholder-event"/);
  expect(html).toContain("/og?entry=placeholder-event");
});

test("an unknown entry returns a 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-entry");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("the entry photo is served from R2 as a cached image", async ({ page }) => {
  const html = (await (await page.goto(`/${ENTRY_SLUG}`))?.text()) ?? "";
  const match = html.match(/\/photos\/entries\/[^"?]+\.(?:jpg|webp)/);
  expect(match).not.toBeNull();
  const photo = await page.request.get(match![0]);
  expect(photo.status()).toBe(200);
  expect(photo.headers()["content-type"]).toMatch(/^image\//);
  expect(photo.headers()["cache-control"]).toContain("immutable");
});

test("publishes an RSS feed and a robots file", async ({ page }) => {
  const rss = await page.request.get("/rss.xml");
  expect(rss.status()).toBe(200);
  expect(rss.headers()["content-type"]).toContain("application/rss+xml");
  const feed = await rss.text();
  expect(feed).toContain("<title>Ryan's Diary</title>");
  expect(feed).toMatch(/<link>https?:\/\/[^<]+\/placeholder-event<\/link>/);

  const robots = await page.request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/Sitemap: https?:\/\/[^\s]+\/rss\.xml/);
});

test("renders a social preview card as a PNG", async ({ page }) => {
  for (const url of ["/og", `/og?entry=${ENTRY_SLUG}`]) {
    const card = await page.request.get(url);
    expect(card.status(), url).toBe(200);
    expect(card.headers()["content-type"], url).toBe("image/png");
  }
});
