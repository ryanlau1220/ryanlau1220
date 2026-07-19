import { createHash, createHmac } from "node:crypto";
import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { VisitorLogEntry, VisitorLogSnapshot } from "./visitor-log.types";

const MAX_AUTHOR_LENGTH = 40;
const MAX_MESSAGE_WORDS = 100;
const MAX_MESSAGE_CHARACTERS = 1_000;
const MAX_RECENT_MESSAGES = 18;
const TEN_MINUTES = 10 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const URL_OR_MARKUP_PATTERN = /(?:https?:\/\/|www\.|<\/?[a-z][^>]*>)/i;

interface SubmitVisitorLogInput {
  author?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
  website?: unknown;
}

interface VisitorLogRow {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

interface CountRow {
  count: number;
}

function normalizeSingleLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeMessage(value: string) {
  return value
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function containsDisallowedControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return (
      (code >= 0 && code <= 8) ||
      (code >= 11 && code <= 12) ||
      (code >= 14 && code <= 31) ||
      code === 127
    );
  });
}

function getRuntimeConfig() {
  const database = env.VISITOR_LOG_DB;
  const siteKey = env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim();
  const rateLimitSalt = env.VISITOR_LOG_RATE_LIMIT_SALT?.trim();

  return {
    database,
    siteKey,
    secretKey,
    rateLimitSalt,
    enabled: Boolean(database && siteKey && secretKey && rateLimitSalt),
    realtime:
      env.PUSHER_APP_ID?.trim() &&
      env.PUSHER_KEY?.trim() &&
      env.PUSHER_SECRET?.trim() &&
      env.PUSHER_CLUSTER?.trim()
        ? { key: env.PUSHER_KEY.trim(), cluster: env.PUSHER_CLUSTER.trim() }
        : null,
  };
}

function assertSameOrigin() {
  const request = getRequest();
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    throw new Error("Guestbook requests must come from this site.");
  }
}

function readSubmission(data: SubmitVisitorLogInput) {
  const rawAuthor = typeof data.author === "string" ? data.author : "";
  const rawMessage = typeof data.message === "string" ? data.message : "";
  const turnstileToken = typeof data.turnstileToken === "string" ? data.turnstileToken.trim() : "";
  const website = typeof data.website === "string" ? data.website.trim() : "";
  const author = normalizeSingleLine(rawAuthor) || "Anonymous";
  const message = normalizeMessage(rawMessage);

  if (website) return { isBot: true as const };
  if (author.length > MAX_AUTHOR_LENGTH) {
    throw new Error(`Name must be ${MAX_AUTHOR_LENGTH} characters or fewer.`);
  }
  if (!message) {
    throw new Error("Write a comment before posting.");
  }
  if (message.length > MAX_MESSAGE_CHARACTERS) {
    throw new Error("Your comment is too long.");
  }
  if (countWords(message) > MAX_MESSAGE_WORDS) {
    throw new Error(`Comments can contain up to ${MAX_MESSAGE_WORDS} words.`);
  }
  if (containsDisallowedControlCharacter(message) || URL_OR_MARKUP_PATTERN.test(message)) {
    throw new Error("Comments cannot contain links, HTML, or control characters.");
  }
  if (!turnstileToken) {
    throw new Error("Please complete the verification before posting.");
  }

  return { isBot: false as const, author, message, turnstileToken };
}

