import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseSignUp } from "@/lib/data";
import { authPolicyError, isDemo } from "@/lib/env";
import { demoLogin } from "@/lib/data";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `محاولات كثيرة. حاول مرة أخرى بعد ${limit.retryAfterSeconds} ثانية.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const { email, password, invite } = await req.json().catch(() => ({}));
  if (!email || password?.length < 8) {
    return NextResponse.json(
      { error: "أدخل بريدًا صحيحًا وكلمة مرور من 8 أحرف على الأقل" },
      { status: 400 },
    );
  }

  const policy = authPolicyError(email, invite ?? "");
  if (policy) {
    return NextResponse.json({ error: policy }, { status: 403 });
  }

  if (isDemo) {
    const user = await demoLogin(email, password);
    if (!user) {
      return NextResponse.json({ error: "كلمة مرور الدخول التجريبي غير صحيحة" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user });
  }

  const res = await supabaseSignUp(email, password);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  // Supabase may require email confirmation before a session can be created.
  const supabase = createServerSupabase();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    const confirmationRequired = /confirm|verified|not confirmed/i.test(
      signInError.message,
    );
    if (confirmationRequired) {
      return NextResponse.json({
        ok: true,
        confirmRequired: true,
        error: "تم إنشاء الحساب. أكّد بريدك الإلكتروني أولًا ثم سجّل الدخول.",
      });
    }
    return NextResponse.json(
      { error: "تم إنشاء الحساب، لكن تعذر تسجيل الدخول تلقائيًا. حاول تسجيل الدخول." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    confirmRequired: !data.session,
  });
}