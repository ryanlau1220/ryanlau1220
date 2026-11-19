import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { SITE_NAME } from "../lib/seo";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#120a06" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "alternate", type: "application/rss+xml", title: SITE_NAME, href: "/rss.xml" },
    ],
  }),
  shellComponent: RootShell,
  component: Outlet,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="parchment-screen">
      <div className="parchment-card">
        <p className="font-hand text-3xl text-ink-soft">This page was torn out…</p>
        <h1 className="mt-2 font-story text-4xl text-ink">Page not found</h1>
        <a className="ink-button mt-8" href="/">
          Return to the diary
        </a>
      </div>
    </main>
  );
}
