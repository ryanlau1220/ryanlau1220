import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { buildRssFeed } from "../lib/rss";
import { readAllEntries } from "../server/entries";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(buildRssFeed(env.SITE_URL, await readAllEntries()), {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=900",
          },
        }),
    },
  },
});
