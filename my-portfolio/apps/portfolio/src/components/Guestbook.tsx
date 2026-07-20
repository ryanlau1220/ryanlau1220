import { CheckCircle2, LoaderCircle, MessageSquarePlus, Send, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadGuestbook, submitGuestbookComment } from "../guestbook.functions";
import type { GuestbookEntry, GuestbookRealtimeConfig } from "../guestbook.types";

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const PUSHER_SCRIPT_URL = "https://js.pusher.com/8.4.0/pusher.min.js";
const MAX_MESSAGE_WORDS = 100;
const MAX_MESSAGE_CHARACTERS = 1_000;
const GUESTBOOK_SEEN_STORAGE_KEY = "portfolio:guestbook-seen:v1";
const INITIAL_FORM = { author: "", message: "", website: "" };
const externalScripts = new Map<string, Promise<void>>();

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme: "light" | "dark";
    },
  ): string | number;
  remove(widgetId: string | number): void;
  reset(widgetId?: string | number): void;
}

interface PusherChannel {
  bind(eventName: string, callback: (data: unknown) => void): void;
  unbind(eventName: string, callback: (data: unknown) => void): void;
}

interface PusherClient {
  subscribe(channelName: string): PusherChannel;
  unsubscribe(channelName: string): void;
  disconnect(): void;
}

interface PusherConstructor {
  new (key: string, options: { cluster: string }): PusherClient;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    Pusher?: PusherConstructor;
  }
}

function loadExternalScript(src: string) {
  const existing = externalScripts.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}.`));
    document.head.appendChild(script);
  });

  externalScripts.set(src, promise);
  return promise;
}

function isGuestbookEntry(value: unknown): value is GuestbookEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.author === "string" &&
    typeof entry.message === "string" &&
    typeof entry.createdAt === "string"
  );
}

function upsertEntry(entries: GuestbookEntry[], entry: GuestbookEntry) {
  return [entry, ...entries.filter((current) => current.id !== entry.id)].slice(0, 18);
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "just now";

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedMinutes < 24 * 60) return `${Math.floor(elapsedMinutes / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function GuestbookMessages({ entries }: { entries: GuestbookEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-7 text-center">
        <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400">No comments yet.</p>
        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1.5">
          Be the first to leave one.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-2.5" aria-label="Recent comments">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="border border-neutral-200/85 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/45 rounded-xl px-3.5 py-3"
        >
          <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
            <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
              {entry.author}
            </span>
            <time
              className="shrink-0 text-neutral-600 dark:text-neutral-400"
              dateTime={entry.createdAt}
            >
              {formatTimestamp(entry.createdAt)}
            </time>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            {entry.message}
          </p>
        </li>
      ))}
    </ol>
  );
}

function useRealtimeGuestbook(
  isOpen: boolean,
  realtime: GuestbookRealtimeConfig | null,
  onEntry: (entry: GuestbookEntry) => void,
) {
  useEffect(() => {
    if (!(isOpen && realtime)) return;

    let cancelled = false;
    let pusher: PusherClient | null = null;
    let channel: PusherChannel | null = null;
    const onMessage = (data: unknown) => {
      try {
        const entry = typeof data === "string" ? JSON.parse(data) : data;
        if (isGuestbookEntry(entry)) onEntry(entry);
      } catch {
        // Ignore malformed third-party events rather than interrupting the local guestbook.
      }
    };

    void loadExternalScript(PUSHER_SCRIPT_URL)
      .then(() => {
        if (cancelled || !window.Pusher) return;
        pusher = new window.Pusher(realtime.key, { cluster: realtime.cluster });
        channel = pusher.subscribe("public-visitor-log");
        channel.bind("visitor-log:created", onMessage);
      })
      .catch(() => {
        // Realtime is an enhancement; the guestbook remains fully usable without it.
      });

    return () => {
      cancelled = true;
      channel?.unbind("visitor-log:created", onMessage);
      pusher?.unsubscribe("public-visitor-log");
      pusher?.disconnect();
    };
  }, [isOpen, onEntry, realtime]);
}

