/**
 * Message + WhatsApp deep-link helpers.
 * Kept as pure functions so they are unit-testable and reusable across the app.
 */

export const NAME_PLACEHOLDER = "{name}";

/**
 * Replaces the {name} placeholder in the list's message template with a
 * specific proctor name. Any other text is preserved verbatim.
 */
export function generateWhatsAppMessage(name: string, template: string): string {
  const n = String(name ?? "").trim();
  return String(template ?? "").split(NAME_PLACEHOLDER).join(n);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /Android|iPhone|iPad|iPod|Mobi/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

/**
 * Builds the deep link that opens WhatsApp with the message pre-filled.
 * - Mobile: wa.me opens the WhatsApp app directly.
 * - Desktop: web.whatsapp.com/send opens WhatsApp Web in the same tab.
 * The app never sends anything by itself.
 */
export function buildWhatsAppUrl(
  name: string,
  phone: string,
  template: string,
  mobile: boolean,
): string {
  const text = encodeURIComponent(generateWhatsAppMessage(name, template));
  const digits = String(phone).replace(/\D/g, "");
  return mobile
    ? `https://wa.me/${digits}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${digits}&text=${text}`;
}