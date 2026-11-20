# Guestbook setup

The Guestbook is intentionally disabled until its Cloudflare resources and secrets are configured. The UI stays present, but it cannot accept comments without every required protection in place.

## 1. Create and bind D1

From `apps/portfolio`:

```sh
pnpm exec wrangler d1 create portfolio-visitor-log
```

Copy the returned `database_id` into `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "VISITOR_LOG_DB",
      "database_name": "portfolio-visitor-log",
      "database_id": "paste-the-returned-id-here"
    }
  ]
}
```

Apply the schema locally first if desired, then to production:

```sh
pnpm exec wrangler d1 execute portfolio-visitor-log --local --file migrations/0001_visitor_log.sql
pnpm exec wrangler d1 execute portfolio-visitor-log --remote --file migrations/0001_visitor_log.sql
```

## 2. Configure Turnstile

In the Cloudflare dashboard, add both `ryanlau1220.dev` and `portfolio.ryanlau1220.workers.dev` to the existing Turnstile widget’s hostname list. Keep its existing site key and secret. Configure the public site key and comma-separated allowed production hostnames under `vars` in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "TURNSTILE_SITE_KEY": "your-public-site-key",
    "VISITOR_LOG_HOSTNAME": "ryanlau1220.dev,portfolio.ryanlau1220.workers.dev"
  }
}
```

Set the private Turnstile key and a new random rate-limit salt as Worker secrets. You can generate the secret using `openssl rand -hex 32` in the terminal:

```sh
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put VISITOR_LOG_RATE_LIMIT_SALT
```

The Worker validates the token server-side, checks the Turnstile action and requires its hostname to match both the current request and the configured allowlist, stores only a salted visitor fingerprint, and never stores the raw IP address.

## 3. Enable optional Pusher realtime updates

The guestbook works without Pusher. To show new verified comments instantly to other open visitors, create a Pusher Channels application and set:

```sh
pnpm exec wrangler secret put PUSHER_APP_ID
pnpm exec wrangler secret put PUSHER_KEY
pnpm exec wrangler secret put PUSHER_SECRET
pnpm exec wrangler secret put PUSHER_CLUSTER
```

Only the public key and cluster are sent to the browser. The application ID and secret remain inside the Worker, which publishes a `visitor-log:created` event only after a comment passes verification, validation, and D1 rate checks.

## Safeguards included

- Turnstile server-side validation with a single-use token.
- Same-origin write requests.
- Hidden honeypot field for unsophisticated bots.
- Plain-text comments only: links and markup are rejected.
- 100-word comment limit, a 1,000-character safety cap, and a 40-character name limit.
- Maximum two posts per ten minutes and six posts per visitor per day.
- Duplicate-comment prevention for one day.

Direct publishing still needs occasional owner attention. If a comment must be removed before an owner-only moderation view is added, delete it directly from `visitor_log_entries` with the Cloudflare D1 dashboard or Wrangler.

## Site URLs

`SITE_URL` (this site), `DIARY_URL` (the footer link) and `CF_ANALYTICS_TOKEN` are public values
under `vars` in `wrangler.jsonc`. `.dev.vars` overrides the two URLs locally, so canonical links,
the sitemap, robots.txt and the footer point at `localhost` during `pnpm dev`. The analytics
beacon is never loaded by `pnpm dev`, so the token needs no local value. Set `DIARY_URL` to an
empty string to hide the footer link.
