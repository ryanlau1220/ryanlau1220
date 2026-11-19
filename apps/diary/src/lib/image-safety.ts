/**
 * Uploaded photos are re-encoded in the browser, which drops all metadata. The server still
 * inspects the bytes so a crafted request cannot store a photo with EXIF/GPS or XMP data.
 */

export type PhotoFormat = "jpeg" | "webp";

export function detectPhotoFormat(bytes: Uint8Array): PhotoFormat | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** True when the image carries EXIF or XMP metadata (where location data lives). */
export function hasEmbeddedMetadata(bytes: Uint8Array): boolean {
  const format = detectPhotoFormat(bytes);
  if (format === "jpeg") {
    let offset = 2;
    while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break; // start of scan / end of image
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (marker === 0xe1) return true; // APP1 holds EXIF and XMP
      offset += 2 + length;
    }
    return false;
  }
  if (format === "webp") {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      if (id === "EXIF" || id === "XMP ") return true;
      const size =
        bytes[offset + 4] |
        (bytes[offset + 5] << 8) |
        (bytes[offset + 6] << 16) |
        (bytes[offset + 7] << 24);
      offset += 8 + size + (size % 2);
    }
    return false;
  }
  return false;
}
