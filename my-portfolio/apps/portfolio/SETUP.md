# Visitor Log setup

The Visitor Log is intentionally disabled until its Cloudflare resources and secrets are configured. The UI stays present, but it cannot accept messages without every required protection in place.

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

Create a Turnstile widget for the production hostname in the Cloudflare dashboard. Add the public site key and hostname under `vars` in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "TURNSTILE_SITE_KEY": "your-public-site-key",
    "VISITOR_LOG_HOSTNAME": "your-domain.example"
  }
}
```

Set the private Turnstile key and a new random rate-limit salt as Worker secrets. You can generate the secret using `openssl rand -hex 32` in the terminal:

```sh
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put VISITOR_LOG_RATE_LIMIT_SALT
```

The Worker validates the token server-side, checks the Turnstile action and hostname, stores only a salted visitor fingerprint, and never stores the raw IP address.

## 3. Enable optional Pusher realtime updates

The guestbook works without Pusher. To show new verified notes instantly to other open visitors, create a Pusher Channels application and set:

```sh
pnpm exec wrangler secret put PUSHER_APP_ID
pnpm exec wrangler secret put PUSHER_KEY
pnpm exec wrangler secret put PUSHER_SECRET
pnpm exec wrangler secret put PUSHER_CLUSTER
```

Only the public key and cluster are sent to the browser. The application ID and secret remain inside the Worker, which publishes a `visitor-log:created` event only after a note passes verification, validation, and D1 rate checks.

## Safeguards included

- Turnstile server-side validation with a single-use token.
- Same-origin write requests.
- Hidden honeypot field for unsophisticated bots.
- Plain-text notes only: links and markup are rejected.
- 8–280 character note limit and 40 character name limit.
- Maximum two posts per ten minutes and six posts per visitor per day.
- Duplicate-note prevention for one day.

Direct publishing still needs occasional owner attention. If a note must be removed before an owner-only moderation view is added, delete it directly from `visitor_log_entries` with the Cloudflare D1 dashboard or Wrangler.
