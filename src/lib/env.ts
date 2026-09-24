/** Server-only configuration, read from environment variables. */

const configuredProvider = process.env.DATA_PROVIDER?.trim().toLowerCase();
const dataProvider =
  configuredProvider || (process.env.VERCEL ? "supabase" : "demo");
const signupMode = process.env.SIGNUP_MODE?.trim().toLowerCase() || "domain";
const allowedEmailDomains = list(process.env.ALLOWED_EMAIL_DOMAINS);
const inviteCode = process.env.INVITE_CODE?.trim() || "";

if (dataProvider !== "demo" && dataProvider !== "supabase") {
  throw new Error('DATA_PROVIDER must be either "demo" or "supabase".');
}
if (!["open", "domain", "invite"].includes(signupMode)) {
  throw new Error('SIGNUP_MODE must be "open", "domain", or "invite".');
}
if (dataProvider === "supabase") {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required in Supabase mode.",
    );
  }
  if (signupMode === "invite" && !inviteCode) {
    throw new Error("INVITE_CODE is required when SIGNUP_MODE=invite.");
  }
  if (signupMode === "domain" && !allowedEmailDomains.length) {
    throw new Error(
      "ALLOWED_EMAIL_DOMAINS is required when SIGNUP_MODE=domain in Supabase mode.",
    );
  }
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const env = {
  /** "supabase" for production, "demo" for a zero-config local run. */
  dataProvider,

  allowedEmailDomains,
  inviteCode,
  signupMode,

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",

  /** Demo mode is local-only: shared password seeds every demo account. */
  demoPassword: process.env.DEMO_PASSWORD || "demo1234",
};

export const isDemo = env.dataProvider === "demo";

/** Sign-up restricted unless an invite code is used. Returns an Arabic message. */
export function authPolicyError(
  email: string,
  invite: string,
): string | null {
  const clean = email.trim().toLowerCase();
  if (env.signupMode === "open") return null;
  if (env.signupMode === "invite") {
    return env.inviteCode && cleanInvite(invite) === cleanInvite(env.inviteCode)
      ? null
      : "كود الدعوة غير صحيح — احصل على الكود من مدير النظام.";
  }
  // domain mode (default)
  if (!env.allowedEmailDomains.length) {
    return "تسجيل الحسابات غير مهيأ — اطلب من مدير النظام ضبط النطاقات المسموحة.";
  }
  const ok = env.allowedEmailDomains.some((d) => {
    const domain = "@" + d.replace(/^@/, "");
    return clean.endsWith(domain);
  });
  return ok
    ? null
    : "البريد الإلكتروني غير مسموح — يجب أن ينتهي بأحد النطاقات المخصصة لنظام المراقبين.";
}

function cleanInvite(s: string): string {
  return s.trim().toLowerCase();
}