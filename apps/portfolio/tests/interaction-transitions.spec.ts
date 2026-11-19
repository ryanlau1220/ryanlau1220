import { expect, test } from "@playwright/test";

test("theme transition updates and persists the selected theme", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
  await page.waitForTimeout(600);
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("dark snapshot remains clipped until the light theme transition finishes", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/");
  test.skip(
    !(await page.evaluate(() => typeof document.startViewTransition === "function")),
    "View transitions are not supported.",
  );
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = Reflect.apply(original, this, [keyframes, options]) as Animation;
      if (typeof options === "object" && options?.pseudoElement === "::view-transition-old(root)") {
        void animation.finished.then(() => {
          Reflect.set(
            window,
            "__completedThemeClip",
            getComputedStyle(document.documentElement, "::view-transition-old(root)").clipPath,
          );
        });
      }
      return animation;
    };
  });
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .filter({ visible: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__completedThemeClip")))
    .toMatch(/^circle\(0px/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("guestbook opens, closes with Escape, and can reopen", async ({ page }) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: /Open guestbook/ });
  const origin = await launcher.boundingBox();
  await launcher.click();
  const ripple = page.locator(".guestbook-ripple");
  await expect(ripple).toHaveCount(1);
  const rippleBounds = await ripple.boundingBox();
  expect(
    origin && rippleBounds
      ? Math.abs(origin.x + origin.width / 2 - (rippleBounds.x + rippleBounds.width / 2))
      : Infinity,
  ).toBeLessThan(2);
  expect(
    origin && rippleBounds
      ? Math.abs(origin.y + origin.height / 2 - (rippleBounds.y + rippleBounds.height / 2))
      : Infinity,
  ).toBeLessThan(2);
  const dialog = page.getByRole("dialog", { name: "Guestbook" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /close/i })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Open guestbook/ })).toBeFocused();
  await page.getByRole("button", { name: /Open guestbook/ }).click();
  await expect(dialog).toBeVisible();
});

test("rapid project navigation leaves one interactive card", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.startsWith("mobile"),
    "Desktop neighbor controls are hidden on mobile.",
  );
  await page.goto("/");
  await page.locator("#projects").scrollIntoViewIfNeeded();
  const next = page.getByRole("button", { name: "Next project", exact: true });
  for (let index = 0; index < 5; index++) await next.click({ force: true });
  await expect(page.locator(".orbit-active [inert]")).toHaveCount(0);
  await expect(page.locator(".orbit-active .project-detail-card")).toHaveCount(1);
});
