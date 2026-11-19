import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  Component,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { deleteEntry, signOut } from "../diary.functions";
import { getDiaryAudio } from "../lib/audio";
import { chapterOf, type DiaryEntry, formatEntryDate, matchesQuery } from "../lib/diary";
import { useSceneQuality } from "../lib/quality";
import type { Phase } from "../scene/phase";
import { EntrySheet } from "./EntrySheet";
import { IndexSheet } from "./IndexSheet";
import { BackIcon, QuillIcon, SoundOffIcon, SoundOnIcon } from "./icons";

const DiaryScene = lazy(() => import("../scene/DiaryScene"));
const EntryEditor = lazy(() => import("./EntryEditor"));

interface DiaryExperienceProps {
  entries: DiaryEntry[];
  isOwner: boolean;
  activeSlug: string | null;
}

class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

type EditorState = { mode: "new" } | { mode: "edit"; entry: DiaryEntry } | null;

export function DiaryExperience({ entries, isOwner, activeSlug }: DiaryExperienceProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const quality = useSceneQuality();
  const audio = getDiaryAudio();

  const selectedEntry = useMemo(
    () => (activeSlug ? (entries.find((entry) => entry.slug === activeSlug) ?? null) : null),
    [activeSlug, entries],
  );
  // A shared link lands straight in its chapter's world with the page open.
  const startsInside = useRef(Boolean(selectedEntry)).current;

  const [phase, setPhase] = useState<Phase>(startsInside ? "world" : "cover");
  const [chapter, setChapter] = useState<string | null>(
    selectedEntry ? chapterOf(selectedEntry) : null,
  );
  const [clientReady, setClientReady] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [flutter, setFlutter] = useState(0);
  const [indexOpen, setIndexOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(audio.isEnabled);
  const [editor, setEditor] = useState<EditorState>(null);
  const yaw = useRef(0);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const lastDragAt = useRef(0);

  useEffect(() => {
    setClientReady(true);
    setWebgl(supportsWebGL());
    const unsubscribe = audio.subscribe(setSoundOn);
    void Promise.all([
      document.fonts.load('600 64px "Caveat"'),
      document.fonts.load('64px "IM Fell English"'),
    ]).finally(() => setFontsReady(true));
    return () => {
      unsubscribe();
    };
  }, [audio]);

  // Following a link (or the Index) to an entry carries the scene into its chapter.
  useEffect(() => {
    if (!selectedEntry) return;
    setChapter(chapterOf(selectedEntry));
    setPhase("world");
  }, [selectedEntry]);

  const chapters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries)
      counts.set(chapterOf(entry), (counts.get(chapterOf(entry)) ?? 0) + 1);
    return [...counts.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, count]) => ({ year, count }));
  }, [entries]);

  const worldEntries = useMemo(
    () => entries.filter((entry) => chapterOf(entry) === chapter),
    [entries, chapter],
  );
  const dimmedIds = useMemo(
    () =>
      new Set(
        worldEntries
          .filter((entry) => !(matchesQuery(entry, query) && (!tag || entry.tags.includes(tag))))
          .map((entry) => entry.id),
      ),
    [worldEntries, query, tag],
  );

  const openBook = useCallback(() => {
    audio.unlock();
    audio.play("open");
    setPhase("open");
  }, [audio]);

  const enterChapter = useCallback(
    (year: string) => {
      audio.unlock();
      audio.play("page");
      setChapter(year);
      setFlutter((value) => value + 1);
      window.setTimeout(
        () => {
          setPhase("world");
          window.setTimeout(() => audio.play("chime"), 1400);
        },
        quality.reducedMotion ? 0 : 900,
      );
    },
    [audio, quality.reducedMotion],
  );

  const openEntry = useCallback(
    (entry: DiaryEntry) => {
      if (performance.now() - lastDragAt.current < 250) return;
      audio.unlock();
      audio.play("click");
      setIndexOpen(false);
      void navigate({ to: "/$slug", params: { slug: entry.slug } });
    },
    [audio, navigate],
  );

  const closeEntry = useCallback(() => {
    audio.play("close");
    void navigate({ to: "/" });
  }, [audio, navigate]);

  const goBack = useCallback(() => {
    audio.play("close");
    if (selectedEntry) void navigate({ to: "/" });
    setPhase((current) => (current === "world" ? "open" : "cover"));
  }, [audio, navigate, selectedEntry]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || editor) return;
      if (indexOpen) setIndexOpen(false);
      else if (selectedEntry) closeEntry();
      else if (phase !== "cover") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeEntry, editor, goBack, indexOpen, phase, selectedEntry]);

  const refresh = async (slug?: string) => {
    await router.invalidate();
    if (slug) await navigate({ to: "/$slug", params: { slug } });
  };

  const tearOut = async (entry: DiaryEntry) => {
    if (!window.confirm(`Tear out "${entry.title}"? This deletes the page and its photos.`)) return;
    await deleteEntry({ data: entry.id });
    await navigate({ to: "/" });
    await router.invalidate();
  };

  const toggleSound = () => audio.setEnabled(!soundOn);

  // ---------------------------------------------------------------------------

  const readingFallback = (
    <IndexSheet
      readingMode
      entries={entries}
      query={query}
      tag={tag}
      onQueryChange={setQuery}
      onTagChange={setTag}
      onSelectEntry={openEntry}
    />
  );

  return (
    <div
      className="diary-stage"
      onPointerDown={(event) => {
        if (phase === "world") drag.current = { x: event.clientX, moved: false };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current) return;
        const dx = event.clientX - current.x;
        if (Math.abs(dx) > 4) current.moved = true;
        if (current.moved) {
          yaw.current += dx * 0.006;
          current.x = event.clientX;
        }
      }}
      onPointerUp={() => {
        if (drag.current?.moved) lastDragAt.current = performance.now();
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      {/* Real text for search engines, screen readers, and visitors without WebGL. */}
      <section className="sr-only-text" aria-label="Diary pages">
        <h1>Ryan's Diary</h1>
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <a href={`/${entry.slug}`}>
                {entry.title} — {formatEntryDate(entry.entryDate)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {clientReady && webgl ? (
        <SceneBoundary fallback={readingFallback}>
          <Suspense fallback={null}>
            <DiaryScene
              phase={phase}
              instant={startsInside}
              chapters={chapters}
              entries={worldEntries}
              dimmedIds={dimmedIds}
              selectedId={selectedEntry?.id ?? null}
              quality={quality}
              fontsReady={fontsReady}
              flutter={flutter}
              yaw={yaw}
              onOpen={openBook}
              onSelectChapter={enterChapter}
              onSelectEntry={openEntry}
              onReady={() => setSceneReady(true)}
            />
          </Suspense>
        </SceneBoundary>
      ) : null}
      {clientReady && !webgl ? readingFallback : null}
      <div className="stage-veil" />
      <div className="loading-candle" data-done={sceneReady || !webgl} aria-hidden={sceneReady}>
        <span>Lighting the candle…</span>
      </div>

      {sceneReady && phase === "cover" ? (
        <button
          type="button"
          className="hud-hint"
          style={{ pointerEvents: "auto", background: "none", border: 0, cursor: "pointer" }}
          onClick={openBook}
        >
          Open the diary
        </button>
      ) : null}
      {sceneReady && phase === "open" ? (
        <nav className="chapter-picker" aria-label="Choose a chapter">
          {chapters.map((item) => (
            <button
              key={item.year}
              type="button"
              className="hud-button"
              onClick={() => enterChapter(item.year)}
            >
              Chapter {item.year}
            </button>
          ))}
        </nav>
      ) : null}
      {sceneReady && phase === "world" && !selectedEntry ? (
        <p className="hud-hint">Drag to look around · choose a glowing memory</p>
      ) : null}

      {sceneReady && webgl ? (
        <>
          <button
            type="button"
            className="ribbon-bookmark"
            onClick={() => {
              audio.unlock();
              audio.play("page");
              setIndexOpen(true);
            }}
          >
            Index
          </button>
          <div className="fixed bottom-[max(1.2rem,env(safe-area-inset-bottom))] left-[max(1.2rem,env(safe-area-inset-left))] flex flex-wrap gap-2">
            {phase !== "cover" ? (
              <button type="button" className="hud-button" onClick={goBack}>
                <BackIcon />
                {phase === "world" ? "Back to contents" : "Close the diary"}
              </button>
            ) : null}
            <button
              type="button"
              className="hud-button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? "Mute sound" : "Turn sound on"}
            >
              {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
            {isOwner ? (
              <>
                <button
                  type="button"
                  className="hud-button"
                  onClick={() => setEditor({ mode: "new" })}
                >
                  <QuillIcon />
                  Write a page
                </button>
                <button
                  type="button"
                  className="hud-button"
                  onClick={async () => {
                    await signOut();
                    window.location.assign("/");
                  }}
                >
                  Sign out
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {(tag || query) && phase === "world" && !indexOpen ? (
        <button
          type="button"
          className="hud-button fixed top-[max(1.2rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2"
          onClick={() => {
            setTag(null);
            setQuery("");
          }}
        >
          Showing {tag ? `#${tag}` : `“${query}”`} · clear
        </button>
      ) : null}

      {indexOpen ? (
        <IndexSheet
          entries={entries}
          query={query}
          tag={tag}
          onQueryChange={setQuery}
          onTagChange={setTag}
          onSelectEntry={openEntry}
          onClose={() => setIndexOpen(false)}
        />
      ) : null}

      {selectedEntry && !editor ? (
        <EntrySheet
          entry={selectedEntry}
          isOwner={isOwner}
          onClose={closeEntry}
          onSelectTag={(value) => {
            setTag(value);
            setIndexOpen(true);
          }}
          onEdit={isOwner ? () => setEditor({ mode: "edit", entry: selectedEntry }) : undefined}
          onDelete={isOwner ? () => void tearOut(selectedEntry) : undefined}
        />
      ) : null}

      {isOwner && editor ? (
        <Suspense fallback={null}>
          <EntryEditor
            entry={editor.mode === "edit" ? editor.entry : undefined}
            onClose={() => setEditor(null)}
            onSaved={(slug) => refresh(slug)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
