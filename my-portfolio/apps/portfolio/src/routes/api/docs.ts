import { createFileRoute } from "@tanstack/react-router";
import { getOpenAPISpec } from "../../server/openapi";

export const Route = createFileRoute("/api/docs")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("format") === "json") {
          const spec = await getOpenAPISpec();
          return new Response(JSON.stringify(spec, null, 2), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const specUrl = `${url.pathname}?format=json`;

        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portfolio API - Scalar Docs</title>
    <style>
      body { margin: 0; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-configuration='{"spec":{"url":"${specUrl}"},"theme":"purple","showSidebar":true,"hideDownloadButton":false}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
