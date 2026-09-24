import { toWesternDigits } from "./arabic";
import type { DraftRow } from "./types";
import { uid } from "./uid";

const DIGIT = "0-9\\u0660-\\u0669\\u06f0-\\u06f9";

/** A number-looking token: digits (incl. Arabic/Persian) mixed with separators. */
const PHONE_TOKEN = new RegExp(
  `[${DIGIT}][\\s().\\-–—+${DIGIT}]*[\\s()\\-–—.${DIGIT}]`,
  "g",
);

const LABEL_PREFIX = /^(?:tel|phone|mobile|hotline|خط|هاتف|موبايل|رقم|جوال)\s*[:.\-–—]+/gi;

/**
 * Deterministic extraction from raw pasted text (Excel, WhatsApp, Word, PDF).
 * Expects one entry per line as: name and phone, separated by tab / comma /
 * dash / whitespace, in either order. Handles Arabic and Persian digits and
 * numbers split by spaces or dashes. A row is never silently dropped:
 * lines without a recognisable number come out with an empty phone.
 */
export function parseProctorsFromText(text: string): DraftRow[] {
  const rows: DraftRow[] = [];
  const lines = String(text ?? "").split(/\r?\n/);
  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    rows.push(parseLine(l));
  }
  return rows;
}

export function parseLine(rawLine: string): DraftRow {
  const line = rawLine.trim();
  const token = findPhoneToken(line);
  let name = line;
  let rawPhone = "";
  if (token) {
    name = line.replace(token, " ");
    rawPhone = token.trim().replace(/[^\d\u0660-\u0669\u06f0-\u06f9]+$/g, "");
  }
  return { id: uid(), name: cleanName(name), rawPhone };
}

/** Longest number-like token whose digit count is >= 7. */
export function findPhoneToken(line: string): string | null {
  const matches = line.match(PHONE_TOKEN);
  if (!matches) return null;
  let best: string | null = null;
  let bestDigits = 0;
  for (const m of matches) {
    const western = toWesternDigits(m);
    const runs = western.match(/[0-9]+/g) ?? [];
    const firstRun = runs[0]?.length ?? 0;
    const strongStart = western.search(/[0-9]{7,}/);
    const plusStart = m.indexOf("+");
    // A short number at the beginning of a name (for example "مراقب 01")
    // must not swallow the real phone that follows it.
    const candidate =
      firstRun > 0 && firstRun <= 2 && plusStart > 0
        ? m.slice(plusStart + 1)
        : firstRun > 0 && firstRun <= 2 && strongStart > 0
          ? m.slice(strongStart)
          : m;
    const d = toWesternDigits(candidate).replace(/\D/g, "");
    if (d.length >= 7 && d.length > bestDigits) {
      best = candidate;
      bestDigits = d.length;
    }
  }
  return best;
}

/** Trim whitespace + punctuation. Never rewrites Arabic names. */
export function cleanName(name: string): string {
  return String(name)
    .replace(LABEL_PREFIX, "")
    .replace(/^[\s\d+#'“"”‘’#№.\-–—،,:_）)】\]>]+/, "") // leading row index / bullets
    .replace(/[\s+\-–—:،,;\t._'“”‘’（(【\[<)"]+$/, "") // trailing separators
    .replace(/\s+/g, " ")
    .trim();
}

/** Number of rows that look unusable (missing name or number). */
export function countBrokenRows(rows: DraftRow[]): number {
  let broken = 0;
  for (const r of rows) {
    const digits = toWesternDigits(r.rawPhone).replace(/\D/g, "");
    if (!r.name.trim() || digits.length < 7) broken++;
  }
  return broken;
}