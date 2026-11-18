import { expect, test } from "@playwright/test";

test("globe loads on demand, rotates and preserves linked skill details", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#skills");
  await expect(section.locator("canvas")).toHaveCount(0);
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("button", { name: "List View" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Graph View" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const globe = page.getByTestId("skills-globe");
  await expect(globe.locator("canvas")).toBeVisible();
  const label = globe.locator("button:visible").first();
  await expect(label).toBeVisible();
  await expect
    .poll(async () =>
      globe.evaluate((element) => {
        const center = element.getBoundingClientRect().left + element.clientWidth / 2;
        const labels = [...element.querySelectorAll("button")].filter(
          (button) => getComputedStyle(button).visibility === "visible",
        );
        return (
          labels.some(
            (button) =>
              button.getBoundingClientRect().x + button.getBoundingClientRect().width / 2 < center,
          ) &&
          labels.some(
            (button) =>
              button.getBoundingClientRect().x + button.getBoundingClientRect().width / 2 > center,
          )
        );
      }),
    )
    .toBe(true);
  const before = await label.evaluate((button) => button.style.transform);
  await expect
    .poll(async () => label.evaluate((button) => button.style.transform), { timeout: 5000 })
    .not.toBe(before);
  await section.getByLabel("Explore a domain").selectOption("Programming Languages");
  await page.waitForTimeout(1200);
  await expect
    .poll(() => globe.locator('button:visible:not([data-domain="Programming Languages"])').count())
    .toBe(0);
  const skill = globe.locator("button:visible").first();
  await expect(skill).toBeVisible();
  const skillName = ((await skill.textContent()) ?? "").trim();
  await globe.getByRole("button", { name: skillName, exact: true }).click();
  const details = page.locator(".fixed.inset-0").filter({ hasText: "Linked Projects" });
  await expect(details.getByRole("heading", { name: skillName, exact: true })).toBeVisible();
  await expect(details.getByText(/Linked Timeline/)).toBeVisible();
  await details.getByRole("button", { name: "[Clear]" }).click();
  await section.getByRole("button", { name: "List View" }).click();
  await expect(globe).toHaveCount(0);
  await expect(section.getByRole("button", { name: "TypeScript", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("domain selector supports keyboard selection", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Mobile devices use their native picker.");
  await page.goto("/");
  await page.locator("#skills").scrollIntoViewIfNeeded();
  const selector = page.getByLabel("Explore a domain");
  await selector.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(selector).toHaveValue("Programming Languages");
});

test("each domain turns the globe toward its skills", async ({ page }) => {
  await page.goto("/");
  await page.locator("#skills").scrollIntoViewIfNeeded();
  const selector = page.getByLabel("Explore a domain");
  await expect(selector.locator("option")).toHaveCount(9);
  const domains = (await selector.locator("option").allTextContents()).slice(1);
  const globe = page.getByTestId("skills-globe");
  for (const domain of domains) {
    await selector.selectOption({ label: domain });
    // Wait for the camera-facing rotation to settle before checking its result.
    await page.waitForTimeout(1200);
    await expect.poll(() => globe.locator("button:visible").count()).toBeGreaterThanOrEqual(3);
    await expect(globe.locator(`button:visible:not([data-domain="${domain}"])`)).toHaveCount(0);
  }
  await page.waitForTimeout(5000);
  await expect.poll(() => globe.locator("button:visible").count()).toBeGreaterThanOrEqual(3);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(1200);
  await expect.poll(() => globe.locator("button:visible").count()).toBeGreaterThanOrEqual(3);
});

test("shows the list fallback when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // Only disable WebGL; other canvases on the page may still use 2D rendering.
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl" || type === "webgl2") return null;
      return original.call(this, type as "2d", ...(args as []));
    } as typeof original;
  });
  await page.goto("/");
  const section = page.locator("#skills");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("The skills globe could not be displayed.")).toBeVisible();
  await section.getByRole("button", { name: "View skills list" }).click();
  await expect(section.getByRole("button", { name: "TypeScript", exact: true })).toBeVisible();
});
