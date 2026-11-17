import { expect, test } from "@playwright/test";

test("project navigation updates the single project card and filters still work", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const gallery = page.getByRole("region", { name: "Project gallery" });
  if (testInfo.project.name.startsWith("mobile")) {
    await expect(gallery.locator(".orbit-neighbor-before")).toBeHidden();
    await expect(gallery.locator(".orbit-neighbor-after")).toBeHidden();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  } else {
    await expect(gallery.getByRole("button", { name: "Show PromptPlay" })).toBeVisible();
    await gallery.getByRole("button", { name: "Show PromptPlay" }).click();
  }
  await expect(page.getByRole("heading", { name: "PromptPlay", level: 3 })).toBeVisible();
  await expect(page.locator(".project-detail-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Pinned", exact: true }).click();
  await expect(page.getByRole("heading", { name: "APU-ASC", level: 3 })).toBeVisible();
});

test("liquid background remains active throughout the portfolio", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".liquid-background")).toHaveCSS("position", "fixed");
  await page.locator("#timeline").scrollIntoViewIfNeeded();
  await page.mouse.move(200, 200);
  await expect(page.locator(".liquid-field")).toHaveCSS("animation-name", "liquid-drift");
  await expect(page.locator(".liquid-background")).toBeAttached();
});

test("mouse wheel advances the project card", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Desktop wheel interaction");
  await page.goto("/");
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();
  const gallery = page.getByRole("region", { name: "Project gallery" });
  await gallery.scrollIntoViewIfNeeded();
  await gallery.hover();
  await page.mouse.wheel(0, 180);
  await expect(page.getByRole("heading", { name: "PromptPlay", level: 3 })).toBeVisible();
});

test("a horizontal swipe advances the project card on mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile touch interaction");
  await page.goto("/");
  const gallery = page.getByRole("region", { name: "Project gallery" });
  await gallery.scrollIntoViewIfNeeded();
  await gallery.evaluate((element) => {
    const start = new Touch({ identifier: 1, target: element, clientX: 280, clientY: 350 });
    const end = new Touch({ identifier: 1, target: element, clientX: 100, clientY: 350 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }));
  });
  await expect(page.getByRole("heading", { name: "PromptPlay", level: 3 })).toBeVisible();
});

test("neighbor previews load for projects with generated images and show a fallback when absent", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Uses desktop carousel controls");
  await page.goto("/");
  const next = page.getByRole("button", { name: "Next project", exact: true });
  for (let index = 0; index < 9; index += 1) await next.click();
  await expect(page.getByRole("heading", { name: "OpenChain", level: 3 })).toBeVisible();
  const ledgerPreview = page.getByRole("button", { name: "Show LedgerTrace" }).locator("img");
  await expect(ledgerPreview).toHaveAttribute("src", "/projects/aimarathon/preview.webp");
  await expect
    .poll(() => ledgerPreview.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await next.click();
  const wikiPreview = page.getByRole("button", { name: "Show LLM-Wiki" }).locator("img");
  await expect(wikiPreview).toHaveAttribute("src", "/projects/llmwiki/preview.webp");
  await expect
    .poll(() => wikiPreview.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Go to slide 1", exact: true }).click();
  await page.getByRole("button", { name: "Previous project", exact: true }).click();
  await page.getByRole("button", { name: "Previous project", exact: true }).click();
  await expect(page.getByRole("button", { name: "Show KrypitalX" })).toContainText("K");
});

test("vertical wheel scrolling moves the page on a narrow viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Uses a mouse at mobile viewport width");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator('[data-app-ready="true"]')).toBeVisible();
  const gallery = page.getByRole("region", { name: "Project gallery" });
  await gallery.scrollIntoViewIfNeeded();
  await gallery.hover();
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await expect(page.getByRole("heading", { name: "Analog Blindspot", level: 3 })).toBeVisible();
});

test("a vertical touch gesture does not change the project", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "Mobile touch interaction");
  await page.goto("/");
  const gallery = page.getByRole("region", { name: "Project gallery" });
  await gallery.scrollIntoViewIfNeeded();
  await gallery.evaluate((element) => {
    const start = new Touch({ identifier: 1, target: element, clientX: 150, clientY: 450 });
    const end = new Touch({ identifier: 1, target: element, clientX: 158, clientY: 200 });
    element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start] }));
    element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [end] }));
  });
  await expect(page.getByRole("heading", { name: "Analog Blindspot", level: 3 })).toBeVisible();
});
