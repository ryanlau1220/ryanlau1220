import { expect, test } from "@playwright/test";

test("credential cards reveal the correct links and start balanced", async ({ page }, testInfo) => {
  await page.goto("/");
  const section = page.locator("#certifications");
  const cards = section.locator("article");
  const collection = cards.nth(0).getByRole("link", { name: /All Credentials/ });
  await expect(collection).toHaveAttribute(
    "href",
    "https://drive.google.com/drive/folders/1yL_hl6eykQmJX-as3KJKMA0w7seN5c_L?usp=sharing",
  );
  const profiles = cards.nth(1).locator("summary");
  const verifiable = cards.nth(2).locator("summary");
  await expect(cards.nth(1).locator("details")).not.toHaveAttribute("open", "");
  await expect(cards.nth(2).locator("details")).not.toHaveAttribute("open", "");
  if (!testInfo.project.name.includes("mobile")) {
    const heights = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  }
  await profiles.focus();
  await page.keyboard.press("Enter");
  await expect(cards.nth(1).locator("details")).toHaveAttribute("open", "");
  for (const [label, href] of [
    ["Google Developer", "https://g.dev/ryanlau1220"],
    ["AWS Skill Builder", "https://skillsprofile.skillbuilder.aws/user/ryanlau1220"],
    ["Devfolio", "https://devfolio.co/@ryanlau1220"],
  ]) {
    await expect(cards.nth(1).getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "href",
      href,
    );
  }
  await verifiable.click();
  for (const [label, href] of [
    ["Credly", "https://www.credly.com/users/ryanlau1220"],
    ["Credential.net", "https://www.credential.net/profile/ryanlau1220/wallet"],
  ]) {
    await expect(cards.nth(2).getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "href",
      href,
    );
  }
  await expect(cards.nth(1).locator("details")).toHaveAttribute("open", "");
  for (const logo of await section.locator("img").all()) {
    await expect
      .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
  }
  await profiles.click();
  await expect(cards.nth(1).locator("details")).not.toHaveAttribute("open", "");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
