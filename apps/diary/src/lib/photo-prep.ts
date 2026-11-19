/** Longest edge of a stored photo. Large enough for a full-screen view, small enough to load fast. */
export const MAX_PHOTO_EDGE = 2000;

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Redraws the photo onto a canvas and re-encodes it as JPEG. Re-encoding discards every
 * metadata block (EXIF, GPS, XMP, camera serials), and the redraw applies the EXIF rotation first.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare photos.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86),
  );
  if (!blob) throw new Error("The photo could not be prepared.");
  return { blob, width, height };
}
