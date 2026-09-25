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

export type MessageVariableKey = keyof MessageVariables;
export type MessageVariableErrors = Partial<
  Record<MessageVariableKey, string>
>;

export const DEFAULT_MESSAGE_VARIABLES: Readonly<MessageVariables> = {
  exam: "EST1",
  location: "Horus University - Faculty of Engineering",
  groupUrl: "https://chat.whatsapp.com/L7UDY5953nJ8Z6CU3o9jZ4",
  examDate: "يوم الجمعة الموافق 9 أكتوبر 2026",
};

/** Builds the complete message from the four values the user can change. */
export function buildMessageTemplate(
  variables: Readonly<MessageVariables>,
): string {
  return [
    `السلام عليكم ورحمة الله وبركاته، أهلاً ${NAME_PLACEHOLDER}`,
    `ده الجروب الخاص بامتحان ${variables.exam}`,
    `المكان: ${variables.location}`,
    `📌 رابط الجروب: ${variables.groupUrl}`,
    `🗓 موعد الامتحان: ${variables.examDate}`,
    "🔔 يرجى تأكيد الحضور بكتابة الاسم الثنائي داخل الجروب.",
    "مع تمنياتنا بالتوفيق، وكل سنة وأنتم طيبين 🌷",
  ].join("\n\n");
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

  let exam = examLine ?? DEFAULT_MESSAGE_VARIABLES.exam;
  // Older lists kept the university at the end of the exam line.
  exam = exam.replace(
    /\s*-\s*Horus University(?:\s*-\s*Faculty of Engineering)?\.?\s*$/i,
    "",
  );
  exam = canonicalExam(exam);

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
