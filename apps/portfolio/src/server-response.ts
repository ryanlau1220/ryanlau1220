const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://js.pusher.com",
    "connect-src 'self' https://api.web3forms.com https://cloudflareinsights.com https://challenges.cloudflare.com https://*.pusher.com wss://*.pusher.com",
    "frame-src https://challenges.cloudflare.com",
    "upgrade-insecure-requests",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

function addSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

const ERROR_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Something went wrong | Ryan Lau</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
  <main>
    <h1>Something went wrong.</h1>
    <p>The portfolio could not load. Please try again shortly.</p>
    <a href="/">Return home</a>
  </main>
</body>
</html>`;

export async function handleServerResponse(
  request: Request,
  handle: () => Response | Promise<Response>,
): Promise<Response> {
  try {
    return addSecurityHeaders(await handle());
  } catch (error) {
    if (error instanceof Response) return addSecurityHeaders(error);
    console.error("Unhandled portfolio request error", error);
    const isPageRequest = request.headers.get("accept")?.includes("text/html") ?? false;
    const body = isPageRequest
      ? ERROR_PAGE
      : "The request could not be completed. Please try again shortly.";
    return addSecurityHeaders(
      new Response(request.method === "HEAD" ? null : body, {
        status: 500,
        headers: {
          "Content-Type": isPageRequest ? "text/html; charset=utf-8" : "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }),
    );
  }
}
