import { expect, test } from "@playwright/test";
import { handleServerResponse } from "../src/server-response";

test("last-resort server failure returns a safe 500 response", async ({ page }) => {
  await page.route("**/recovery-test", async (route) => {
    const originalError = console.error;
    let response: Response;
    try {
      console.error = () => {};
      response = await handleServerResponse(
        new Request(route.request().url(), { headers: { accept: "text/html" } }),
        () => {
          throw new Error("Private details");
        },
      );
    } finally {
      console.error = originalError;
    }
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
  const response = await page.goto("/recovery-test");
  expect(response?.status()).toBe(500);
  await expect(page.getByRole("heading", { name: "Something went wrong." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");
  await expect(page.locator("body")).not.toContainText("Private details");
});
