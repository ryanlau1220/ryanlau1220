# Diary setup

The diary is a TanStack Start app on Cloudflare Workers. Entries live in D1, photos in R2, and the
owner signs in with GitHub through Better Auth. Visitors can only read.

## Cloudflare resources (already created)

| Resource    | Name                                             | Binding    |
| ----------- | ------------------------------------------------ | ---------- |
| D1 database | `diary` (`90d53c65-166c-4c08-84d9-252aa53f3bac`) | `DIARY_DB` |
| R2 bucket   | `diary-photos`                                   | `PHOTOS`   |

Photos are served through the Worker at `/photos/…`, so the bucket stays private.

## Local development

From `apps/diary`:

```sh
cp .dev.vars.example .dev.vars   # then fill in the values below
pnpm db:migrate:local
pnpm seed:local                  # first entry + its photo
pnpm dev                         # http://localhost:3001
```

`pnpm seed:remote` and `pnpm db:migrate:remote` do the same against the real D1 database and R2
bucket. The seed script re-encodes photos from `seed-photos/` with ImageMagick, stripping all
metadata. `seed-photos/` is git-ignored so originals with camera data are never committed.

## Owner sign-in (GitHub)

Sign-in lives at `/login`, which nothing links to. Hiding the page is only for convenience. The
server enforces access: every write checks that the session belongs to the GitHub account whose
numeric ID is `OWNER_GITHUB_ID`, and any other GitHub account is refused before a user row is
created.

1. Create a GitHub OAuth app at <https://github.com/settings/developers> → **New OAuth App**.
   - Homepage URL: `http://localhost:3001`
   - Authorization callback URL: `http://localhost:3001/api/auth/callback/github`
2. Put its client ID and a generated client secret in `.dev.vars` as `GITHUB_CLIENT_ID` and
   `GITHUB_CLIENT_SECRET`.
3. `BETTER_AUTH_SECRET` must be a random value: `openssl rand -hex 32`.
4. `OWNER_GITHUB_ID` is your numeric GitHub ID: `gh api user --jq .id`.

For production, create a second OAuth app with `https://diary.ryanlau1220.dev` and callback
`https://diary.ryanlau1220.dev/api/auth/callback/github`, then set the Worker secrets:

```sh
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put GITHUB_CLIENT_ID
pnpm exec wrangler secret put GITHUB_CLIENT_SECRET
pnpm exec wrangler secret put OWNER_GITHUB_ID
```

`SITE_URL`, `BETTER_AUTH_URL` and `CF_ANALYTICS_TOKEN` are public values under `vars` in
`wrangler.jsonc`. Local `.dev.vars` overrides the two URLs during `pnpm dev`. The analytics
beacon is never loaded by `pnpm dev`, so the token needs no local value.

## Schema changes

Edit `src/server/schema.ts`, then:

```sh
pnpm db:generate          # writes a new SQL file to migrations/
pnpm db:migrate:local
```

Rerun `pnpm exec wrangler types` after changing bindings in `wrangler.jsonc`.
