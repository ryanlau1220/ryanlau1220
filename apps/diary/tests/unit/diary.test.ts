import { describe, expect, it } from "vitest";
import {
  type DiaryEntry,
  EntryValidationError,
  isValidDate,
  isValidSlug,
  matchesQuery,
  parseEntryInput,
  slugify,
} from "../../src/lib/diary";

const valid = { title: "Road to DevFest Cloud KL", entryDate: "2026-11-18" };

describe("entry slugs", () => {
  it("derives a readable slug from the title", () => {
    expect(slugify("Road to DevFest Cloud KL 2026 #2: Antigravity & Local LLMs")).toBe(
      "road-to-devfest-cloud-kl-2026-2-antigravity-local-llms",
    );
    expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu");
  });

  it("rejects slugs that would shadow app routes", () => {
    for (const slug of ["login", "api", "photos", "og", "rss.xml"]) {
      expect(isValidSlug(slug)).toBe(false);
    }
    expect(isValidSlug("road-to-devfest-cloud-kl")).toBe(true);
    expect(isValidSlug("Bad Slug")).toBe(false);
    expect(isValidSlug("double--hyphen")).toBe(false);
  });
});

describe("entry input", () => {
  it("normalizes tags, takeaways and links", () => {
    const input = parseEntryInput({
      ...valid,
      takeaways: ["  First  ", "", "Second"],
      tags: ["GDG", "gdg", " AI "],
      links: [
        { label: "", url: "https://gdg.community.dev/events/x" },
        { label: "x", url: "" },
      ],
    });
    expect(input.slug).toBe("road-to-devfest-cloud-kl");
    expect(input.takeaways).toEqual(["First", "Second"]);
    expect(input.tags).toEqual(["gdg", "ai"]);
    expect(input.links).toEqual([
      { label: "gdg.community.dev", url: "https://gdg.community.dev/events/x" },
    ]);
  });

  it("refuses unsafe links and impossible dates", () => {
    expect(() => parseEntryInput({ ...valid, links: [{ url: "javascript:alert(1)" }] })).toThrow(
      EntryValidationError,
    );
    expect(() => parseEntryInput({ ...valid, entryDate: "2026-02-30" })).toThrow(
      EntryValidationError,
    );
    expect(() => parseEntryInput({ ...valid, title: "  " })).toThrow(EntryValidationError);
    expect(() => parseEntryInput({ ...valid, slug: "login" })).toThrow(EntryValidationError);
    expect(isValidDate("2028-02-29")).toBe(true);
  });
});

describe("search", () => {
  const entry: DiaryEntry = {
    id: "1",
    slug: "a",
    title: "Antigravity & Local LLMs",
    eventName: "Road to DevFest",
    entryDate: "2026-11-18",
    takeaways: ["Local AI is seven layers"],
    feeling: "Inspired",
    tags: ["gdg"],
    links: [],
    photos: [],
  };

  it("matches title, takeaways, feelings and tags case-insensitively", () => {
    expect(matchesQuery(entry, "seven LAYERS")).toBe(true);
    expect(matchesQuery(entry, "inspired")).toBe(true);
    expect(matchesQuery(entry, "gdg")).toBe(true);
    expect(matchesQuery(entry, "kubernetes")).toBe(false);
    expect(matchesQuery(entry, "  ")).toBe(true);
  });
});
