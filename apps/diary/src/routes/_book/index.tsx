import { createFileRoute } from "@tanstack/react-router";
import { loadSiteUrl } from "../../diary.functions";
import { pageMeta, SITE_DESCRIPTION, SITE_NAME } from "../../lib/seo";

export const Route = createFileRoute("/_book/")({
  loader: () => loadSiteUrl(),
  head: ({ loaderData }) =>
    pageMeta({
      siteUrl: loaderData ?? "",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      path: "/",
      image: "/og",
    }),
  component: () => null,
});
