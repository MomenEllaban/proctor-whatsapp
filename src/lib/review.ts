import { normalizePhone } from "./normalizePhone";
import type { DraftRow, RowCheck } from "./types";

/**
 * Validate a batch of draft rows before saving. Computes per-row status:
 * valid / invalid / empty / duplicate. Existing normalized phones in the list
 * (or previously-saved rows) are treated as duplicates too.
 */
export function checkRows(
  rows: DraftRow[],
  defaultCountryCode: string,
  existingPhones: ReadonlySet<string> = new Set(),
): Map<string, RowCheck> {
  const checks = new Map<string, RowCheck>();
  const seen = new Map<string, string>(); // normalized phone -> first row id

  for (const row of rows) {
    const pristine = String(row.rawPhone ?? "").trim();
    const res = normalizePhone(pristine, defaultCountryCode);
    const noName = !row.name.trim();

    let status: RowCheck["status"];
    const phone: string | null = res.phone;
    let message = res.message;

    if (!pristine) {
      status = "empty";
      message = "اكتب رقم الموبايل";
    } else if (!res.valid) {
      status = "invalid";
    } else if (phone != null && existingPhones.has(phone)) {
      status = "duplicate";
      message = "هذا الرقم موجود بالفعل في القائمة";
    } else if (phone != null && seen.has(phone)) {
      status = "duplicate";
      message = "رقم مكرر داخل نفس الدفعة";
    } else {
      status = "valid";
      message = "";
      if (phone != null) seen.set(phone, row.id);
    }

    checks.set(row.id, { id: row.id, phone, status, message, noName });
  }
  return checks;
}

export interface RowErrorSummary {
  hasProblems: boolean;
  broken: number; // invalid + empty
  duplicates: number;
  missingNames: number;
  totalRows: number;
  validRows: number;
}

export function summarizeChecks(checks: Map<string, RowCheck>): RowErrorSummary {
  let broken = 0;
  let duplicates = 0;
  let missingNames = 0;
  let validRows = 0;
  for (const c of checks.values()) {
    if (c.status === "invalid" || c.status === "empty") broken++;
    if (c.status === "duplicate") duplicates++;
    if (c.noName) missingNames++;
    if (c.status === "valid" && !c.noName) validRows++;
  }
  const hasProblems = broken > 0 || duplicates > 0 || missingNames > 0;
  return {
    hasProblems,
    broken,
    duplicates,
    missingNames,
    totalRows: checks.size,
    validRows,
  };
}