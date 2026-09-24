import { toWesternDigits } from "./arabic";

export interface PhoneResult {
  raw: string;
  /** Normalized international number, digits only, no "+": e.g. "201000000001". */
  phone: string | null;
  valid: boolean;
  /** Arabic explanation shown on the review screen (empty when valid). */
  message: string;
}

/** 11-digit Egyptian mobile in local form: 01 + prefix digit + 8 digits. */
const EGYPT_LOCAL_11 = /^01[0125]\d{8}$/; // 010/011/012/015
/** 10-digit Egyptian mobile without the leading trunk "0" (after country code 20). */
const EGYPT_INTL_10 = /^1[0125]\d{8}$/;
/** Any plausible generic international number: country code + national number. */
const GENERIC_INTL = /^\d{11,15}$/;

function fail(message: string, raw: string): PhoneResult {
  return { raw, phone: null, valid: false, message };
}

/**
 * Normalize a raw phone number (typed / pasted / extracted) to an
 * international dial format: digits only, no "+", e.g. "201000000001".
 *
 * Rules:
 *  - Converts Arabic-Indic and Persian digits to Western digits.
 *  - Strips spaces, dashes, dots, parentheses and "+".
 *  - Removes a leading "00" (international prefix).
 *  - Egyptian mobiles: 01XXXXXXXXX (11 digits) -> 201XXXXXXXXX;
 *    0020... / +20... forms are kept as 20... and validated against the
 *    010/011/012/015 prefixes.
 *  - Numbers with an explicit non-default country code are kept as-is when
 *    they look like valid international numbers (11-15 digits).
 *  - Never silently drops anything; invalid input yields phone=null + reason.
 */
export function normalizePhone(
  raw: string | null | undefined,
  defaultCountryCode = "20",
): PhoneResult {
  const input = raw == null ? "" : String(raw);
  if (!input.trim()) return fail("الرقم فارغ", input);
  if (/[A-Za-z]/.test(input)) {
    return fail("أدخل رقم الموبايل أرقامًا فقط بدون حروف", input);
  }

  const digits = toWesternDigits(input).replace(/\D/g, "");
  if (!digits) return fail("لا يحتوي النص على أي أرقام", input);
  if (digits.length < 8) return fail("الرقم قصير جدًا — يُتوقع رقم موبايل دولي كامل", input);

  let d = digits;
  if (d.startsWith("00")) d = d.slice(2); // international dial prefix

  const cc = String(defaultCountryCode).replace(/\D/g, "") || "20";

  // ---- Case A: the number already includes the default country code ----
  if (cc && d.startsWith(cc) && d.length >= cc.length + 6) {
    const local = d.slice(cc.length);
    if (cc === "20") {
      if (EGYPT_INTL_10.test(local)) {
        return { raw: input, phone: d, valid: true, message: "" };
      }
      return fail(
        "رقم مصري غير صالح لـ WhatsApp — بادئات الموبايل المعتمدة: 010، 011، 012، 015",
        input,
      );
    }
    if (!/^0/.test(local)) {
      return { raw: input, phone: d, valid: true, message: "" };
    }
    return fail("الرقم يحمل صفرًا محليًا زائدًا بعد كود الدولة", input);
  }

  // ---- Case B: Egyptian local mobile (11 digits starting 01) ----
  if (cc === "20" && EGYPT_LOCAL_11.test(d)) {
    return { raw: input, phone: cc + d.slice(1), valid: true, message: "" };
  }

  // ---- Case C: generic international number with its own country code ----
  if (GENERIC_INTL.test(d) && !/^0/.test(d)) {
    return { raw: input, phone: d, valid: true, message: "" };
  }

  // ---- Case D: local landline without an international prefix ----
  if (/^0[12]\d{8}$/.test(d)) {
    return fail(
      "رقم أرضي بدون كود الدولة — أدخل الرقم بصيغة دولية تبدأ بـ 20",
      input,
    );
  }

  return fail(
    "الرقم غير صالح — تحقق منه وجرّب الصيغة الدولية مثل 201000000001",
    input,
  );
}