export function Guestbook() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnseenGuestbook, setHasUnseenGuestbook] = useState(false);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<GuestbookRealtimeConfig | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileTheme, setTurnstileTheme] = useState<"light" | "dark">("dark");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const turnstileMountRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | number | null>(null);

  const messageWordCount = countWords(form.message);

  useEffect(() => {
    try {
      setHasUnseenGuestbook(localStorage.getItem(GUESTBOOK_SEEN_STORAGE_KEY) === null);
    } catch {
      // When storage is unavailable, retain the non-persistent first-visit indicator.
      setHasUnseenGuestbook(true);
    }
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      setTurnstileTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    startLoading(async () => {
      try {
        setError(null);
        const snapshot = await loadGuestbook();
        if (cancelled) return;
        setIsEnabled(snapshot.enabled);
        setEntries(snapshot.entries);
        setTurnstileSiteKey(snapshot.turnstileSiteKey);
        setRealtime(snapshot.realtime);
      } catch {
        if (!cancelled) {
          setIsEnabled(false);
          setError("The guestbook could not be reached. Please try again shortly.");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!(isOpen && !isLoading && turnstileSiteKey && turnstileMountRef.current)) return;

    let cancelled = false;
    const mount = turnstileMountRef.current;
    mount.replaceChildren();

    void loadExternalScript(TURNSTILE_SCRIPT_URL)
      .then(() => {
        if (cancelled) return;
        if (!window.turnstile) {
          setError("Verification could not initialise. Please refresh and try again.");
          return;
        }

        turnstileWidgetRef.current = window.turnstile.render(mount, {
          sitekey: turnstileSiteKey,
          action: "visitor-log",
          theme: turnstileTheme,
          callback: (token) => {
            setTurnstileToken(token);
            setError(null);
          },
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () =>
            setError("Verification could not load. Please refresh and try again."),
        });
      })
      .catch(() => setError("Verification could not load. Please refresh and try again."));

    return () => {
      cancelled = true;
      if (turnstileWidgetRef.current !== null && window.turnstile) {
        window.turnstile.remove(turnstileWidgetRef.current);
        turnstileWidgetRef.current = null;
      }
      setTurnstileToken("");
    };
  }, [isLoading, isOpen, turnstileSiteKey, turnstileTheme]);

  const handleRealtimeEntry = useCallback((entry: GuestbookEntry) => {
    setEntries((current) => upsertEntry(current, entry));
  }, []);

  useRealtimeGuestbook(isOpen, realtime, handleRealtimeEntry);

  const close = () => {
    setIsOpen(false);
    setNotice(null);
    setError(null);
    openButtonRef.current?.focus();
  };

  const openGuestbook = () => {
    setIsOpen(true);
    setHasUnseenGuestbook(false);
    try {
      localStorage.setItem(GUESTBOOK_SEEN_STORAGE_KEY, "1");
    } catch {
      // The guestbook remains usable when browser storage is unavailable.
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.message.trim()) {
      setError("Write a comment before posting.");
      return;
    }
    if (messageWordCount > MAX_MESSAGE_WORDS) {
      setError(`Comments can contain up to ${MAX_MESSAGE_WORDS} words.`);
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the verification before posting.");
      return;
    }

    startSubmitting(async () => {
      try {
        setError(null);
        setNotice(null);
        const result = await submitGuestbookComment({
          data: { ...form, turnstileToken },
        });

        if (result.entry) {
          setEntries((current) => upsertEntry(current, result.entry!));
          setForm(INITIAL_FORM);
          setTurnstileToken("");
          setNotice("Your comment is live. Thank you for signing the guestbook.");
          if (turnstileWidgetRef.current !== null)
            window.turnstile?.reset(turnstileWidgetRef.current);
        } else {
          setNotice("Your comment was received. Thank you for stopping by.");
        }
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Your comment could not be posted. Please try again.",
        );
        if (turnstileWidgetRef.current !== null)
          window.turnstile?.reset(turnstileWidgetRef.current);
        setTurnstileToken("");
      }
    });
  };

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={openGuestbook}
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 text-neutral-800 dark:text-neutral-200 shadow-lg shadow-neutral-950/10 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="visitor-log"
        aria-label={hasUnseenGuestbook ? "Open guestbook (new)" : "Open guestbook"}
        title="Guestbook"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <MessageSquarePlus size={18} className="text-blue-500" aria-hidden="true" />
          {hasUnseenGuestbook ? (
            <span
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-white bg-red-500 dark:border-neutral-950"
              aria-hidden="true"
            />
          ) : null}
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:justify-end sm:p-5">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-950/25 dark:bg-black/60 backdrop-blur-[2px]"
            onClick={close}
            aria-label="Close guestbook"
          />
          <dialog
            open
            id="visitor-log"
            aria-modal="true"
            aria-labelledby="visitor-log-title"
            className="relative m-0 flex max-h-[min(760px,calc(100vh-1.5rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-0 shadow-2xl shadow-neutral-950/20"
          >
            <header className="flex items-start justify-between gap-4 border-b border-neutral-100 dark:border-neutral-900 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquarePlus size={16} className="text-blue-500" aria-hidden="true" />
                  <h2
                    id="visitor-log-title"
                    className="text-sm font-bold text-neutral-950 dark:text-white"
                  >
                    Guestbook
                  </h2>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white cursor-pointer"
                aria-label="Close guestbook"
              >
                <X size={15} />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto px-5 py-4">
              {isLoading || isEnabled === null ? (
                <div className="flex items-center justify-center gap-2 py-12 text-xs font-mono text-neutral-600 dark:text-neutral-400">
                  <LoaderCircle size={14} className="animate-spin" />
                  Loading comments…
                </div>
              ) : !isEnabled ? (
                <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 px-4 py-8 text-center">
                  <ShieldCheck
                    size={20}
                    className="mx-auto text-neutral-600 dark:text-neutral-400"
                  />
                  <p className="mt-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Guestbook is coming online.
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                    Its protected comment form is being configured. Please check back soon.
                  </p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="visitor-log-author"
                        className="text-[10px] font-bold font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400"
                      >
                        Leave a comment
                      </label>
                      <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400">
                        {messageWordCount}/{MAX_MESSAGE_WORDS} words
                      </span>
                    </div>
                    <input
                      id="visitor-log-author"
                      type="text"
                      value={form.author}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, author: event.target.value }))
                      }
                      maxLength={40}
                      placeholder="Name (optional)"
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none dark:text-white dark:focus:border-blue-700"
                    />
                    <div className="relative">
                      <textarea
                        id="visitor-log-message"
                        value={form.message}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, message: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        maxLength={MAX_MESSAGE_CHARACTERS}
                        required
                        rows={2}
                        placeholder="Write a comment for me (Press Enter to send)"
                        aria-label="Write a comment"
                        className="w-full resize-none rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 pr-12 text-xs leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-blue-400 focus:outline-none dark:text-white dark:focus:border-blue-700"
                      />
                      <button
                        type="submit"
                        disabled={
                          isSubmitting || !turnstileToken || messageWordCount > MAX_MESSAGE_WORDS
                        }
                        className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
                        aria-label="Post comment"
                        title="Post comment"
                      >
                        {isSubmitting ? (
                          <LoaderCircle size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                      </button>
                    </div>
                    <div
                      className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
                      aria-hidden="true"
                    >
                      <label htmlFor="visitor-log-website">Website</label>
                      <input
                        id="visitor-log-website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={form.website}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, website: event.target.value }))
                        }
                      />
                    </div>
                    <div ref={turnstileMountRef} className="min-h-[65px]" />

                    {error ? (
                      <p
                        role="alert"
                        className="text-[11px] leading-relaxed text-red-600 dark:text-red-400"
                      >
                        {error}
                      </p>
                    ) : null}
                    {notice ? (
                      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-green-600 dark:text-green-400">
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                        {notice}
                      </p>
                    ) : null}
                  </form>

                  <div className="my-5 border-t border-neutral-100 dark:border-neutral-900" />
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-[10px] font-bold font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                      Recent comments
                    </h3>
                  </div>
                  <GuestbookMessages entries={entries} />
                </>
              )}
            </div>
          </dialog>
        </div>
      ) : null}
    </>
  );
}
