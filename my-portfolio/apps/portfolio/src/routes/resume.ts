import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

// The public URL is /resume; the file in public/ keeps its original name.
// In production, public/_redirects rewrites /resume before the Worker runs.
// This route covers `vite dev` (which ignores _redirects) and acts as a fallback.
const RESUME_ASSET_PATH = "/Ryan%20Lau_Resume.pdf";
const RESUME_FILENAME = "Ryan Lau_Resume.pdf";

async function serveResume(request: Request) {
  const assets = env.ASSETS;
  if (!assets) {
    return new Response("Resume is temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  // Forward the method and conditional headers (If-None-Match) so ETag revalidation still works.
  const asset = await assets.fetch(new Request(new URL(RESUME_ASSET_PATH, request.url), request));
  if (!asset.ok && asset.status !== 304) {
    return new Response("Resume not found.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const headers = new Headers(asset.headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", `inline; filename="${RESUME_FILENAME}"`);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");

  return new Response(asset.body, { status: asset.status, headers });
}

export const Route = createFileRoute("/resume")({
  server: {
    handlers: {
      GET: ({ request }) => serveResume(request),
      HEAD: ({ request }) => serveResume(request),
    },
  },
});
