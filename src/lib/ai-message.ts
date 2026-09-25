import { env } from "./env";
import {
  MESSAGE_STYLE_LABELS,
  buildMessageTemplate,
  type MessageStyle,
  type MessageVariables,
} from "./message";

/**
 * Rewrites the fixed sentences of the message in the requested style.
 * Uses Gemini when a key is configured, otherwise falls back to the
 * built-in Arabic wording so the feature always works.
 */
export async function writeMessageWithAi(
  variables: Readonly<MessageVariables>,
  style: MessageStyle,
): Promise<{ message: string; source: "gemini" | "builtin" }> {
  const local = buildMessageTemplate(variables, style);
  if (!env.geminiApiKey) return { message: local, source: "builtin" };

  const styleNote =
    style === "friendly"
      ? "صِغ بلهجة ودودة ومهنية، جمل قصيرة، مع إيموجي قليلة."
      : style === "short"
        ? "اكتب بأقصر صياغة ممكنة: جملة ترحيب، سطور المتغيرات، وتأكيد الحضور."
        : "صِغ بلهجة رسمية جامدية محترمة، جمل واضحة وقصيرة.";

  const prompt = [
    "عد صياغة الرسالة العربية التالية بنفس المعنى وبأسلوب أنظف.",
    "قواعد صارمة:",
    "1. احتفظ حرفيًا بالوسم {name} كما هو.",
    "2. احتفظ حرفيًا بالأسطر الأربعة التي تحتوي المتغيرات وبنفس prefixes:",
    `   - "ده الجروب الخاص بامتحان ${variables.exam}"`,
    `   - "المكان: ${variables.location}"`,
    `   - "📌 رابط الجروب: ${variables.groupUrl}"`,
    `   - "🗓 موعد الامتحان: ${variables.examDate}"`,
    "3. غيّر جملة التحية وسطر تأكيد الحضور والختام فقط.",
    `4. الأسلوب المطلوب (${MESSAGE_STYLE_LABELS[style]}): ${styleNote}`,
    "5. أعد الرسالة كاملة كنص عادي بدون شرطات مرقمة وبدون شرح.",
    "",
    "الرسالة الحالية:",
    local,
  ].join("\n");

  try {
    const message = await askGemini(prompt);
    if (message) return { message, source: "gemini" };
  } catch (error) {
    console.warn("[ai-message] Gemini unavailable; using built-in wording", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return { message: local, source: "builtin" };
}

async function askGemini(prompt: string): Promise<string | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-goog-api-key": env.geminiApiKey,
  };
  const projectNumber = env.geminiProjectId.match(/(\d+)$/)?.[1];
  if (projectNumber) headers["X-goog-user-project"] = projectNumber;

  const model = env.geminiModel || "gemini-flash-latest";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
    },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (data.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) return null;
  // Models sometimes wrap the answer in a fenced block.
  return text.replace(/```(?:[a-z]+)?/gi, "").trim() || null;
}
