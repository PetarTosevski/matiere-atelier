import "server-only";
import sharp from "sharp";

// Processes an uploaded photo: auto-rotate from EXIF, strip all metadata
// (phone photos carry GPS location), fit within 2560 px, save as WebP.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_EDGE = 2560;

export type ImageProblem = "tooLarge" | "heic" | "unsupported" | "unreadable";

export class ImageError extends Error {
  constructor(public readonly problem: ImageProblem) {
    super(problem);
  }
}

/** Identifies the format from the file's first bytes, not its name. */
export function sniffImageType(bytes: Uint8Array): "jpeg" | "png" | "webp" | "heic" | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(ascii(8, 12))) {
    return "heic";
  }
  return null;
}

export async function processImage(
  bytes: Uint8Array,
): Promise<{ data: Buffer; width: number; height: number }> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new ImageError("tooLarge");
  const type = sniffImageType(bytes);
  if (type === "heic") throw new ImageError("heic");
  if (!type) throw new ImageError("unsupported");

  try {
    // sharp drops EXIF, GPS and other metadata unless asked to keep it.
    const { data, info } = await sharp(bytes)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new ImageError("unreadable");
  }
}
