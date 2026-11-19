// Shapes returned by the API (backend/api/views.py and the route files).

export type Role = "Reviewer" | "Administrator";
export interface Me { id: number; name: string; username: string; role: Role; must_change_password: boolean }

export type Stage = "queued" | "split" | "ocr" | "classify" | "extract" | "done" | "error" | "duplicate" | "rejected";
export interface FileState { text: string; kind: string; hold?: "classify" | "extract" | "duplicate" }
export interface FileRow {
  id: number; name: string; batch: string; size: number; stage: Stage; pages: number | null; error: string | null;
  uploaded_at: string; processed_at: string | null; duplicate_of: number | null; state?: FileState;
}
export interface BatchView {
  id: string; uploaded_at: string; uploaded_by: string; files_count: number; pages: number; checks: number;
  auto: number; waiting: number; errors: number; status: string; files?: FileRow[]; done?: number; worker_running?: boolean;
}

export interface Lock { by: string; until: string; mine: boolean }
export interface PageBrief { id: number; page: number; file: string; file_id: number; batch: string; processed_at: string }

export interface ClsView extends PageBrief {
  label: string | null; guess: string; conf: number | null; scores: Record<string, number | null>;
  status: "auto" | "pending" | "manual"; note: string | null; by: string | null; at: string | null; lock?: Lock | null;
}

export type FieldKey = "payor" | "address" | "pay_to" | "check_no" | "check_date" | "amount";
export interface ExtView extends PageBrief {
  ext_id: number; values: Record<FieldKey, string | null>; conf: Partial<Record<FieldKey, number>>;
  notes: Partial<Record<FieldKey | "_general", string>>; status: "auto" | "pending" | "manual" | "queued" | "error";
  status_label: string; error: string | null; reviewed_by: string | null; reviewed_at: string | null;
  original: Partial<Record<FieldKey, string | null>>; min_conf: number; low_fields: FieldKey[]; reprocess?: string | null;
  lock?: Lock | null; boxes?: Partial<Record<FieldKey, [number, number, number, number]>>; image?: { w: number | null; h: number | null };
  corrections?: { field: string; label: string; from: string | null; to: string | null; by: string; at: string }[];
}

export interface ReviewItem {
  type: "cls" | "ext" | "dup"; id: number; page: number | null; file: string; file_id: number; batch: string;
  processed_at: string; guess?: string; conf?: number; note?: string | null; queued?: boolean;
  low?: { field: FieldKey; label: string; conf: number }[]; rerun?: boolean; original?: FileRow | null; lock?: Lock | null;
}

export const FIELDS: [FieldKey, string][] = [
  ["payor", "Payor Name"], ["address", "Payor Address"], ["pay_to", "Pay To"],
  ["check_no", "Check Number"], ["check_date", "Check Date"], ["amount", "Check Amount"],
];
export const CLASSES = ["Check (front)", "Non-check", "Back of check"] as const;
