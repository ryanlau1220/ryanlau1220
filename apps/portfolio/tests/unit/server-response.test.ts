import { afterEach, describe, expect, it, vi } from "vitest";
import { handleServerResponse } from "../../src/server-response";

afterEach(() => vi.restoreAllMocks());

describe("server response handling", () => {
  it.each([200, 400, 403, 404, 429, 500, 503])(
    "preserves an existing %i response and adds security headers",
    async (status) => {
      const response = await handleServerResponse(
        new Request("https://example.com/"),
        async () => new Response("original response", { status }),
      );
      expect(response.status).toBe(status);
      expect(await response.text()).toBe("original response");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    },
  );

  it("preserves a deliberately thrown HTTP response", async () => {
    const response = await handleServerResponse(new Request("https://example.com/"), () => {
      throw new Response("Forbidden", { status: 403 });
    });
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns a safe HTML 500 page when a page request throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("private details");
    const response = await handleServerResponse(
      new Request("https://example.com/", { headers: { accept: "text/html" } }),
      async () => {
        throw error;
      },
    );
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toBeTruthy();
    const body = await response.text();
    expect(body).toContain("Something went wrong");
    expect(body).toContain('href="/favicon.svg"');
    expect(body).toContain('href="/"');
    expect(body).not.toContain("private details");
    expect(log).toHaveBeenCalledWith("Unhandled portfolio request error", error);
  });

  it("returns a plain response for non-page requests, and no body for HEAD", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fail = async (): Promise<Response> => {
      throw new Error("failure");
    };
    const response = await handleServerResponse(new Request("https://example.com/api"), fail);
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const head = await handleServerResponse(
      new Request("https://example.com/", { method: "HEAD" }),
      fail,
    );
    expect(head.status).toBe(500);
    expect(await head.text()).toBe("");
  });
});
