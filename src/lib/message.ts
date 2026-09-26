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

/**
 * Exam calendar. Each round owns one EST1 session (Friday) and one EST2 session
 * (Saturday), and takes over from the previous round on `from` — the day after
 * that round's last session. Once every round has passed, the last one is kept.
 */
export interface ExamRound {
  /** First day this round applies, as YYYY-MM-DD. */
  from: string;
  est1: string;
  est2: string;
}

export const EXAM_ROUNDS: readonly ExamRound[] = [
  { from: "2026-10-01", est1: "2026-10-09", est2: "2026-10-10" },
  { from: "2026-10-11", est1: "2026-12-11", est2: "2026-12-12" },
];

const ARABIC_WEEKDAYS: readonly string[] = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const ARABIC_MONTHS: readonly string[] = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/**
 * Parses a YYYY-MM-DD calendar day at UTC midnight, so the weekday never shifts
 * with the machine timezone. Returns null for anything malformed.
 */
function parseCalendarDay(isoDate: string): Date | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate ?? "").trim());
  if (!parts) return null;
  const [, year, month, day] = parts;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

/** Today as a local YYYY-MM-DD calendar day. */
export function todayCalendarDay(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "يوم الجمعة الموافق 9 أكتوبر 2026" — weekday is read, never hardcoded. */
export function formatExamDate(isoDate: string): string {
  const date = parseCalendarDay(isoDate);
  if (!date) return String(isoDate ?? "").trim();
  const weekday = ARABIC_WEEKDAYS[date.getUTCDay()];
  const month = ARABIC_MONTHS[date.getUTCMonth()];
  return `يوم ${weekday} الموافق ${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

/** The round that covers `today`, falling back to the first round before it starts. */
export function resolveExamRound(today: string = todayCalendarDay()): ExamRound {
  const active = EXAM_ROUNDS.filter((round) => round.from <= today);
  return active[active.length - 1] ?? EXAM_ROUNDS[0];
}

/**
 * The date the app fills in for the chosen exam. Returns null for any other
 * exam name, so hand-written dates for a custom exam are never overwritten.
 */
export function autoExamDate(
  exam: string,
  today: string = todayCalendarDay(),
): string | null {
  const round = resolveExamRound(today);
  if (canonicalExam(exam) === "EST1") return formatExamDate(round.est1);
  if (canonicalExam(exam) === "EST2") return formatExamDate(round.est2);
  return null;
}

/** Every automatic date across all rounds — the ones the app is allowed to replace. */
function knownAutoExamDates(): Set<string> {
  const dates = new Set<string>();
  for (const round of EXAM_ROUNDS) {
    dates.add(formatExamDate(round.est1));
    dates.add(formatExamDate(round.est2));
  }
  return dates;
}

/**
 * Moves a date left over from an earlier round to the current one. A date the
 * user typed themselves is returned untouched.
 */
export function syncAutoExamDate(
  variables: Readonly<MessageVariables>,
  today?: string,
): MessageVariables {
  const auto = autoExamDate(variables.exam, today);
  const current = variables.examDate.trim();
  if (!auto || current === auto || !knownAutoExamDates().has(current)) {
    return variables;
  }
  return { ...variables, examDate: auto };
}

/** Same as {@link syncAutoExamDate}, for a whole saved template. */
export function syncAutoExamDateTemplate(template: string, today?: string): string {
  const variables = parseMessageTemplate(template);
  const next = syncAutoExamDate(variables, today);
  if (next === variables) return template;
  return buildMessageTemplate(next, detectMessageStyle(template));
}

/** Fresh defaults for a new message, with the current round's exam date. */
export function defaultMessageVariables(today?: string): MessageVariables {
  const examDate = autoExamDate(DEFAULT_MESSAGE_VARIABLES.exam, today);
  return {
    ...DEFAULT_MESSAGE_VARIABLES,
    ...(examDate ? { examDate } : null),
  };
}

export function defaultMessageTemplate(today?: string): string {
  return buildMessageTemplate(defaultMessageVariables(today), "formal");
}

/** Guesses the style of a saved message so editing keeps its wording. */
export function detectMessageStyle(template: string): MessageStyle {
  const text = String(template ?? "");
  if (text.includes("تشرفنا بوجودك معنا")) return "friendly";
  if (text.includes("أكّد حضورك") || /(^|\n)أهلاً \{name\} 👋/.test(text))
    return "short";
  return "formal";
}

export const DEFAULT_MESSAGE_VARIABLES: Readonly<MessageVariables> = {
  exam: "EST1",
  location: "قاعة الامتحانات الرئيسية",
  /** Reserved example domain: a placeholder, never a real invite link. */
  groupUrl: "https://example.com/demo-invite",
  examDate: formatExamDate(EXAM_ROUNDS[0].est1),
};

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
