import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

const OBJECT_KEY = /^entries\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|webp)$/;

async function servePhoto(request: Request, key: string) {
  if (!OBJECT_KEY.test(key)) return new Response("Not found.", { status: 404 });
  const object = await env.PHOTOS.get(key, { onlyIf: request.headers });
  if (!object) return new Response("Not found.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

export const Route = createFileRoute("/photos/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => servePhoto(request, params._splat ?? ""),
      HEAD: ({ request, params }) => servePhoto(request, params._splat ?? ""),
    },
  },
});
