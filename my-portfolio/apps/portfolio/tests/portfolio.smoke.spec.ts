import { type Page, expect, test } from "@playwright/test";

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

  await page.getByRole("button", { name: "Expand APU-ASC screenshot" }).click();
  const dialog = page.locator('dialog[aria-labelledby="expanded-screenshot-title"][open]');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Close expanded screenshot", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("filters the carousel to pinned open-source projects", async ({ page }) => {
  await openHome(page);
  await page.locator("#projects").scrollIntoViewIfNeeded();

  await page.getByRole("button", { name: "Pinned" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "APU-ASC" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next project" })).toBeVisible();
});

test("opens the guestbook without requiring a submission", async ({ page }) => {
  await openHome(page);

  await page.getByRole("button", { name: /Open guestbook/ }).click();
  const dialog = page.locator("dialog#visitor-log[open]");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close guestbook" }).click();
  await expect(dialog).toHaveCount(0);
});

test("renders a helpful 404 recovery page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");

  await expect(page.getByRole("heading", { level: 1, name: "Page not found." })).toBeVisible();
  await expect(page.getByAltText("Friendly Ciallo illustration")).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
});

test("renders the error boundary through the development trigger", async ({ page }) => {
  await page.goto("/?__errorBoundary=1");

  await expect(page.getByRole("heading", { level: 1, name: "A small hiccup." })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ryan Lau Jun Hong" })).toBeVisible();
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
