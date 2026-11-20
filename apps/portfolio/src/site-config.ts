import { createServerFn } from "@tanstack/react-start";
import { readSiteConfig, type SiteConfig } from "./server/site-config";

export type { SiteConfig };

/** Public, deployment-specific URLs for the browser (canonical links, footer, analytics). */
export const loadSiteConfig = createServerFn({ method: "GET" }).handler(() => readSiteConfig());
