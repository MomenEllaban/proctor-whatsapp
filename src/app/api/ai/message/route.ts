import { NextResponse } from "next/server";
import { getOptionalCurrentUser } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";
import { writeMessageWithAi } from "@/lib/ai-message";
import {
  MESSAGE_STYLES,
  validateMessageVariables,
  type MessageStyle,
} from "@/lib/message";

export async function POST(req: Request) {
  const user = await getOptionalCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسموح" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`ai:${user.id}:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "طلبات كثيرة على المساعد الآن — جرّب بعد قليل." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const style = (body as { style?: string })?.style;
  if (typeof style !== "string" || !MESSAGE_STYLES.includes(style as MessageStyle)) {
    return NextResponse.json({ error: "أسلوب غير معروف" }, { status: 400 });
  }
  const variables = (body as { variables?: Record<string, string> }).variables;
  if (!variables || typeof variables !== "object") {
    return NextResponse.json({ error: "متغيرات ناقصة" }, { status: 400 });
  }

  const clean = {
    exam: String(variables.exam ?? "").slice(0, 120),
    location: String(variables.location ?? "").slice(0, 160),
    groupUrl: String(variables.groupUrl ?? "").slice(0, 500),
    examDate: String(variables.examDate ?? "").slice(0, 120),
  };
  if (Object.keys(validateMessageVariables(clean)).length > 0) {
    return NextResponse.json(
      { error: "أكمل المتغيرات قبل طلب الصياغة." },
      { status: 400 },
    );
  }

  const { message, source } = await writeMessageWithAi(
    clean,
    style as MessageStyle,
  );
  return NextResponse.json({ message, source });
}
