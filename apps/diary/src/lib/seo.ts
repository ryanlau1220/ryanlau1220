export const SITE_NAME = "Ryan's Diary";
export const SITE_DESCRIPTION =
  "A storybook diary of the events Ryan Lau attended: key takeaways, photographs, and how each moment felt.";
/** Normalizes SITE_URL (from wrangler.jsonc vars or .dev.vars) to a bare origin. */
export function siteOrigin(value: string | undefined, fallbackRequestUrl?: string) {
  try {
    return new URL((value ?? "").trim()).origin;
  } catch {
    return fallbackRequestUrl ? new URL(fallbackRequestUrl).origin : "";
  }
}

export function pageMeta({
  siteUrl,
  title,
  description,
  path,
  image,
}: {
  siteUrl: string;
  title: string;
  description: string;
  path: string;
  image: string;
}) {
  const url = `${siteUrl}${path}`;
  const imageUrl = `${siteUrl}${image}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: path === "/" ? "website" : "article" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: imageUrl },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
