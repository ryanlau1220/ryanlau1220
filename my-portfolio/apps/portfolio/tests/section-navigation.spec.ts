import { expect, test } from "@playwright/test";

const sections = ["about", "skills", "projects", "timeline", "certifications", "contact", "home"];

async function expectHeadingClearOfHeader(page: import("@playwright/test").Page, section: string) {
  const heading = page.locator(`#${section}`).locator("h1, h2").first();
  await expect(heading).toBeVisible();
  await expect
    .poll(async () => {
      const [title, header] = await Promise.all([
        heading.boundingBox(),
        page.getByRole("banner").boundingBox(),
      ]);
      return title && header ? title.y - (header.y + header.height) : -1;
    })
    .toBeGreaterThanOrEqual(0);
  const box = await heading.boundingBox();
  expect(box?.y).toBeLessThan(page.viewportSize()?.height ?? 0);
}

test("header links leave every section heading below the sticky header", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();
  for (const section of sections) {
    if (testInfo.project.name.startsWith("mobile")) {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      await page.locator("#mobile-navigation").locator(`a[href="/#${section}"]`).click();
    } else {
      await page.locator("header nav").locator(`a[href="/#${section}"]`).click();
    }
    // Allow smooth scrolling and scroll-linked entrance motion to settle before measuring.
    await page.waitForTimeout(1200);
    await expectHeadingClearOfHeader(page, section);
  }
});

test("direct section links leave the heading visible", async ({ page }) => {
  await page.goto("/#projects");
  await page.waitForTimeout(1800);
  await expectHeadingClearOfHeader(page, "projects");
});
