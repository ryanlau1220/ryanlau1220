import { createFileRoute } from "@tanstack/react-router";
import { getAuth, isAuthConfigured } from "../../../server/auth";

function handle(request: Request) {
  if (!isAuthConfigured()) return new Response("Not found.", { status: 404 });
  return getAuth().handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
