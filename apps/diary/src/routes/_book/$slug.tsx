import { createFileRoute, notFound } from "@tanstack/react-router";
import { loadEntryMeta } from "../../diary.functions";
import { formatEntryDate, isValidSlug } from "../../lib/diary";
import { entrySummary } from "../../lib/rss";
import { pageMeta, SITE_NAME } from "../../lib/seo";

export const Route = createFileRoute("/_book/$slug")({
  loader: async ({ params }) => {
    if (!isValidSlug(params.slug)) throw notFound();
    const entry = await loadEntryMeta({ data: params.slug });
    if (!entry) throw notFound();
    return entry;
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageMeta({
          title: `${loaderData.title} · ${SITE_NAME}`,
          description: `${formatEntryDate(loaderData.entryDate)} — ${entrySummary(loaderData)}`,
          path: `/${loaderData.slug}`,
          image: `/og?entry=${encodeURIComponent(loaderData.slug)}&v=${loaderData.updatedAt}`,
        })
      : {},
  component: () => null,
});
