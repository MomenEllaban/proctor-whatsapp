"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { patch, post } from "@/lib/client-api";

interface Share {
  share_token: string | null;
  share_enabled: boolean;
}

// window.location has no React state; read it through a subscription so the
// server render stays empty and hydration fills in the real origin.
function subscribeToNothing(): () => void {
  return () => {};
}
function getOriginSnapshot(): string {
  return window.location.origin;
}
function getServerOriginSnapshot(): string {
  return "";
}

/**
 * Owner-side share controls: the read-only link, an on/off switch that kills
 * the link without changing its URL, and a rotate button that invalidates every
 * copy already handed out.
 */
export function SharePanel({
  listId,
  path,
  initialEnabled,
}: {
  listId: string;
  /** `/s/<token>`, or null when the list has no token yet. */
  path: string | null;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [linkPath, setLinkPath] = useState(path);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const origin = useSyncExternalStore(
    subscribeToNothing,
    getOriginSnapshot,
    getServerOriginSnapshot,
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast("");
      toastTimer.current = null;
    }, 2600);
  };

  const applyShare = (share: Share, tokenPath: string | null) => {
    setEnabled(share.share_enabled);
    const token = share.share_token;
    setLinkPath(token ? `/s/${token}` : tokenPath);
  };

  const fullUrl = linkPath ? `${origin}${linkPath}` : "";

  const toggle = async () => {
    setBusy(true);
    const res = await patch<{ share: Share }>(
      `/api/lists/${encodeURIComponent(listId)}/share`,
      { enabled: !enabled },
    );
    setBusy(false);
    if (!res.ok || !res.data) return flash(res.error ?? "تعذر تغيير حالة المشاركة");
    applyShare(res.data.share, linkPath);
    flash(res.data.share.share_enabled ? "المشاركة مفتوحة ✓" : "المشاركة مقفولة");
  };

  const rotate = async () => {
    if (
      !window.confirm(
        "عمل لينك جديد يوقف اللينك القديم فورًا. أي حد عنده اللينك القديم مش هيقدر يفتح. تكمل؟",
      )
    )
      return;
    setBusy(true);
    const res = await post<{ share: Share }>(
      `/api/lists/${encodeURIComponent(listId)}/share`,
      {},
    );
    setBusy(false);
    if (!res.ok || !res.data) return flash(res.error ?? "تعذر إنشاء لينك جديد");
    applyShare(res.data.share, null);
    flash("تم إنشاء لينك جديد ✓");
  };

  const copy = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      flash("تم نسخ اللينك ✓");
    } catch {
      // The Clipboard API needs a secure context; over plain http, select it.
      const el = document.getElementById("share-link-url") as HTMLInputElement | null;
      el?.select();
      flash("انسخ اللينك من فوق");
    }
  };

  return (
    <section className="card" aria-labelledby="share-h">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="share-h" className="m-0 text-base font-extrabold">
          🔗 مشاركة القائمة
        </h2>
        <span className="badge">
          {enabled ? "المشاركة مفتوحة" : "المشاركة مقفولة"}
        </span>
      </div>

      <p className="my-0 mb-2 text-sm text-muted">
        {enabled
          ? "أي حد عنده اللينك بيفتحه من غير ما يعمل تسجيل دخول، ويضغط «فتح WhatsApp» فيفتح له واتساب بالرسالة مكتوبة بالاسم."
          : "المشاركة مقفولة دلوقتي. شغّلها عشان يبقى في لينك تقدر تبعتو."}
      </p>

      {!linkPath ? (
        <button type="button" className="btn w-full" onClick={rotate} disabled={busy}>
          إنشاء لينك مشاركة
        </button>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              id="share-link-url"
              className="input min-w-0 flex-1"
              dir="ltr"
              readOnly
              value={fullUrl}
              aria-label="رابط مشاركة القائمة"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="btn shrink-0"
              onClick={copy}
              disabled={!origin}
            >
              نسخ
            </button>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={toggle}
              disabled={busy}
            >
              {enabled ? "إيقاف المشاركة" : "تشغيل المشاركة"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={rotate}
              disabled={busy}
            >
              🔄 تغيير اللينك
            </button>
          </div>

          <div className="mt-2">
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => window.open(linkPath, "_blank", "noopener,noreferrer")}
            >
              👁️ فتح اللينك (جرّبه قبل ما تبعت)
            </button>
          </div>

          {!enabled && (
            <p className="mt-2 mb-0 text-sm font-bold text-danger">
              ⚠️ اللينك مش هيشتغل لحد ما تشغّل المشاركة. أي حد عنده اللينك ده
              هيفتح رسالة «اللينك مش شغال».
            </p>
          )}
        </>
      )}

      {toast && (
        <div role="status" className="mt-2 text-sm font-bold text-greend">
          {toast}
        </div>
      )}
    </section>
  );
}
