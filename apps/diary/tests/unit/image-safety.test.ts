import { describe, expect, it } from "vitest";
import { detectPhotoFormat, hasEmbeddedMetadata } from "../../src/lib/image-safety";

function jpeg(...segments: number[][]) {
  return new Uint8Array([0xff, 0xd8, ...segments.flat(), 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
}

function segment(marker: number, payload: number[]) {
  const length = payload.length + 2;
  return [0xff, marker, length >> 8, length & 0xff, ...payload];
}

function webp(...chunks: [string, number[]][]) {
  const body = chunks.flatMap(([id, data]) => [
    ...Array.from(id, (character) => character.charCodeAt(0)),
    data.length & 0xff,
    (data.length >> 8) & 0xff,
    0,
    0,
    ...data,
    ...(data.length % 2 ? [0] : []),
  ]);
  return new Uint8Array([
    ...Array.from("RIFF", (c) => c.charCodeAt(0)),
    0,
    0,
    0,
    0,
    ...Array.from("WEBP", (c) => c.charCodeAt(0)),
    ...body,
  ]);
}

describe("uploaded photo safety", () => {
  it("recognizes JPEG and WebP only", () => {
    expect(detectPhotoFormat(jpeg())).toBe("jpeg");
    expect(detectPhotoFormat(webp(["VP8 ", [1, 2]]))).toBe("webp");
    expect(detectPhotoFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it("flags JPEGs that still carry EXIF/XMP (where GPS lives)", () => {
    const clean = jpeg(segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]), segment(0xdb, [0, 1, 2]));
    const withExif = jpeg(
      segment(0xe0, [0x4a, 0x46]),
      segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0]),
    );
    expect(hasEmbeddedMetadata(clean)).toBe(false);
    expect(hasEmbeddedMetadata(withExif)).toBe(true);
  });

  it("flags WebPs with EXIF or XMP chunks", () => {
    expect(hasEmbeddedMetadata(webp(["VP8 ", [1, 2, 3]]))).toBe(false);
    expect(hasEmbeddedMetadata(webp(["VP8X", [0, 0, 0, 0]], ["EXIF", [1, 2]]))).toBe(true);
    expect(hasEmbeddedMetadata(webp(["VP8X", [0]], ["XMP ", [1]]))).toBe(true);
  });
});
