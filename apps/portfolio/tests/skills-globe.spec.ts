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

test("desktop picker opens around the selected option", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Mobile devices use their native picker.");
  await page.goto("/");
  test.skip(
    !(await page.evaluate(() => CSS.supports("appearance", "base-select"))),
    "Browser uses its native picker.",
  );
  await page.locator("#skills").scrollIntoViewIfNeeded();
  const selector = page.getByLabel("Explore a domain");
  await selector.selectOption("Programming Languages");
  await selector.click();
  await page.waitForTimeout(300);
  const [trigger, selected, first] = await Promise.all([
    selector.boundingBox(),
    page.getByRole("option", { name: "Programming Languages" }).boundingBox(),
    page.getByRole("option", { name: "All domains" }).boundingBox(),
  ]);
  expect(trigger && selected && first).toBeTruthy();
  if (!trigger || !selected || !first) return;
  expect(
    Math.abs(trigger.y + trigger.height / 2 - (selected.y + selected.height / 2)),
  ).toBeLessThan(5);
  expect(first.y).toBeLessThan(trigger.y);
});

test("desktop picker distinguishes the hovered option from the current selection", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Mobile devices use their native picker.");
  await page.goto("/");
  test.skip(
    !(await page.evaluate(() => CSS.supports("appearance", "base-select"))),
    "Browser uses its native picker.",
  );
  await page.locator("#skills").scrollIntoViewIfNeeded();
  const selector = page.getByLabel("Explore a domain");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await selector.click();
    await page.waitForTimeout(250);
    const hovered = page.getByRole("option", { name: "Frontend Development" });
    await hovered.hover();
    await expect.poll(() => hovered.evaluate((element) => element.matches(":hover"))).toBe(true);
    const hoveredBackground = await hovered.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const selectedBackground = await page
      .getByRole("option", { name: "All domains" })
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(hoveredBackground).not.toBe(selectedBackground);
    await page.keyboard.press("Escape");
  }
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
