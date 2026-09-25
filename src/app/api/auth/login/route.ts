import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { env, isDemo, isAllowedDomain } from "@/lib/env";
import { demoLogin } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `محاولات كثيرة. حاول مرة أخرى بعد ${limit.retryAfterSeconds} ثانية.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "أدخل البريد الإلكتروني وكلمة المرور" }, { status: 400 });
  }

  // The university domain is enforced on every sign-in attempt.
  if (!isAllowedDomain(String(email))) {
    return NextResponse.json(
      { error: `الحسابات متاحة لـ ${env.allowedEmailDomains.map((d) => "@" + d).join(" أو ")} فقط.` },
      { status: 403 },
    );
  }

  if (isDemo) {
    const user = await demoLogin(email, password);
    if (!user) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user });
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}