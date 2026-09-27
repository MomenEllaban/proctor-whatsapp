export type CountryCode = string; // e.g. "20"

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  default_country_code: CountryCode;
  created_at: string;
}

export interface ProctorList {
  id: string;
  owner_id: string;
  title: string;
  message_template: string;
  default_country_code: CountryCode;
  created_at: string;
  updated_at: string;
  share_token: string | null;
  share_enabled: boolean;
}

/** What a share-link visitor is allowed to see. No owner, no template editing. */
export interface SharedList {
  id: string;
  title: string;
  message_template: string;
}

export interface SharedProctor {
  id: string;
  name: string;
  phone: string;
  opened_at: string | null;
}

/** Owner-facing share status for one list. */
export interface ShareState {
  share_token: string | null;
  share_enabled: boolean;
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