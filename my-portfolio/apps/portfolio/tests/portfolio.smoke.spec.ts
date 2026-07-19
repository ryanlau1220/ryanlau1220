import { expect, test } from "@playwright/test";

test("serves the home page with the expected security headers", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ryan Lau Jun Hong");
});

test("opens and closes the project preview with keyboard support", async ({ page }) => {
  await page.goto("/");
  await page.locator("#projects").scrollIntoViewIfNeeded();

  await page.getByRole("button", { name: "Expand LLM-Wiki screenshot" }).click();
  const dialog = page.getByRole("dialog", { name: "LLM-Wiki product screenshot" });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Close expanded screenshot" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("opens the guestbook without requiring a submission", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Open guestbook/ }).click();
  await expect(page.getByRole("dialog", { name: "Guestbook" })).toBeVisible();
  await page.getByRole("button", { name: "Close guestbook" }).click();
  await expect(page.getByRole("dialog", { name: "Guestbook" })).toHaveCount(0);
});

test("opens mobile navigation and exposes navigation links", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile-only behaviour");
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Contact" }).last()).toBeVisible();
});
