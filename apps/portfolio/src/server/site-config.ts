import { env } from "cloudflare:workers";

export interface SiteConfig {
  /** Public origin of this portfolio, without a trailing slash. */
  siteUrl: string;
  /** Public origin of the diary app, or null when it is not configured. */
  diaryUrl: string | null;
  /** Cloudflare Web Analytics token, or null to skip the beacon. */
  analyticsToken: string | null;
}

function origin(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/** Reads the deployment-specific URLs from Worker vars (wrangler.jsonc, or .dev.vars locally). */
export function readSiteConfig(requestUrl?: string): SiteConfig {
  return {
    siteUrl: origin(env.SITE_URL) ?? (requestUrl ? new URL(requestUrl).origin : ""),
    diaryUrl: origin(env.DIARY_URL),
    analyticsToken: env.CF_ANALYTICS_TOKEN?.trim() || null,
  };
}
