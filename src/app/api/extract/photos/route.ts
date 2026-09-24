import { NextResponse } from "next/server";
import { getOptionalCurrentUser } from "@/lib/data";
import { extractRowsFromImages } from "@/lib/extract";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_IMAGES = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"]);

function guessType(file: File): string {
  const t = file.type.toLowerCase();
  if (ALLOWED.has(t)) return t;
  const n = file.name.toLowerCase();
  if (n.endsWith(".heic")) return "image/heic";
  if (n.endsWith(".heif")) return "image/heif";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  return t.startsWith("image/") ? t : "";
}

function hasExpectedSignature(buffer: Buffer, type: string): boolean {
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/gif") return buffer.subarray(0, 3).toString("ascii") === "GIF";
  if (type === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (type === "image/heic" || type === "image/heif") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  return false;
}

export async function POST(req: Request) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });

  const rl = rateLimit(`extract:${user.id}`, 24, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `حدك اليومي من تحويل الصور انتهى — أعد المحاولة بعد ${rl.retryAfterSeconds} ثانية.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "أرسل الصور بصيغة multipart/form-data" }, { status: 400 });
  }

  const files = form.getAll("images").filter((v): v is File => v instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "لم يتم استلام أي صور" }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `الحد الأقصى ${MAX_IMAGES} صور في المرة الواحدة` }, { status: 400 });
  }

  const images: { name: string; mediaType: string; base64: string }[] = [];
  let totalBytes = 0;
  for (const file of files) {
    const type = guessType(file);
    if (!type) {
      return NextResponse.json({ error: `نوع الملف غير مدعوم (${file.name})` }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `الصورة كبيرة جدًا (${file.name}) — الحد ${MAX_BYTES / 1024 / 1024}MB` },
        { status: 413 },
      );
    }
    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { error: `إجمالي الصور أكبر من الحد المسموح (${MAX_TOTAL_BYTES / 1024 / 1024}MB)` },
        { status: 413 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedSignature(buf, type)) {
      return NextResponse.json(
        { error: `محتوى الملف لا يطابق نوع الصورة (${file.name})` },
        { status: 415 },
      );
    }
    images.push({ name: file.name, mediaType: type, base64: buf.toString("base64") });
  }

  try {
    const { rows, warnings } = await extractRowsFromImages(images);
    return NextResponse.json({ rows, warnings, count: rows.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "تعذر معالجة الصور";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}