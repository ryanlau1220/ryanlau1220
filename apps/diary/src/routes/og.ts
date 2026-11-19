import { env } from "cloudflare:workers";
import { ImageResponse } from "@cf-wasm/og/workerd";
import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { chapterOf, formatEntryDate, isValidSlug } from "../lib/diary";
import { readEntryBySlug } from "../server/entries";
import caveat from "../server/fonts/caveat-600.woff.bin";
import imFell from "../server/fonts/im-fell-english-400.woff.bin";
import { DiaryCard, type DiaryCardProps, OG_SIZE } from "../server/og-card";

const FONTS = [
  { name: "IM Fell English", data: imFell, weight: 400 as const, style: "normal" as const },
  { name: "Caveat", data: caveat, weight: 600 as const, style: "normal" as const },
];

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function photoDataUrl(url: string | undefined) {
  const key = url?.replace(/^\/photos\//, "");
  if (!key) return null;
  const object = await env.PHOTOS.get(key);
  if (!object) return null;
  const type = object.httpMetadata?.contentType ?? "image/jpeg";
  return `data:${type};base64,${toBase64(new Uint8Array(await object.arrayBuffer()))}`;
}

async function cardFor(slug: string | null): Promise<DiaryCardProps | null> {
  if (!slug) {
    return {
      kicker: "A journey, page by page",
      title: "Ryan's Diary",
      subtitle: "Events attended, lessons kept, and moments worth remembering.",
      note: "Open the book and step inside.",
    };
  }
  if (!isValidSlug(slug)) return null;
  const entry = await readEntryBySlug(slug);
  if (!entry) return null;
  return {
    kicker: `Chapter ${chapterOf(entry)}`,
    title: entry.title,
    subtitle: entry.eventName,
    note: formatEntryDate(entry.entryDate),
    photoDataUrl: await photoDataUrl(entry.photos[0]?.url),
  };
}

export const Route = createFileRoute("/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const card = await cardFor(new URL(request.url).searchParams.get("entry"));
        if (!card) return new Response("Not found.", { status: 404 });
        return ImageResponse.async(createElement(DiaryCard, card), {
          ...OG_SIZE,
          fonts: FONTS,
          headers: { "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
