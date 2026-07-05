import { createFileRoute } from '@tanstack/react-router';
import { getEvent } from 'vinxi/http';

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const event = getEvent();
          const r2 = event.context.cloudflare?.env?.BUCKETS;
          if (!r2) {
            return new Response('R2 Bucket binding not configured', { status: 500 });
          }

          const formData = await request.formData();
          const file = formData.get('file') as File;
          if (!file) {
            return new Response('Missing file in form data', { status: 400 });
          }

          // Generate a unique filename
          const ext = file.name.split('.').pop() || 'png';
          const filename = `projects/${crypto.randomUUID()}.${ext}`;

          // Upload file buffer to R2 bucket
          const arrayBuffer = await file.arrayBuffer();
          await r2.put(filename, arrayBuffer, {
            httpMetadata: {
              contentType: file.type,
            }
          });

          // Return path which gets routed through our /r2 API serving route
          const imageUrl = `/r2/${filename}`;
          return new Response(JSON.stringify({ imageUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
