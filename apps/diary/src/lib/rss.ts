import type { DiaryEntry } from "./diary";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function entrySummary(entry: Pick<DiaryEntry, "feeling" | "takeaways" | "eventName">) {
  return entry.feeling || entry.takeaways[0] || entry.eventName || "A new page in Ryan's diary.";
}

export function buildRssFeed(siteUrl: string, items: DiaryEntry[]) {
  const site = siteUrl.replace(/\/+$/, "");
  const body = items
    .map((entry) => {
      const link = `${site}/${entry.slug}`;
      const description = [
        entry.eventName ? `<p><strong>${escapeXml(entry.eventName)}</strong></p>` : "",
        entry.feeling ? `<p>${escapeXml(entry.feeling)}</p>` : "",
        entry.takeaways.length
          ? `<ul>${entry.takeaways.map((item) => `<li>${escapeXml(item)}</li>`).join("")}</ul>`
          : "",
      ].join("");
      return [
        "    <item>",
        `      <title>${escapeXml(entry.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(entry.id)}</guid>`,
        `      <pubDate>${new Date(`${entry.entryDate}T00:00:00Z`).toUTCString()}</pubDate>`,
        ...entry.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
        `      <description>${escapeXml(description || entrySummary(entry))}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ryan's Diary</title>
    <link>${escapeXml(site)}</link>
    <atom:link href="${escapeXml(`${site}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>Events, takeaways and moments from Ryan Lau's journey.</description>
    <language>en</language>
${body}
  </channel>
</rss>
`;
}
