import { env } from "./env";
import { toWesternDigits } from "./arabic";

export interface ExtractRow {
  name: string;
  phone: string;
}

interface AnthropicMsg {
  role: "user";
  content: unknown[];
}

const SYSTEM = `أنت مساعد استخراج بيانات دقيق. مهمتك قراءة قوائم أسماء ومراقبين من النص أو الصور وإخراج أسماء وأرقام الموبايل.
قواعد صارمة:
1. أخرج JSON فقط بالصيغة: [{"name":"...","phone":"..."}] بدون أي نص أو شرح آخر.
2. الاسم: انسخه حرفيًا من المصدر (عربي أو إنجليزي) بعد إزالة الفراغات الزائدة فقط. لا تصحّح أو تتلاعب بالأسماء أبدًا.
3. الرقم: انقل الأرقام كما هي مع تحويل الأرقام العربية (٠١٢) والفارسية (۰۱۲) إلى أرقام غربية (012). إذا كان الرقم مقسومًا بين خلايا أو صفوف، اجمعه في رقم واحد متصل. اختر أطول رقم يبدو كرقم موبايل.
4. إذا لم يتضح رقم في سطر أو صف، أخرج phone بصيغة رقمية فارغة "" مع إبقاء الاسم — لا تخترع رقمًا ولا تسقط الصف.
5. لا تضيف أسماء غير موجودة، ولا تكمل رقمًا ناقصًا بتخمين.
6. تناول النصوص العربية المطبوعة والمكتوبة بخط اليد، والجداول، ولقطات الشاشة، والخلايا المندمجة، والأرقام المكتوبة بخط اليد.
المصدر قد يحتوي أكثر من صورة؛ أخرج كل الصفوف معًا في قائمة JSON واحدة.`;

/**
 * Ask Anthropic Claude (vision) to read rows of {name, phone} from one or more
 * images. Images are only sent as base64 in the request body and are never
 * stored anywhere on the server.
 */
export async function extractRowsFromImages(
  images: { name: string; mediaType: string; base64: string }[],
): Promise<{ rows: ExtractRow[]; warnings: string[] }> {
  const content: unknown[] = images.map((img) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: img.mediaType || "image/jpeg",
      data: img.base64,
    },
  }));
  content.push({
    type: "text",
    text: "استخرج الآن أسماء وأرقام الموبايل من الصور أعلاه كاملة وبالصيغة المحددة.",
  });
  return runClaude(SYSTEM, [{ role: "user", content: content as never[] }]);
}

/** Ask Claude to extract rows from raw pasted text (fallback when regex fails). */
export async function extractRowsFromText(
  text: string,
): Promise<{ rows: ExtractRow[]; warnings: string[] }> {
  const msg: AnthropicMsg = {
    role: "user",
    content: [
      {
        type: "text",
        text: `استخرج أسماء وأرقام الموبايل من النص التالي (قد يكون بلا فواصل واضحة):\n\n${text.slice(0, 24000)}`,
      },
    ],
  };
  return runClaude(SYSTEM, [msg]);
}

async function runClaude(
  system: string,
  messages: AnthropicMsg[],
): Promise<{ rows: ExtractRow[]; warnings: string[] }> {
  if (!env.anthropicApiKey) {
    return {
      rows: [],
      warnings: [
        "لم يتم إعداد مفتاح Anthropic (ANTHROPIC_API_KEY) — فعّل وضع الذكاء الاصطناعي من صفحة الإعدادات.",
      ],
    };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: {
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    } as Record<string, string>,
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 8192,
      temperature: 0,
      system,
      messages: messages as never[],
    }),
  });

  if (!res.ok) {
    const code = res.status;
    const msg =
      code === 401 || code === 403
        ? "مفتاح Anthropic غير صحيح — راجع ANTHROPIC_API_KEY على الخادم."
        : code === 429
          ? "وصلت للحد الأقصى من طلبات الذكاء الاصطناعي — انتظر دقيقة وأعد المحاولة."
          : `فشل الذكاء الاصطناعي (${code}) — أعد المحاولة لاحقًا.`;
    throw new Error(msg);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n");
  const rows = parseJsonRows(text);
  const warnings = rowsConsistencyWarnings(rows);
  return { rows, warnings };
}

/** Tolerant JSON parsing of an LLM-produced rows array. */
export function parseJsonRows(text: string): ExtractRow[] {
  const cleaned = (text || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const raw = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    if (!Array.isArray(raw)) return [];
    const rows: ExtractRow[] = [];
    for (const item of raw) {
      if (rows.length >= 500) break;
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const name = String(rec.name ?? "").trim().replace(/\s+/g, " ");
      const phone = toWesternDigits(String(rec.phone ?? ""))
        .replace(/[^\d]/g, "")
        .trim();
      if (!name && !phone) continue;
      rows.push({ name, phone });
    }
    return rows;
  } catch {
    return [];
  }
}

/** Mark rows found but with suspicious empty numbers (kept for the review step). */
function rowsConsistencyWarnings(rows: ExtractRow[]): string[] {
  const warnings: string[] = [];
  if (!rows.length) return warnings;
  const noName = rows.filter((r) => !r.name.trim()).length;
  const noPhone = rows.filter((r) => !r.phone.trim()).length;
  if (noName) warnings.push(`${noName} صف بلا اسم — أكملها يدويًا عند المراجعة.`);
  if (noPhone) warnings.push(`${noPhone} صف بلا رقم — اكتب الرقم يدويًا عند المراجعة.`);
  return warnings;
}