import { useState } from "react";
import { createEntry, deletePhoto, updateEntry, uploadPhoto } from "../diary.functions";
import { type DiaryEntry, type DiaryLink, LIMITS, slugify } from "../lib/diary";
import { preparePhoto } from "../lib/photo-prep";
import { CloseIcon } from "./icons";

interface EntryEditorProps {
  /** Omit to write a new page. */
  entry?: DiaryEntry;
  onClose: () => void;
  /** Called after the page is saved, with its (possibly new) link name. */
  onSaved: (slug: string) => void | Promise<void>;
  /** Called when photos change without saving the form; refreshes data only. */
  onPhotosChanged: () => void | Promise<void>;
}

function linesToLinks(value: string): DiaryLink[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first, ...rest] = line.split("|").map((part) => part.trim());
      return rest.length ? { label: first, url: rest.join("|") } : { label: "", url: first };
    });
}

/** Owner-only page editor. Loaded on demand, so visitors never download it. */
export default function EntryEditor({
  entry,
  onClose,
  onSaved,
  onPhotosChanged,
}: EntryEditorProps) {
  const [form, setForm] = useState({
    title: entry?.title ?? "",
    slug: entry?.slug ?? "",
    entryDate: entry?.entryDate ?? new Date().toISOString().slice(0, 10),
    eventName: entry?.eventName ?? "",
    takeaways: entry?.takeaways.join("\n") ?? "",
    feeling: entry?.feeling ?? "",
    tags: entry?.tags.join(", ") ?? "",
    links: entry?.links.map((link) => `${link.label} | ${link.url}`).join("\n") ?? "",
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(entry));
  const [files, setFiles] = useState<File[]>([]);
  const [photoAlt, setPhotoAlt] = useState("");
  const [photos, setPhotos] = useState(entry?.photos ?? []);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((current) => ({
        ...current,
        [field]: value,
        ...(field === "title" && !slugTouched ? { slug: slugify(value) } : {}),
      }));
    };

  const removePhoto = async (id: string) => {
    if (!window.confirm("Remove this photo from the page?")) return;
    setBusy(true);
    try {
      await deletePhoto({ data: id });
      setPhotos((current) => current.filter((photo) => photo.id !== id));
      // Keep the editor (and any unsaved edits) open; just refresh what the scene shows.
      await onPhotosChanged();
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "The photo could not be removed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        entryDate: form.entryDate,
        eventName: form.eventName,
        takeaways: form.takeaways.split("\n"),
        feeling: form.feeling,
        tags: form.tags.split(","),
        links: linesToLinks(form.links),
      };
      setStatus("Writing the page…");
      const saved = entry
        ? await updateEntry({ data: { id: entry.id, ...payload } })
        : await createEntry({ data: payload });
      if (!saved) throw new Error("The page could not be saved.");

      for (const [index, file] of files.entries()) {
        setStatus(`Developing photo ${index + 1} of ${files.length}…`);
        const prepared = await preparePhoto(file);
        const body = new FormData();
        body.set("entryId", saved.id);
        body.set("alt", photoAlt);
        body.set("width", String(prepared.width));
        body.set("height", String(prepared.height));
        body.set("file", new File([prepared.blob], "photo.jpg", { type: "image/jpeg" }));
        await uploadPhoto({ data: body });
      }
      setStatus("Saved.");
      await onSaved(saved.slug);
      onClose();
    } catch (saveError) {
      setStatus(null);
      setError(saveError instanceof Error ? saveError.message : "The page could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const label = "block font-story text-base text-ink-soft";
  return (
    <div className="sheet-backdrop" role="presentation">
      <form
        className="sheet parchment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        onSubmit={submit}
      >
        <header className="flex items-start justify-between gap-4">
          <h1 id="editor-title" className="font-story text-4xl text-ink">
            {entry ? "Edit this page" : "Write a new page"}
          </h1>
          <button
            type="button"
            className="quiet-button"
            onClick={onClose}
            aria-label="Close the editor"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className={label}>
            Title
            <input
              className="journal-field"
              required
              maxLength={LIMITS.title}
              value={form.title}
              onChange={update("title")}
            />
          </label>
          <label className={label}>
            Date
            <input
              className="journal-field"
              type="date"
              required
              value={form.entryDate}
              onChange={update("entryDate")}
            />
          </label>
          <label className={label}>
            Event name
            <input
              className="journal-field"
              maxLength={LIMITS.eventName}
              value={form.eventName}
              onChange={update("eventName")}
            />
          </label>
          <label className={label}>
            Link name ({typeof window === "undefined" ? "" : window.location.host}/…)
            <input
              className="journal-field"
              maxLength={LIMITS.slug}
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                update("slug")(event);
              }}
            />
          </label>
        </div>

        <label className={`${label} mt-5`}>
          Key takeaways (one per line)
          <textarea
            className="journal-field"
            rows={5}
            value={form.takeaways}
            onChange={update("takeaways")}
          />
        </label>
        <label className={`${label} mt-5`}>
          How I felt
          <textarea
            className="journal-field"
            rows={4}
            maxLength={LIMITS.feeling}
            value={form.feeling}
            onChange={update("feeling")}
          />
        </label>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className={label}>
            Tags (comma separated)
            <input className="journal-field" value={form.tags} onChange={update("tags")} />
          </label>
          <label className={label}>
            Links (one per line: label | https://…)
            <textarea
              className="journal-field"
              rows={3}
              value={form.links}
              onChange={update("links")}
            />
          </label>
        </div>

        <fieldset className="mt-6">
          <legend className={label}>Photos</legend>
          {photos.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-3">
              {photos.map((photo) => (
                <li key={photo.id} className="polaroid w-28">
                  <img src={photo.url} alt={photo.alt} className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    className="mt-1 font-hand text-lg text-wax underline"
                    onClick={() => removePhoto(photo.id)}
                    disabled={busy}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            className="mt-3 block font-story text-ink"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            onChange={(event) => setFiles([...(event.target.files ?? [])])}
          />
          {files.length > 0 ? (
            <label className={`${label} mt-3`}>
              Describe the new photos (for screen readers)
              <input
                className="journal-field"
                maxLength={LIMITS.photoAlt}
                value={photoAlt}
                onChange={(event) => setPhotoAlt(event.target.value)}
              />
            </label>
          ) : null}
          <p className="mt-2 font-hand text-lg text-ink-soft">
            Photos are resized and their location and camera data removed before upload.
          </p>
        </fieldset>

        {error ? (
          <p role="alert" className="mt-5 font-story text-wax">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex items-center gap-4">
          <button type="submit" className="ink-button" disabled={busy}>
            {busy ? "Saving…" : "Save page"}
          </button>
          {status ? <span className="font-hand text-xl text-ink-soft">{status}</span> : null}
        </div>
      </form>
    </div>
  );
}
