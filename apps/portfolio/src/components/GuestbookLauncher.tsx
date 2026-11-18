import { MessageSquarePlus } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const GUESTBOOK_SEEN_STORAGE_KEY = "portfolio:guestbook-seen:v1";

const loadGuestbook = () => import("./Guestbook").then((module) => ({ default: module.Guestbook }));

const Guestbook = lazy(loadGuestbook);

interface GuestbookButtonProps {
  hasUnseenGuestbook: boolean;
  onOpen: () => void;
  onPreload: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

function GuestbookButton({
  hasUnseenGuestbook,
  onOpen,
  onPreload,
  buttonRef,
}: GuestbookButtonProps) {
  return (
    <button
      type="button"
      ref={buttonRef}
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
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    try {
      setHasUnseenGuestbook(localStorage.getItem(GUESTBOOK_SEEN_STORAGE_KEY) === null);
    } catch {
      // When storage is unavailable, retain the non-persistent first-visit indicator.
      setHasUnseenGuestbook(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedGuestbook && openedRef.current) buttonRef.current?.focus({ preventScroll: true });
  }, [hasLoadedGuestbook]);

  const preloadGuestbook = () => {
    void loadGuestbook();
  };

  const openGuestbook = () => {
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (bounds) {
      setRipple({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        id: performance.now(),
      });
    }
    setHasUnseenGuestbook(false);
    openedRef.current = true;
    setHasLoadedGuestbook(true);
    try {
      localStorage.setItem(GUESTBOOK_SEEN_STORAGE_KEY, "1");
    } catch {
      // The guestbook remains usable when browser storage is unavailable.
    }
  };

  return (
    <>
      {ripple && (
        <div
          key={ripple.id}
          aria-hidden="true"
          className="guestbook-ripple"
          style={{ left: ripple.x, top: ripple.y }}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setRipple(null);
          }}
        >
          <span className="guestbook-ripple-ring" />
          <span className="guestbook-ripple-ring guestbook-ripple-ring-delayed" />
          <span className="guestbook-ripple-core" />
        </div>
      )}
      {!hasLoadedGuestbook ? (
        <GuestbookButton
          hasUnseenGuestbook={hasUnseenGuestbook}
          onOpen={openGuestbook}
          onPreload={preloadGuestbook}
          buttonRef={buttonRef}
        />
      ) : (
        <Suspense
          fallback={
            <GuestbookButton
              hasUnseenGuestbook={false}
              onOpen={openGuestbook}
              onPreload={preloadGuestbook}
              buttonRef={buttonRef}
            />
          }
        >
          <Guestbook initiallyOpen onClose={() => setHasLoadedGuestbook(false)} />
        </Suspense>
      )}
    </>
  );
}
