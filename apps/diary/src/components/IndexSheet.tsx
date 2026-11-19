import { useEffect, useMemo, useRef } from "react";
import { chapterOf, type DiaryEntry, formatEntryDate, matchesQuery } from "../lib/diary";
import { CloseIcon, SearchIcon } from "./icons";

interface IndexSheetProps {
  entries: DiaryEntry[];
  query: string;
  tag: string | null;
  onQueryChange: (query: string) => void;
  onTagChange: (tag: string | null) => void;
  onSelectEntry: (entry: DiaryEntry) => void;
  onClose?: () => void;
  /** Reading mode replaces the 3D book when WebGL is unavailable. */
  readingMode?: boolean;
}

/**
 * The index at the back of the book: search every page, filter by tag, and browse chapters.
 * The same filter also dims non-matching memories in the miniature world.
 */
export function IndexSheet({
  entries,
  query,
  tag,
  onQueryChange,
  onTagChange,
  onSelectEntry,
  onClose,
  readingMode = false,
}: IndexSheetProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!readingMode) searchRef.current?.focus({ preventScroll: true });
  }, [readingMode]);

  const tags = useMemo(
    () => [...new Set(entries.flatMap((entry) => entry.tags))].sort(),
    [entries],
  );
  const matches = entries.filter(
    (entry) => matchesQuery(entry, query) && (!tag || entry.tags.includes(tag)),
  );
  const chapters = [...new Set(matches.map(chapterOf))].sort().reverse();

  const body = (
    <>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-hand text-2xl text-ink-soft">
            {readingMode ? "Reading mode" : "At the back of the book"}
          </p>
          <h1 id="index-title" className="font-story text-4xl text-ink">
            {readingMode ? "Ryan's Diary" : "Index"}
          </h1>
        </div>
        {onClose ? (
          <button
            type="button"
            className="quiet-button"
            onClick={onClose}
            aria-label="Close the index"
          >
            <CloseIcon />
          </button>
        ) : null}
      </header>

      <label className="mt-6 flex items-center gap-3 text-ink-soft" htmlFor="diary-search">
        <SearchIcon />
        <span className="sr-only-text">Search the pages</span>
        <input
          ref={searchRef}
          id="diary-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search the pages…"
          className="journal-field"
          autoComplete="off"
        />
      </label>

      {tags.length > 0 ? (
        <fieldset className="mt-5 flex flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only-text">Filter by tag</legend>
          {tags.map((item) => (
            <button
              key={item}
              type="button"
              className="wax-chip"
              aria-pressed={tag === item}
              onClick={() => onTagChange(tag === item ? null : item)}
            >
              #{item}
            </button>
          ))}
        </fieldset>
      ) : null}

      <p className="mt-6 font-hand text-xl text-ink-soft" aria-live="polite">
        {matches.length === entries.length && !query && !tag
          ? `${entries.length} ${entries.length === 1 ? "page" : "pages"} in this diary`
          : `${matches.length} of ${entries.length} ${entries.length === 1 ? "page matches" : "pages match"}`}
      </p>

      {chapters.map((chapter) => (
        <section key={chapter} className="mt-6" aria-labelledby={`chapter-${chapter}`}>
          <h2 id={`chapter-${chapter}`} className="font-story text-2xl text-ink">
            Chapter {chapter}
          </h2>
          <ul className="mt-2 divide-y divide-dashed divide-[rgb(91_53_25/0.3)]">
            {matches
              .filter((entry) => chapterOf(entry) === chapter)
              .map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`/${entry.slug}`}
                    onClick={(event) => {
                      event.preventDefault();
                      onSelectEntry(entry);
                    }}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-ink no-underline hover:text-wax"
                  >
                    <span className="font-hand text-[1.6rem] leading-tight">{entry.title}</span>
                    <span className="font-story text-sm italic text-ink-soft">
                      {formatEntryDate(entry.entryDate)}
                    </span>
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ))}

      {matches.length === 0 ? (
        <p className="mt-6 font-hand text-2xl text-ink-soft">No page mentions that yet.</p>
      ) : null}
    </>
  );

  if (readingMode) {
    return (
      <main className="parchment-screen">
        <section className="sheet parchment" aria-labelledby="index-title">
          {body}
        </section>
      </main>
    );
  }
  return (
    <div className="sheet-backdrop">
      <button
        type="button"
        className="sheet-dismiss"
        onClick={onClose}
        aria-label="Close the index by clicking outside it"
        tabIndex={-1}
      />
      <div
        className="sheet parchment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="index-title"
      >
        {body}
      </div>
    </div>
  );
}
