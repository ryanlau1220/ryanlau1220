import { createFileRoute } from '@tanstack/react-router';
import { ORPCHandler } from '@orpc/server/fetch';
import { router } from '../../server/orpc';

const handler = new ORPCHandler(router);

export const Route = createFileRoute('/api/admin/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          return await handler.fetch(request, { prefix: '/api/admin' });
        } catch {
          return new Response('Not Found', { status: 404 });
        }
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          return await handler.fetch(request, { prefix: '/api/admin' });
        } catch {
          return new Response('Not Found', { status: 404 });
        }
      }
    }
  }
});
