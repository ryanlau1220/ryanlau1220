import { expect, type Page, test } from "@playwright/test";

async function openHome(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();
}

test("serves the home page with the expected security headers", async ({ page }) => {
  const response = await page.goto("/");
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();

  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ryan Lau Jun Hong");
});

test("opens and closes the project preview with keyboard support", async ({ page }) => {
  await openHome(page);
  await page.locator("#projects").scrollIntoViewIfNeeded();

  await page.getByRole("button", { name: "Pinned", exact: true }).click();
  await page.getByRole("button", { name: "Expand APU-ASC screenshot" }).click();
  const dialog = page.locator('dialog[aria-labelledby="expanded-screenshot-title"][open]');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Close expanded screenshot", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("filters the carousel to the selected pinned projects", async ({ page }, testInfo) => {
  await openHome(page);
  await page.locator("#projects").scrollIntoViewIfNeeded();

  await page.getByRole("button", { name: "Pinned" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "APU-ASC" })).toBeVisible();
  const nextButton = testInfo.project.name.startsWith("mobile")
    ? page.getByRole("button", { name: "Next", exact: true })
    : page.getByRole("button", { name: "Next project" });
  await nextButton.click();
  await expect(page.getByRole("heading", { level: 3, name: "GammaShield" })).toBeVisible();
  await nextButton.click();
  await expect(page.getByRole("heading", { level: 3, name: "Nexus Net" })).toBeVisible();
  await nextButton.click();
  await expect(page.getByRole("heading", { level: 3, name: "PromptPlay" })).toBeVisible();
  await nextButton.click();
  await expect(page.getByRole("heading", { level: 3, name: "Grocerly" })).toBeVisible();
  await nextButton.click();
  await expect(page.getByRole("heading", { level: 3, name: "APU-ASC" })).toBeVisible();
});

test("orders projects by recency and offers the event filter", async ({ page }, testInfo) => {
  await openHome(page);
  const projects = page.locator("#projects");
  await expect(projects.getByRole("heading", { level: 3, name: "Analog Blindspot" })).toBeVisible();
  const nextButton = testInfo.project.name.startsWith("mobile")
    ? projects.getByRole("button", { name: "Next", exact: true })
    : projects.getByRole("button", { name: "Next project" });
  await nextButton.click();
  await expect(projects.getByRole("heading", { level: 3, name: "PromptPlay" })).toBeVisible();
  await projects.getByRole("button", { name: "Events", exact: true }).click();
  await expect(projects.getByRole("heading", { level: 3, name: "Analog Blindspot" })).toBeVisible();
  await expect(projects.getByRole("button", { name: "Open Source", exact: true })).toHaveCount(0);
});

test("opens the guestbook without requiring a submission", async ({ page }) => {
  await openHome(page);

  await page.getByRole("button", { name: /Open guestbook/ }).click();
  const dialog = page.locator("dialog#visitor-log[open]");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close guestbook" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open guestbook" })).toBeVisible();
});

test("renders a helpful 404 recovery page", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found." })).toBeVisible();
  await expect(page.getByAltText("Friendly Ciallo illustration")).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
});

test("renders the error boundary through the development trigger", async ({ page }) => {
  await page.goto("/?__errorBoundary=1");

  await expect(page.getByRole("heading", { level: 1, name: "A small hiccup." })).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toContainText("Ryan Lau Jun Hong");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");
  await expect(page.getByAltText("Friendly Ciallo illustration")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ryan Lau Jun Hong" })).toBeVisible();
});

test("shows recovery artwork at the same size as the 404 page on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/missing-page");
  const image = page.getByAltText("Friendly Ciallo illustration");
  const notFoundSize = await image.boundingBox();
  await page.goto("/?__errorBoundary=1");
  await expect(page.getByRole("heading", { name: "A small hiccup." })).toBeVisible();
  await expect(image).toBeVisible();
  const errorSize = await image.boundingBox();
  expect(notFoundSize).not.toBeNull();
  expect(errorSize).not.toBeNull();
  expect(errorSize?.height).toBeCloseTo(notFoundSize?.height ?? 0, 0);
  expect(errorSize?.height).toBeGreaterThan(200);
});

test("opens mobile navigation and exposes navigation links", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only behaviour");
  await openHome(page);

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await expect(
    page.locator("#mobile-navigation").getByRole("link", { name: "Contact" }),
  ).toBeVisible();
});
