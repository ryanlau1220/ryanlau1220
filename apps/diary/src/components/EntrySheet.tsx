import { useEffect, useRef, useState } from "react";
import { chapterOf, type DiaryEntry, type DiaryPhoto, formatEntryDate } from "../lib/diary";
import { CloseIcon, LinkIcon } from "./icons";

interface EntrySheetProps {
  entry: DiaryEntry;
  isOwner: boolean;
  onClose: () => void;
  onSelectTag: (tag: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** One diary page: the full memory, opened from its object in the miniature world. */
export function EntrySheet({
  entry,
  isOwner,
  onClose,
  onSelectTag,
  onEdit,
  onDelete,
}: EntrySheetProps) {
  const [zoomed, setZoomed] = useState<DiaryPhoto | null>(null);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${entry.slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="sheet-backdrop">
      <button
        type="button"
        className="sheet-dismiss"
        onClick={onClose}
        aria-label="Close this page by clicking outside it"
        tabIndex={-1}
      />
      <article className="sheet parchment" aria-labelledby="entry-title">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-hand text-2xl text-ink-soft">
              Chapter {chapterOf(entry)} · {formatEntryDate(entry.entryDate)}
            </p>
            <h1
              id="entry-title"
              className="mt-1 font-story text-[clamp(2rem,5vw,3.1rem)] leading-tight text-ink"
            >
              {entry.title}
            </h1>
            {entry.eventName ? (
              <p className="mt-2 font-story text-lg italic text-ink-soft">{entry.eventName}</p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="quiet-button shrink-0"
            onClick={onClose}
            aria-label="Close this page"
          >
            <CloseIcon />
          </button>
        </header>

        {entry.photos.length > 0 ? (
          <section aria-label="Photographs" className="mt-8 flex flex-wrap justify-center gap-6">
            {entry.photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                className="polaroid cursor-zoom-in"
                style={{ "--tilt": `${index % 2 === 0 ? -2.2 : 1.8}deg` } as React.CSSProperties}
                onClick={() => setZoomed(photo)}
                aria-label={`Enlarge photo${photo.alt ? `: ${photo.alt}` : ""}`}
              >
                <img
                  src={photo.url}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto max-h-[22rem] w-auto max-w-[min(26rem,72vw)] object-cover"
                />
              </button>
            ))}
          </section>
        ) : null}

        <div className="mt-10 grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <section aria-labelledby="takeaways-heading">
            <h2 id="takeaways-heading" className="font-story text-2xl text-ink">
              Key takeaways
            </h2>
            {entry.takeaways.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {entry.takeaways.map((takeaway, index) => (
                  <li
                    key={index}
                    className="flex gap-3 font-hand text-[1.55rem] leading-snug text-ink"
                  >
                    <span className="text-wax" aria-hidden="true">
                      ✦
                    </span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 font-hand text-2xl text-ink-soft">Nothing written here yet.</p>
            )}
          </section>
          <section aria-labelledby="feeling-heading">
            <h2 id="feeling-heading" className="font-story text-2xl text-ink">
              How I felt
            </h2>
            <p className="mt-3 whitespace-pre-line font-hand text-[1.55rem] leading-snug text-ink">
              {entry.feeling || "Nothing written here yet."}
            </p>
          </section>
        </div>

        {entry.links.length > 0 ? (
          <section aria-labelledby="links-heading" className="mt-10">
            <h2 id="links-heading" className="font-story text-2xl text-ink">
              Keepsakes
            </h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {entry.links.map((link) => (
                <li key={link.url}>
                  <a
                    className="quiet-button"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LinkIcon />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-[rgb(91_53_25/0.35)] pt-6">
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <button key={tag} type="button" className="wax-chip" onClick={() => onSelectTag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="quiet-button" onClick={copyLink}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            {isOwner && onEdit ? (
              <button type="button" className="quiet-button" onClick={onEdit}>
                Edit page
              </button>
            ) : null}
            {isOwner && onDelete ? (
              <button type="button" className="quiet-button text-wax" onClick={onDelete}>
                Tear out page
              </button>
            ) : null}
          </div>
        </footer>
      </article>

      {zoomed ? (
        <button
          type="button"
          className="photo-zoom"
          onClick={(event) => {
            event.stopPropagation();
            setZoomed(null);
          }}
          aria-label="Close enlarged photo"
        >
          <img src={zoomed.url} alt={zoomed.alt} width={zoomed.width} height={zoomed.height} />
        </button>
      ) : null}
    </div>
  );
}
