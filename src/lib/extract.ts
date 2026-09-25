import { env } from "./env";
import { toWesternDigits } from "./arabic";

export interface ExtractRow {
  name: string;
  phone: string;
}

interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string };
}

const SYSTEM_PROMPT = `You extract proctor records from Arabic or English text and images.
Return ONLY valid JSON: an array of objects with exactly the keys "name" and "phone".

Accuracy rules:
1. Preserve the person's name exactly as shown; only normalize whitespace.
2. Extract one row per person and keep the original order.
3. Convert Arabic-Indic and Persian digits to Western digits. Remove spaces, punctuation, and a leading 00/+ from the phone.
4. If a phone is split across table cells or lines, join it into one number.
5. Never invent or complete a missing/unclear number. Keep the name and use phone: "" instead.
6. Ignore headers, totals, serial numbers, QR codes, and decorative text.
7. For handwriting, low-resolution images, or multiple images, be conservative and return only rows you can read.
8. If a row has a phone but no readable name, keep it with name: "" for manual review.`;

const RESPONSE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: { type: "string" },
      phone: { type: "string" },
    },
    required: ["name", "phone"],
  },
} as const;

/** Extract rows from one or more images using Gemini's multimodal API. */
export async function extractRowsFromImages(
  images: { name: string; mediaType: string; base64: string }[],
): Promise<{ rows: ExtractRow[]; warnings: string[] }> {
  const parts: GeminiPart[] = [
    {
      text: "Extract every readable proctor name and phone from all supplied images. Return the JSON array only.",
    },
    ...images.map((image) => ({
      inline_data: {
        mime_type: image.mediaType || "image/jpeg",
        data: image.base64,
      },
    })),
  ];
  return runGemini(parts);
}

/** Extract rows from pasted text using Gemini when local parsing needs help. */
export async function extractRowsFromText(
  text: string,
): Promise<{ rows: ExtractRow[]; warnings: string[] }> {
  return runGemini([
    {
      text: `Extract all proctor rows from the following text. Preserve names, convert phone digits, and never guess missing values:\n\n${text.slice(0, 24000)}`,
    },
  ]);
}

async function runGemini(
  parts: GeminiPart[],
): Promise<{ rows: ExtractRow[]; warnings: string[] }> {
  if (!env.geminiApiKey) {
    return {
      rows: [],
      warnings: [
        "لم يتم إعداد مفتاح Gemini (GEMINI_API_KEY) على الخادم. يمكنك مراجعة الصفوف يدويًا.",
      ],
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-goog-api-key": env.geminiApiKey,
  };
  const projectNumber = env.geminiProjectId.match(/(\d+)$/)?.[1];
  if (projectNumber) headers["X-goog-user-project"] = projectNumber;

  const model = encodeURIComponent(env.geminiModel || "gemini-flash-latest");
  const request: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  };
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { ...request, signal: AbortSignal.timeout(90_000) },
    );
    if (
      response.ok ||
      ![429, 500, 502, 503, 504].includes(response.status) ||
      attempt === 2
    ) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  if (!response) throw new Error("تعذر الاتصال بخدمة Gemini.");

  if (!response.ok) {
    const details = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    const message =
      response.status === 401 || response.status === 403
        ? "مفتاح Gemini غير صحيح أو لا يملك صلاحية Usage."
        : response.status === 429
          ? "تم الوصول إلى حد Gemini الحالي. انتظر قليلًا ثم أعد المحاولة."
          : details.error?.message || `فشل Gemini (${response.status}).`;
    throw new Error(message);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = (data.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!text) {
    throw new Error(
      data.candidates?.[0]?.finishReason === "MAX_TOKENS"
        ? "Gemini لم يكمل النتيجة. قسّم الصور أو النص إلى دفعات أصغر."
        : "Gemini لم يرجع أي بيانات قابلة للقراءة.",
    );
  }

  const rows = parseJsonRows(text);
  const warnings = rowsConsistencyWarnings(rows);
  if (!rows.length) warnings.push("لم يتم العثور على صفوف واضحة في رد Gemini.");
  return { rows, warnings };
}

/** Tolerant JSON parsing for Gemini responses and older model outputs. */
export function parseJsonRows(text: string): ExtractRow[] {
  const cleaned = String(text || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const candidates = [cleaned];
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end > start) candidates.push(cleaned.slice(start, end + 1));

  let raw: unknown;
  for (const candidate of candidates) {
    try {
      raw = JSON.parse(candidate);
      break;
    } catch {
      // Try the next tolerant representation.
    }
  }
  if (raw && !Array.isArray(raw) && typeof raw === "object") {
    const rows = (raw as { rows?: unknown }).rows;
    if (Array.isArray(rows)) raw = rows;
  }
  if (!Array.isArray(raw)) return [];

  const rows: ExtractRow[] = [];
  for (const item of raw) {
    if (rows.length >= 500) break;
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = String(record.name ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    const phone = toWesternDigits(String(record.phone ?? ""))
      .replace(/\D/g, "")
      .trim()
      .slice(0, 20);
    if (!name && !phone) continue;
    rows.push({ name, phone });
  }
  return rows;
}

function rowsConsistencyWarnings(rows: ExtractRow[]): string[] {
  const warnings: string[] = [];
  if (!rows.length) return warnings;
  const noName = rows.filter((row) => !row.name.trim()).length;
  const noPhone = rows.filter((row) => !row.phone.trim()).length;
  if (noName) warnings.push(`${noName} صف بلا اسم — أكملها يدويًا عند المراجعة.`);
  if (noPhone) warnings.push(`${noPhone} صف بلا رقم — اكتب الرقم يدويًا عند المراجعة.`);
  return warnings;
}
