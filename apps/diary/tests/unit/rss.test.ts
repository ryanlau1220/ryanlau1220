import { describe, expect, it } from "vitest";
import type { DiaryEntry } from "../../src/lib/diary";
import { buildRssFeed } from "../../src/lib/rss";

const entry: DiaryEntry = {
  id: "5b1f5f0e",
  slug: "road-to-devfest-cloud-kl",
  title: "Antigravity & <Local> LLMs",
  eventName: "Road to DevFest",
  entryDate: "2026-11-18",
  takeaways: ["Seven layers"],
  feeling: "Inspired",
  tags: ["gdg"],
  links: [],
  photos: [],
};

describe("RSS feed", () => {
  it("links each entry to its shareable page and escapes its text", () => {
    const feed = buildRssFeed("https://diary.ryanlau1220.dev/", [entry]);
    expect(feed).toContain("<link>https://diary.ryanlau1220.dev/road-to-devfest-cloud-kl</link>");
    expect(feed).toContain("<title>Antigravity &amp; &lt;Local&gt; LLMs</title>");
    expect(feed).toContain("<pubDate>Wed, 18 Nov 2026 00:00:00 GMT</pubDate>");
    expect(feed).toContain("<category>gdg</category>");
    expect(feed).not.toContain("<Local>");
  });
});
