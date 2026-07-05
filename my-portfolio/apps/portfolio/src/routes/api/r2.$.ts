import { createFileRoute } from "@tanstack/react-router";
import { getEvent } from "vinxi/http";

export const Route = createFileRoute("/api/r2/$")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { _: string } }) => {
        try {
          const event = getEvent();
          const r2 = event.context.cloudflare?.env?.BUCKETS;
          if (!r2) {
            return new Response("R2 Bucket not found", { status: 500 });
          }

          const filename = params._; // catch-all path parameter
          const file = await r2.get(filename);
          if (!file) {
            return new Response("Not Found", { status: 404 });
          }

          const headers = new Headers();
          file.writeHttpMetadata(headers);
          headers.set("etag", file.httpEtag);

          return new Response(file.body, { headers });
        } catch (_e: any) {
          return new Response("Error fetching file from R2", { status: 500 });
        }
      },
    },
  },
});
