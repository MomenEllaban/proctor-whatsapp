/** Server-only configuration, read from environment variables. */

const configuredProvider = process.env.DATA_PROVIDER?.trim().toLowerCase();
const dataProvider =
  configuredProvider || (process.env.VERCEL ? "supabase" : "demo");
const signupMode = process.env.SIGNUP_MODE?.trim().toLowerCase() || "domain";
/** Empty by default: any valid email can sign in. Set it to lock the system down. */
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

  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite",
  geminiProjectId: process.env.GEMINI_PROJECT_ID || "",

  /** Demo mode is local-only: shared password seeds every demo account. */
  demoPassword: process.env.DEMO_PASSWORD || "demo1234",
};

export const isDemo = env.dataProvider === "demo";

/**
 * True when the address may sign in. Open by default: any valid email is
 * accepted unless ALLOWED_EMAIL_DOMAINS is configured.
 */
export function isAllowedDomain(email: string): boolean {
  const clean = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return false;
  if (!env.allowedEmailDomains.length) return true;
  return env.allowedEmailDomains.some((domain) =>
    clean.endsWith("@" + domain.replace(/^@/, "")),
  );
}

/** Human-readable list of the locked domains, or null when the system is open. */
export function lockedDomainsHint(): string | null {
  if (!env.allowedEmailDomains.length) return null;
  return env.allowedEmailDomains
    .map((domain) => "@" + domain.replace(/^@/, ""))
    .join(" أو ");
}

/**
 * Sign-up policy: an optional domain lock, plus an invite code when
 * SIGNUP_MODE=invite. Returns an Arabic error message or null when allowed.
 */
export function authPolicyError(
  email: string,
  invite: string,
): string | null {
  if (!isAllowedDomain(email)) {
    const hint = lockedDomainsHint() ?? "النطاق المسموح";
    return `البريد الإلكتروني غير مسموح — الحسابات متاحة لـ ${hint} فقط.`;
  }
  if (env.signupMode === "open") return null;
  if (env.signupMode === "invite") {
    return env.inviteCode && cleanInvite(invite) === cleanInvite(env.inviteCode)
      ? null
      : "كود الدعوة غير صحيح — احصل على الكود من مدير النظام.";
  }
  return null;
}

function cleanInvite(s: string): string {
  return s.trim().toLowerCase();
}