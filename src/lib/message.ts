/**
 * Message template + WhatsApp deep-link helpers.
 * Kept as pure functions so they are unit-testable and reusable across the app.
 */

export const NAME_PLACEHOLDER = "{name}";
export const EXAM_OPTIONS = ["EST1", "EST2"] as const;

export interface MessageVariables {
  exam: string;
  location: string;
  groupUrl: string;
  examDate: string;
}

/** Wording of the fixed sentences. The four variable lines never change. */
export type MessageStyle = "formal" | "friendly" | "short";

export const MESSAGE_STYLES: readonly MessageStyle[] = [
  "formal",
  "friendly",
  "short",
];

export const MESSAGE_STYLE_LABELS: Record<MessageStyle, string> = {
  formal: "رسمي",
  friendly: "ودود",
  short: "مختصر",
};

const STYLE_TEXT: Record<
  MessageStyle,
  { greeting: string; confirm: string; closing: string }
> = {
  formal: {
    greeting: "السلام عليكم ورحمة الله وبركاته، أهلاً {name}",
    confirm: "🔔 يرجى تأكيد الحضور بكتابة الاسم الثنائي داخل الجروب.",
    closing: "مع تمنياتنا بالتوفيق، وكل سنة وأنتم طيبين 🌷",
  },
  friendly: {
    greeting: "السلام عليكم ورحمة الله وبركاته 🌷 أهلاً {name}، تشرفنا بوجودك معنا.",
    confirm: "✅ من فضلك اكتب اسمك الثنائي داخل الجروب لتأكيد الحضور.",
    closing: "نتمنى لك التوفيق، وكل عام وأنت بخير 🌷",
  },
  short: {
    greeting: "أهلاً {name} 👋",
    confirm: "✅ أكّد حضورك بالاسم الثنائي داخل الجروب.",
    closing: "بالتوفيق 🌷",
  },
};

export type MessageVariableKey = keyof MessageVariables;
export type MessageVariableErrors = Partial<
  Record<MessageVariableKey, string>
>;

export const DEFAULT_MESSAGE_VARIABLES: Readonly<MessageVariables> = {
  exam: "EST1",
  location: "قاعة الامتحانات الرئيسية",
  /** Reserved example domain: a placeholder, never a real invite link. */
  groupUrl: "https://example.com/demo-invite",
  examDate: "يوم الجمعة الموافق 9 أكتوبر 2026",
};

/** Builds the complete message from the four values the user can change. */
export function buildMessageTemplate(
  variables: Readonly<MessageVariables>,
  style: MessageStyle = "formal",
): string {
  const words = STYLE_TEXT[style];
  return [
    words.greeting,
    `ده الجروب الخاص بامتحان ${variables.exam}`,
    `المكان: ${variables.location}`,
    `📌 رابط الجروب: ${variables.groupUrl}`,
    `🗓 موعد الامتحان: ${variables.examDate}`,
    words.confirm,
    words.closing,
  ].join("\n\n");
}

/** Guesses the style of a saved message so editing keeps its wording. */
export function detectMessageStyle(template: string): MessageStyle {
  const text = String(template ?? "");
  if (text.includes("تشرفنا بوجودك معنا")) return "friendly";
  if (text.includes("أكّد حضورك") || /(^|\n)أهلاً \{name\} 👋/.test(text))
    return "short";
  return "formal";
}

export const DEFAULT_MESSAGE_TEMPLATE = buildMessageTemplate(
  DEFAULT_MESSAGE_VARIABLES,
);

/** Reads the editable values back from a saved message. */
export function parseMessageTemplate(template: string): MessageVariables {
  const text = String(template ?? "");
  const examLine = text.match(
    /^ده الجروب الخاص بامتحان[\t ]*(.*?)\r?$/m,
  )?.[1];
  const locationLine = text.match(/^المكان:[\t ]*(.*?)\r?$/m)?.[1];
  const groupUrlLine = text.match(/^📌 رابط الجروب:[\t ]*(.*?)\r?$/m)?.[1];
  const examDateLine = text.match(/^🗓 موعد الامتحان:[\t ]*(.*?)\r?$/m)?.[1];

  const exam = canonicalExam(examLine ?? DEFAULT_MESSAGE_VARIABLES.exam);

  return {
    exam,
    location: locationLine ?? DEFAULT_MESSAGE_VARIABLES.location,
    groupUrl: groupUrlLine ?? DEFAULT_MESSAGE_VARIABLES.groupUrl,
    examDate: examDateLine ?? DEFAULT_MESSAGE_VARIABLES.examDate,
  };
}

export function validateMessageVariables(
  variables: Readonly<MessageVariables>,
): MessageVariableErrors {
  const errors: MessageVariableErrors = {};

  if (!variables.exam.trim()) {
    errors.exam = "اختر اسم الامتحان.";
  }
  if (!variables.location.trim()) {
    errors.location = "اكتب مكان الامتحان.";
  }
  if (!variables.examDate.trim()) {
    errors.examDate = "اكتب موعد الامتحان.";
  }

  const groupUrl = variables.groupUrl.trim();
  if (!groupUrl) {
    errors.groupUrl = "اكتب رابط الجروب.";
  } else {
    try {
      const url = new URL(groupUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        errors.groupUrl = "استخدم رابطًا يبدأ بـ https://";
      }
    } catch {
      errors.groupUrl = "اكتب رابطًا صحيحًا يبدأ بـ https://";
    }
  }

  return errors;
}

export function isValidMessageTemplate(template: string): boolean {
  return Object.keys(validateMessageVariables(parseMessageTemplate(template)))
    .length === 0;
}

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

function canonicalExam(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[\s_-]+/g, "");
  return (
    EXAM_OPTIONS.find((option) => option.toUpperCase() === normalized) ?? value
  );
}
