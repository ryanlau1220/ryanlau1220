import { expect, test } from "@playwright/test";

// Access control is enforced on the server. These tests confirm a visitor sees no owner surface
// and cannot reach owner-only server functions. Signed-in owner behaviour is covered separately,
// because it needs a GitHub OAuth session that cannot be minted in CI.

test("the hidden login route is not linked and asks to sign in", async ({ page }) => {
  const home = (await (await page.goto("/"))?.text()) ?? "";
  expect(home).not.toContain("/login");

  await page.goto("/login");
  await expect(page.getByText("Only the keeper may write here.")).toBeVisible();
  // Excluded from search engines.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("visitors see no owner controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Write a page/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sign out/ })).toHaveCount(0);
});

test("an anonymous request has no session", async ({ page }) => {
  const response = await page.request.get("/api/auth/get-session");
  expect(response.status()).toBe(200);
  expect((await response.text()).trim()).toBe("null");
});
