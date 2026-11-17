import { describe, expect, it } from "vitest";
import { isVerifiedGuestbookHostname } from "../../src/guestbook-hostnames";

describe("Turnstile hostname validation", () => {
  const allowed = "ryanlau1220.dev,portfolio.ryanlau1220.workers.dev";

  it.each(["ryanlau1220.dev", "portfolio.ryanlau1220.workers.dev"])(
    "accepts a token for the same allowed request hostname: %s",
    (hostname) => {
      expect(isVerifiedGuestbookHostname(allowed, `https://${hostname}/`, hostname)).toBe(true);
    },
  );

  it("rejects cross-host tokens even when both hostnames are allowed", () => {
    expect(
      isVerifiedGuestbookHostname(
        allowed,
        "https://ryanlau1220.dev/",
        "portfolio.ryanlau1220.workers.dev",
      ),
    ).toBe(false);
  });

  it("fails closed for missing configuration, missing hostname, and unapproved hosts", () => {
    expect(
      isVerifiedGuestbookHostname(undefined, "https://ryanlau1220.dev/", "ryanlau1220.dev"),
    ).toBe(false);
    expect(isVerifiedGuestbookHostname(allowed, "https://ryanlau1220.dev/", undefined)).toBe(false);
    expect(isVerifiedGuestbookHostname(allowed, "https://evil.example/", "evil.example")).toBe(
      false,
    );
  });
});
