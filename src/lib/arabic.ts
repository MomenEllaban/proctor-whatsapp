/**
 * Arabic text normalization used for instant search (name matching).
 * Never mutates the stored name — this is only for comparing queries.
 */
export function normArabic(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ْـ]/g, "") // harakat + tatweel
    .replace(/\s+/g, " ")
    .trim();
}

/** Digits only, for phone search queries. */
export function digitsOnly(s: string): string {
  return toWesternDigits(String(s)).replace(/\D/g, "");
}

/** Does a proctor (name or phone) match a raw search query? */
export function matchesQuery(
  query: string,
  name: string,
  phone: string,
): boolean {
  const q = normArabic(query);
  if (!q) return true;
  const qDigits = digitsOnly(query);
  if (qDigits && phone.includes(qDigits)) return true;
  if (qDigits && !/[^\d\s()+-]/.test(toWesternDigits(query))) return false; // query looks like a number
  return normArabic(name).includes(q);
}

/** Convert Arabic-Indic (٠١٢) and Persian (۰۱۲) digits to Western digits. */
export function toWesternDigits(input: string): string {
  return String(input)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}