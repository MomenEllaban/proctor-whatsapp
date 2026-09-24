"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { post } from "@/lib/client-api";
import { AuthHeading } from "@/components/auth-heading";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    setBusy(true);
    const res = await post<{ confirmRequired?: boolean; error?: string }>(
      "/api/auth/signup",
      { email, password, invite },
    );
    setBusy(false);
    if (!res.ok || res.data?.confirmRequired) {
      setError(res.error ?? res.data?.error ?? "تعذر إنشاء الحساب");
      return;
    }
    router.replace("/lists");
    router.refresh();
  };

  return (
    <div>
      <AuthHeading
        title="إنشاء حساب"
        subtitle="للمشرفين المعتمدين فقط — البريد الرسمي أو كود دعوة"
      />

      <form className="card" onSubmit={submit}>
        <label className="mb-1 block text-sm font-bold" htmlFor="email">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          type="email"
          className="input"
          dir="ltr"
          autoComplete="email"
          required
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="mb-1 mt-3 block text-sm font-bold" htmlFor="password">
          كلمة المرور (8 أحرف على الأقل)
        </label>
        <input
          id="password"
          type="password"
          className="input"
          dir="ltr"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="mb-1 mt-3 block text-sm font-bold" htmlFor="invite">
          كود الدعوة
        </label>
        <input
          id="invite"
          type="text"
          className="input"
          dir="ltr"
          autoComplete="off"
          placeholder="كود الدعوة"
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
        />
        {error && (
          <p role="alert" className="mt-3 font-bold text-danger">
            {error}
          </p>
        )}
        <button className="btn mt-4 w-full" disabled={busy}>
          {busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        لديك حساب؟{" "}
        <Link href="/login" className="inline-flex min-h-11 items-center font-bold text-greend">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}