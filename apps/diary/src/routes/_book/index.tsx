import { createFileRoute } from "@tanstack/react-router";
import { pageMeta, SITE_DESCRIPTION, SITE_NAME } from "../../lib/seo";

export const Route = createFileRoute("/_book/")({
  head: () =>
    pageMeta({ title: SITE_NAME, description: SITE_DESCRIPTION, path: "/", image: "/og" }),
  component: () => null,
});