async function verifyTurnstile(token: string, secret: string, hostname?: string) {
  const request = getRequest();
  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", token);
  formData.set("idempotency_key", crypto.randomUUID());

  const visitorIp = request.headers.get("CF-Connecting-IP");
  if (visitorIp) formData.set("remoteip", visitorIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Verification service is temporarily unavailable.");

  const result = (await response.json()) as {
    success?: boolean;
    action?: string;
    hostname?: string;
  };

  if (
    !result.success ||
    result.action !== "visitor-log" ||
    (hostname && result.hostname !== hostname)
  ) {
    throw new Error("Verification failed. Please try again.");
  }
}

function getVisitorHash(salt: string) {
  const request = getRequest();
  const visitorIp = request.headers.get("CF-Connecting-IP") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return createHash("sha256").update(`${salt}:${visitorIp}:${userAgent}`).digest("hex");
}

async function assertRateLimit(
  database: VisitorLogD1Database,
  visitorHash: string,
  message: string,
  now: number,
) {
  const [recent, daily, duplicate] = await Promise.all([
    database
      .prepare(
        "SELECT COUNT(*) AS count FROM visitor_log_entries WHERE visitor_hash = ? AND created_at_ms >= ?",
      )
      .bind(visitorHash, now - TEN_MINUTES)
      .first<CountRow>(),
    database
      .prepare(
        "SELECT COUNT(*) AS count FROM visitor_log_entries WHERE visitor_hash = ? AND created_at_ms >= ?",
      )
      .bind(visitorHash, now - ONE_DAY)
      .first<CountRow>(),
    database
      .prepare(
        "SELECT id FROM visitor_log_entries WHERE visitor_hash = ? AND message = ? AND created_at_ms >= ? LIMIT 1",
      )
      .bind(visitorHash, message, now - ONE_DAY)
      .first<{ id: string }>(),
  ]);

  if ((recent?.count ?? 0) >= 2) {
    throw new Error("Please wait a few minutes before posting another comment.");
  }
  if ((daily?.count ?? 0) >= 6) {
    throw new Error("You have reached today’s comment limit. Please come back tomorrow.");
  }
  if (duplicate) {
    throw new Error("That comment has already been posted.");
  }
}

async function publishRealtimeEntry(entry: VisitorLogEntry) {
  const appId = env.PUSHER_APP_ID?.trim();
  const key = env.PUSHER_KEY?.trim();
  const secret = env.PUSHER_SECRET?.trim();
  const cluster = env.PUSHER_CLUSTER?.trim();

  if (!(appId && key && secret && cluster)) return;

  const body = JSON.stringify({
    name: "visitor-log:created",
    channels: ["public-visitor-log"],
    data: JSON.stringify(entry),
  });
  const authTimestamp = Math.floor(Date.now() / 1000).toString();
  const authParams = new URLSearchParams({
    auth_key: key,
    auth_timestamp: authTimestamp,
    auth_version: "1.0",
    body_md5: createHash("md5").update(body).digest("hex"),
  });
  const signaturePayload = `POST\n/apps/${appId}/events\n${authParams.toString()}`;
  const signature = createHmac("sha256", secret).update(signaturePayload).digest("hex");
  authParams.set("auth_signature", signature);

  try {
    await fetch(`https://api-${cluster}.pusher.com/apps/${appId}/events?${authParams.toString()}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  } catch {
    // Realtime delivery is deliberately best-effort; a saved comment must not be discarded for it.
  }
}

export const loadVisitorLog = createServerFn({ method: "GET" }).handler(
  async (): Promise<VisitorLogSnapshot> => {
    const config = getRuntimeConfig();
    if (!config.enabled || !config.database) {
      return { enabled: false, turnstileSiteKey: null, realtime: null, entries: [] };
    }

    const result = await config.database
      .prepare(
        "SELECT id, author, message, created_at AS createdAt FROM visitor_log_entries ORDER BY created_at_ms DESC LIMIT ?",
      )
      .bind(MAX_RECENT_MESSAGES)
      .all<VisitorLogRow>();

    return {
      enabled: true,
      turnstileSiteKey: config.siteKey || null,
      realtime: config.realtime,
      entries: result.results,
    };
  },
);

export const submitVisitorLogEntry = createServerFn({ method: "POST" })
  .validator((data: SubmitVisitorLogInput) => data)
  .handler(async ({ data }): Promise<{ entry: VisitorLogEntry | null }> => {
    assertSameOrigin();
    const config = getRuntimeConfig();
    if (!config.enabled || !(config.database && config.secretKey && config.rateLimitSalt)) {
      throw new Error("Guestbook is not configured yet.");
    }

    const submission = readSubmission(data);
    if (submission.isBot) return { entry: null };

    await verifyTurnstile(submission.turnstileToken, config.secretKey, env.VISITOR_LOG_HOSTNAME);

    const now = Date.now();
    const visitorHash = getVisitorHash(config.rateLimitSalt);
    await assertRateLimit(config.database, visitorHash, submission.message, now);

    const entry: VisitorLogEntry = {
      id: crypto.randomUUID(),
      author: submission.author,
      message: submission.message,
      createdAt: new Date(now).toISOString(),
    };
    const writeResult = await config.database
      .prepare(
        "INSERT INTO visitor_log_entries (id, author, message, created_at, created_at_ms, visitor_hash) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(entry.id, entry.author, entry.message, entry.createdAt, now, visitorHash)
      .run();

    if (!writeResult.success) throw new Error("Your comment could not be saved. Please try again.");

    await publishRealtimeEntry(entry);
    return { entry };
  });
