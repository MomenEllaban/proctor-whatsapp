"use client";

export interface PreparedImage {
  blob: Blob;
  name: string;
}

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Prepare photos for the vision extractor:
 * - HEIC (iPhone) -> JPEG via heic2any (lazy-loaded: browser-only library,
 *   so it must never be evaluated during server-side rendering)
 * - any image -> downscaled (max 1600px) JPEG via canvas
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const lowName = file.name.toLowerCase();
  const isHeic =
    lowName.endsWith(".heic") ||
    lowName.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif";

  if (isHeic) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = (await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: JPEG_QUALITY,
      })) as Blob | Blob[];
      const blob = Array.isArray(converted) ? converted[0] : converted;
      return { blob, name: file.name.replace(/\.(heic|heif)$/i, "") + ".jpg" };
    } catch {
      throw new Error("تعذر فك ترميز صورة HEIC — تأكد أنها ليست مرفوعة مقيّدة");
    }
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("الملف ليس صورة");
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("المتصفح لا يدعم معالجة الصور");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("تعذر ضغط الصورة"))),
        "image/jpeg",
        JPEG_QUALITY,
      ),
    );
    return { blob, name: file.name.replace(/\.[^.]*$/, "") + ".jpg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Convert an image blob to a base64 data URL for LLM consumption. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.readAsDataURL(blob);
  });
}