import { MessageSquarePlus } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";

const GUESTBOOK_SEEN_STORAGE_KEY = "portfolio:guestbook-seen:v1";

const loadGuestbook = () => import("./Guestbook").then((module) => ({ default: module.Guestbook }));

const Guestbook = lazy(loadGuestbook);

interface GuestbookButtonProps {
  hasUnseenGuestbook: boolean;
  onOpen: () => void;
  onPreload: () => void;
}

function GuestbookButton({ hasUnseenGuestbook, onOpen, onPreload }: GuestbookButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={onPreload}
      onFocus={onPreload}
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 text-neutral-800 dark:text-neutral-200 shadow-lg shadow-neutral-950/10 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer"
      aria-haspopup="dialog"
      aria-expanded="false"
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
  );
}

export function GuestbookLauncher() {
  const [hasLoadedGuestbook, setHasLoadedGuestbook] = useState(false);
  const [hasUnseenGuestbook, setHasUnseenGuestbook] = useState(false);

  useEffect(() => {
    try {
      setHasUnseenGuestbook(localStorage.getItem(GUESTBOOK_SEEN_STORAGE_KEY) === null);
    } catch {
      // When storage is unavailable, retain the non-persistent first-visit indicator.
      setHasUnseenGuestbook(true);
    }
  }, []);

  const preloadGuestbook = () => {
    void loadGuestbook();
  };

  const openGuestbook = () => {
    setHasUnseenGuestbook(false);
    setHasLoadedGuestbook(true);
    try {
      localStorage.setItem(GUESTBOOK_SEEN_STORAGE_KEY, "1");
    } catch {
      // The guestbook remains usable when browser storage is unavailable.
    }
  };

  if (!hasLoadedGuestbook) {
    return (
      <GuestbookButton
        hasUnseenGuestbook={hasUnseenGuestbook}
        onOpen={openGuestbook}
        onPreload={preloadGuestbook}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <GuestbookButton
          hasUnseenGuestbook={false}
          onOpen={openGuestbook}
          onPreload={preloadGuestbook}
        />
      }
    >
      <Guestbook initiallyOpen />
    </Suspense>
  );
}
