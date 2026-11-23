import { expect, test } from "@playwright/test";
import { BASE_URL, STRANGER_TOKEN, sessionCookie } from "./helpers/session";

// Access control is enforced on the server. The test server runs with fake-but-valid auth settings
// (tests/test.env), so these checks cover the real sign-in wiring without needing GitHub.
// Owner behaviour (create, edit, delete) is covered in owner-crud.spec.ts.

test("the hidden login route is not linked, offers GitHub sign-in, and is excluded from search", async ({
  page,
}) => {
  const home = (await (await page.goto("/"))?.text()) ?? "";
  expect(home).not.toContain("/login");

  await page.goto("/login");
  await expect(page.getByText("Only the keeper may write here.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("visitors see no owner controls", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".loading-candle[data-done='true']");
  await expect(page.getByRole("button", { name: /Write a page/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sign out/ })).toHaveCount(0);
});

test("an anonymous request has no session", async ({ page }) => {
  const response = await page.request.get("/api/auth/get-session");
  expect(response.status()).toBe(200);
  expect((await response.text()).trim()).toBe("null");
});

test("sign-in sends the browser to GitHub with the right app and callback", async ({ page }) => {
  const response = await page.request.post("/api/auth/sign-in/social", {
    data: { provider: "github", callbackURL: "/" },
    headers: { origin: BASE_URL },
  });
  expect(response.status()).toBe(200);
  const { url } = (await response.json()) as { url: string };
  const authorize = new URL(url);
  expect(authorize.origin).toBe("https://github.com");
  expect(authorize.pathname).toBe("/login/oauth/authorize");
  expect(authorize.searchParams.get("client_id")).toBe("playwright-test-client-id");
  expect(authorize.searchParams.get("redirect_uri")).toBe(`${BASE_URL}/api/auth/callback/github`);
  // A random per-attempt state guards the callback against forgery.
  expect(authorize.searchParams.get("state")?.length).toBeGreaterThan(10);
});

test("a forged OAuth callback is rejected and creates no session", async ({ page }) => {
  const forged = await page.request.get("/api/auth/callback/github?code=forged&state=forged", {
    maxRedirects: 0,
  });
  expect(forged.status()).toBe(302);
  expect(forged.headers().location).toContain("error=state_mismatch");

  const session = await page.request.get("/api/auth/get-session");
  expect((await session.text()).trim()).toBe("null");
});

test("a signed-in GitHub user who is not the owner sees no owner controls", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL });
  await context.addCookies([sessionCookie(STRANGER_TOKEN)]);
  const page = await context.newPage();

  // The session is real (the server accepts it) but belongs to someone else.
  const session = await page.request.get("/api/auth/get-session");
  expect(((await session.json()) as { user?: { name?: string } } | null)?.user?.name).toBe(
    "e2e-stranger",
  );

  await page.goto("/");
  await page.waitForSelector(".loading-candle[data-done='true']");
  await expect(page.getByRole("button", { name: /Write a page|Sign out/ })).toHaveCount(0);

  await page.goto("/placeholder-event");
  await expect(page.getByRole("heading", { name: "Placeholder Event" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Edit page|Tear out page/ })).toHaveCount(0);
  await context.close();
});
