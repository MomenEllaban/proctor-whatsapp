import { NextResponse } from "next/server";
import { getOptionalCurrentUser } from "@/lib/data";
import { extractRowsFromText } from "@/lib/extract";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });

  const rl = rateLimit(`text:${user.id}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `حد الاستخراج اليومي انتهى — أعد المحاولة بعد ${rl.retryAfterSeconds} ثانية.` },
      { status: 429 },
    );
  }

  const { text } = await req.json().catch(() => ({}));
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "الصق نصًا" }, { status: 400 });
  }
  if (text.length > 24000) {
    return NextResponse.json({ error: "النص طويل جدًا — قسّمه لدفعات أصغر" }, { status: 413 });
  }

  try {
    const { rows, warnings } = await extractRowsFromText(text);
    return NextResponse.json({ rows, warnings, count: rows.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "تعذر استخراج البيانات" },
      { status: 502 },
    );
  }
}