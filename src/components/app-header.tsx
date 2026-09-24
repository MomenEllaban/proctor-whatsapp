"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { post } from "@/lib/client-api";

export function AppHeader({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName: string | null;
}) {
  const router = useRouter();

  const logout = async () => {
    await post("/api/auth", {});
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-head text-headink">
      <div
        style={{ height: "env(safe-area-inset-top, 0px)" }}
        aria-hidden="true"
      />
      <div className="safe-x mx-auto flex max-w-3xl items-center justify-between gap-2 py-3">
        <Link
          href="/lists"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-white no-underline"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wa/90 text-lg text-green-d">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Z" />
            </svg>
          </span>
          <span className="min-w-0 truncate font-extrabold leading-tight text-white">
            مراقبو الامتحانات
            <span className="block text-xs font-semibold text-headsub">WhatsApp</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className="hidden max-w-40 truncate text-sm text-headsub lg:block"
            title={userEmail}
          >
            {userName ?? userEmail}
          </span>
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="icon-btn text-headsub hover:text-headink"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path d="M10 17l5-5-5-5v3H3v4h7v3Zm9-14h-8v2h6v14h-6v2h8V3Z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}