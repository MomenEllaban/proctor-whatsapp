"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand";
import { post } from "@/lib/client-api";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export function AppHeader({
  userEmail,
  userName,
  role,
}: {
  userEmail: string;
  userName: string | null;
  role: UserRole;
}) {
  const router = useRouter();

  const logout = async () => {
    await post("/api/auth", {});
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 app-head">
      <div
        style={{ height: "env(safe-area-inset-top, 0px)" }}
        aria-hidden="true"
      />
      <div className="app-head-bar">
        <Link
          href="/lists"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-white no-underline"
        >
          <BrandMark size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold leading-tight">
              نظام مراقبو الامتحانات
            </span>
            <span className="block truncate text-[0.68rem] font-semibold leading-tight opacity-80">
              جامعة حورس — كلية الهندسة
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          {role === "admin" && (
            <Link href="/admin" className="head-action" title="لوحة التحكم">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" />
              </svg>
              <span className="head-action-text">لوحة التحكم</span>
            </Link>
          )}
          <span className={`head-role head-role-${role}`} title={`الصلاحية: ${ROLE_LABELS[role]}`}>
            {ROLE_LABELS[role]}
          </span>
          <span className="hidden max-w-40 truncate text-sm opacity-80 lg:block" title={userEmail}>
            {userName ?? userEmail}
          </span>
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="icon-btn text-white/80 hover:text-white"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
              <path d="M10 17l5-5-5-5v3H3v4h7v3Zm9-14h-8v2h6v14h-6v2h8V3Z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
