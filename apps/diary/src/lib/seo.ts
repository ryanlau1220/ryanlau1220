export const SITE_NAME = "Ryan's Diary";
export const SITE_DESCRIPTION =
  "A storybook diary of the events Ryan Lau attended: key takeaways, photographs, and how each moment felt.";
// Absolute URLs in meta tags must point at the public site even when rendered locally.
export const PUBLIC_SITE_URL = "https://diary.ryanlau1220.dev";

export function pageMeta({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image: string;
}) {
  const url = `${PUBLIC_SITE_URL}${path}`;
  const imageUrl = `${PUBLIC_SITE_URL}${image}`;
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
