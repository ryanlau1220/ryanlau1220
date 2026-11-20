import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { buildRssFeed } from "../lib/rss";
import { siteOrigin } from "../lib/seo";
import { readAllEntries } from "../server/entries";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(buildRssFeed(siteOrigin(env.SITE_URL, request.url), await readAllEntries()), {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=900",
          },
        }),
    },
  },
});
