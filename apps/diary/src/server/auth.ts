import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { github } from "better-auth/social-providers";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { account, schema } from "./schema";

const PLACEHOLDER = /^(your-|replace-|0$)/;

function configured(value: string | undefined) {
  return Boolean(value?.trim()) && !PLACEHOLDER.test(value!.trim());
}

/** Login works only once the GitHub app, secret, and owner ID are all real values. */
export function isAuthConfigured() {
  return (
    configured(env.GITHUB_CLIENT_ID) &&
    configured(env.GITHUB_CLIENT_SECRET) &&
    configured(env.BETTER_AUTH_SECRET) &&
    configured(env.OWNER_GITHUB_ID)
  );
}

function createAuth() {
  const ownerGithubId = env.OWNER_GITHUB_ID.trim();
  const githubOptions = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
  const defaultGithub = github(githubOptions);

  return betterAuth({
    appName: "Ryan's Diary",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: "sqlite", schema }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      github: {
        ...githubOptions,
        // Refuse every GitHub account except the owner before any user row is created.
        async getUserInfo(token) {
          const info = await defaultGithub.getUserInfo(token);
          return info && String(info.data.id) === ownerGithubId ? info : null;
        },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 14 },
    advanced: { useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://") },
    telemetry: { enabled: false },
    plugins: [tanstackStartCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  auth ??= createAuth();
  return auth;
}

/**
 * The real authorization check behind every write. The session must belong to a user whose
 * linked GitHub account is the configured owner; a valid session alone is not enough.
 */
export async function isOwnerRequest(headers: Headers) {
  if (!isAuthConfigured()) return false;
  const session = await getAuth().api.getSession({ headers });
  if (!session) return false;
  const owner = await getDb()
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "github"),
        eq(account.accountId, env.OWNER_GITHUB_ID.trim()),
      ),
    )
    .get();
  return Boolean(owner);
}
