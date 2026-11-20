import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { siteOrigin } from "../lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(
          `User-agent: *\nAllow: /\nSitemap: ${siteOrigin(env.SITE_URL, request.url)}/rss.xml\n`,
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          },
        ),
    },
  },
});
