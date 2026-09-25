"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { post } from "@/lib/client-api";
import { ROLE_LABELS, type UserRole } from "@/lib/types";
import { AuthHeading } from "./auth-heading";

export interface DemoAccount {
  email: string;
  name: string;
  role: UserRole;
}

export default function LoginForm({
  demoAccounts,
  demoPassword,
  allowedDomains,
}: {
  demoAccounts: DemoAccount[];
  demoPassword: string | null;
  allowedDomains: string[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const go = async (mail: string, pass: string) => {
    setError("");
    setBusy(true);
    const res = await post("/api/auth/login", { email: mail, password: pass });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "خطأ في الدخول");
      return;
    }
    router.replace("/lists");
    router.refresh();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(email, password);
  };

  const quick = async (account: DemoAccount) => {
    if (!demoPassword) return;
    setError("");
    setBusyEmail(account.email);
    const res = await post("/api/auth/login", {
      email: account.email,
      password: demoPassword,
    });
    setBusyEmail(null);
    if (!res.ok) return setError(res.error ?? "خطأ في الدخول");
    router.replace("/lists");
    router.refresh();
  };

  const initial = (name: string, mail: string) =>
    (name || mail)[0]?.toUpperCase() ?? "؟";

  return (
    <div>
      <AuthHeading
        title="تسجيل الدخول"
        subtitle="نظام مراقبو الامتحانات — للمشرفين المعتمدين فقط"
      />

      <div className="auth-features mb-4">
        <div className="auth-feature">
          ✉️ رسالة جاهزة
          <span>قالب رسمي بأسهم كل مراقب</span>
        </div>
        <div className="auth-feature">
          👥 قوائم المراقبين
          <span>من صورة أو لصق أو يدوي</span>
        </div>
        <div className="auth-feature">
          ✅ متابعة الفتح
          <span>مينفتحش واتساب ومينفعش</span>
        </div>
        <div className="auth-feature">
          🤖 مساعد صياغة
          <span>صياغة بالذكاء الاصطناعي</span>
        </div>
      </div>

      {demoAccounts.length > 0 && demoPassword && (
        <section aria-label="حسابات تجريبية" className="card mb-4">
          <h2 className="m-0 mb-1 text-sm font-bold">دخول سريع (حسابات تجريبية)</h2>
          <p className="m-0 mb-3 text-xs text-muted">
            بيانات وهمية بالكامل — اضغط على أي حساب وافتتح مباشرة.
          </p>
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {demoAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-card p-2 text-start transition hover:border-brand hover:bg-tint disabled:opacity-60"
                onClick={() => quick(a)}
                disabled={busyEmail !== null}
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-head text-sm font-bold text-headink"
                >
                  {initial(a.name, a.email)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">
                    {a.name}
                    <span className="badge">{ROLE_LABELS[a.role]}</span>
                  </span>
                  <span className="block truncate text-xs text-muted" dir="ltr">
                    {busyEmail === a.email ? "جارٍ الدخول..." : a.email}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <form className="card" onSubmit={submit}>
        <label className="mb-1 block text-sm font-bold" htmlFor="email">
          البريد الإلكتروني الجامعي
        </label>
        <input
          id="email"
          type="email"
          className="input"
          dir="ltr"
          autoComplete="email"
          required
          placeholder={`name@${allowedDomains[0] ?? "horus.edu.eg"}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mb-0 mt-1 text-xs text-muted">
          النطاق المسموح:{" "}
          <span className="domain-hint">
            @{allowedDomains.join(" , @") || "horus.edu.eg"}
          </span>
        </p>
        <label className="mb-1 mt-3 block text-sm font-bold" htmlFor="password">
          كلمة المرور
        </label>
        <input
          id="password"
          type="password"
          className="input"
          dir="ltr"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="mt-3 font-bold text-danger">
            {error}
          </p>
        )}
        <button className="btn mt-4 w-full" disabled={busy}>
          {busy ? "جارٍ الدخول..." : "دخول"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        ليس لديك حساب؟{" "}
        <Link href="/signup" className="inline-flex min-h-11 items-center font-bold text-brand">
          إنشاء حساب
        </Link>
      </p>

      <p className="mb-0 text-center text-xs text-muted">
        الحسابات مقصورة على نطاق الجامعة الرسمي. الحسابات التجريبية تظهر في وضع
        الديمو فقط. يُستخدم التطبيق في فتح WhatsApp فقط ولا يرسل أي شيء تلقائيًا.
      </p>
    </div>
  );
}