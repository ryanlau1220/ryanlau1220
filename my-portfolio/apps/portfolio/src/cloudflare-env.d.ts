interface GuestbookD1Statement {
  bind(...values: unknown[]): GuestbookD1Statement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface GuestbookD1Database {
  prepare(query: string): GuestbookD1Statement;
}

declare module "cloudflare:workers" {
  export const env: {
    VISITOR_LOG_DB?: GuestbookD1Database;
    TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    VISITOR_LOG_RATE_LIMIT_SALT?: string;
    VISITOR_LOG_HOSTNAME?: string;
    PUSHER_APP_ID?: string;
    PUSHER_KEY?: string;
    PUSHER_SECRET?: string;
    PUSHER_CLUSTER?: string;
  };
}
