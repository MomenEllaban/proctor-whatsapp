export type CountryCode = string; // e.g. "20"

/** Access levels: admin supervises everything, supervisor manages, user owns lists. */
export type UserRole = "admin" | "supervisor" | "user";

export const USER_ROLES: readonly UserRole[] = ["admin", "supervisor", "user"];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "أدمن",
  supervisor: "مشرف",
  user: "مستخدم",
};

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "supervisor" || value === "user";
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  default_country_code: CountryCode;
  created_at: string;
}

/** One row in the admin panel: a user plus their activity counters. */
export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  listCount: number;
  proctorCount: number;
  openedCount: number;
}

/** One row in the admin panel: a list with its owner. */
export interface AdminListRow {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  proctorCount: number;
  openedCount: number;
  created_at: string;
}

export interface AdminOverview {
  stats: {
    users: number;
    lists: number;
    proctors: number;
    opened: number;
  };
  users: AdminUserRow[];
  lists: AdminListRow[];
}

export interface ProctorList {
  id: string;
  owner_id: string;
  title: string;
  message_template: string;
  default_country_code: CountryCode;
  created_at: string;
  updated_at: string;
}

export interface Proctor {
  id: string;
  list_id: string;
  name: string;
  phone: string; // normalized international digits, e.g. "201000000001"
  opened_at: string | null;
  opened_count: number;
  sort_order: number;
  created_at: string;
}

/** Editable row shown on the review screen before saving. */
export interface DraftRow {
  id: string;
  name: string;
  rawPhone: string;
}

/** Validation state computed for a draft row. */
export type PhoneStatus = "valid" | "invalid" | "empty" | "duplicate";

export interface RowCheck {
  id: string;
  phone: string | null; // normalized phone when valid
  status: PhoneStatus;
  message: string; // Arabic explanation
  noName: boolean;
}

export interface ExtractionResult {
  rows: ExtractRow[];
  method: "regex" | "vision";
  warnings: string[];
}

export interface ExtractRow {
  name: string;
  phone: string;
}