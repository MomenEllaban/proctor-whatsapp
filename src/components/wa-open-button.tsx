"use client";

import { useCallback, useSyncExternalStore } from "react";
import { buildWhatsAppUrl, isMobileDevice } from "@/lib/message";
import type { Proctor } from "@/lib/types";

function subscribeToDevice(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getMobileSnapshot(): boolean {
  return isMobileDevice();
}

function getServerMobileSnapshot(): boolean {
  return false;
}

/**
 * The one-tap WhatsApp deep link. On mobile it opens the WhatsApp app with the
 * message pre-filled; on desktop it opens WhatsApp Web in a new tab.
 *
 * IMPORTANT: it is a real <a target="_blank"> so iOS Safari / Android Chrome
 * never block the popup — and nothing is awaited before the link opens.
 * "تم فتح WhatsApp" (not "تم الإرسال") because the app can never know whether
 * Send was pressed inside WhatsApp.
 */
export function WaOpenButton({
  proctor,
  template,
  onOpened,
}: {
  proctor: Pick<Proctor, "id" | "name" | "phone" | "opened_at">;
  template: string;
  onOpened: (id: string) => void;
}) {
  const mobile = useSyncExternalStore(
    subscribeToDevice,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );

  const url = buildWhatsAppUrl(
    proctor.name,
    proctor.phone,
    template,
    mobile,
  );
  const opened = Boolean(proctor.opened_at);

  const handleClick = useCallback(() => {
    // Fire-and-forget tracking — never block the navigation with await.
    fetch(`/api/proctors/${encodeURIComponent(proctor.id)}/open`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
    onOpened(proctor.id);
  }, [proctor.id, onOpened]);

  const label = opened ? "تم فتح WhatsApp" : "فتح WhatsApp";
  const glyph = opened
    ? "✅"
    : "🟢";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`btn btn-wa w-full text-center ${opened ? "btn-wa-done" : ""}`}
      aria-label={`فتح WhatsApp للمراقب ${proctor.name}`}
    >
      <span aria-hidden="true">{glyph}</span>
      <span>{label}</span>
    </a>
  );
}