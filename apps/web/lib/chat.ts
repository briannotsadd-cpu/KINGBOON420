// Pure helpers for chat (no server-only imports: unit-tested and used by both server and client code).
export const MAX_BODY = 2000;

export interface ChatMessage {
  id: string; sender: string; sender_name: string | null; body: string | null; removed: boolean;
  created_at: string; // ISO with microseconds, exactly as stored (used as the polling cursor)
}

/** Validates a message body the same way the DB does (trimmed, 1..2000 chars). */
export function validateBody(raw: string): { ok: true; body: string } | { ok: false; error: string } {
  const body = raw.trim();
  if (body.length === 0) return { ok: false, error: "พิมพ์ข้อความก่อนกดส่ง" };
  if (body.length > MAX_BODY) return { ok: false, error: `ข้อความยาวเกินไป (ไม่เกิน ${MAX_BODY.toLocaleString("en-US")} ตัวอักษร) กรุณาตัดให้สั้นลงหรือแบ่งส่งเป็นหลายข้อความ` };
  return { ok: true, body };
}

/** Maps a Postgres error code to an HTTP status for route handlers. */
export function httpStatusForPg(code: string | undefined): number {
  if (code === "42501") return 403;
  if (code === "54000") return 429;
  if (code === "P0002") return 404;
  if (code === "22023" || code === "23514" || code === "22P02") return 400;
  if (code === "55006") return 409;
  return 500;
}

export const RATE_TH = "ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่";
export const NET_TH = "ตอนนี้ทำรายการไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองกดอีกครั้ง";

/** Thai message for a Postgres error code in a chat context. */
export function chatErrorTh(code: string | undefined, ctx: "send" | "open" | "group" | "report" | "leave" = "send"): string {
  if (code === "54000") return RATE_TH;
  if (code === "42501") {
    if (ctx === "open") return "แชทได้เฉพาะคนที่เชื่อมต่อกันแล้ว กรุณาส่งคำขอเชื่อมต่อและรอให้อีกฝ่ายรับก่อน";
    if (ctx === "group") return "เพิ่มได้เฉพาะคนที่เชื่อมต่อกันแล้ว กรุณาเลือกคนในรายการอีกครั้ง";
    return "ส่งไม่ได้ เพราะคุณไม่ได้อยู่ในแชทนี้ หรือคุณกับอีกฝ่ายยังไม่ได้เชื่อมต่อกัน";
  }
  if (code === "P0002") return "ไม่พบข้อความที่ต้องการ อาจถูกลบไปแล้ว";
  if (code === "22023") return ctx === "group" ? "กลุ่มต้องมีสมาชิกอย่างน้อย 1 คนนอกจากคุณ และไม่เกิน 49 คน" : NET_TH;
  if (code === "23514") return ctx === "group" ? "ชื่อกลุ่มต้องยาว 2-60 ตัวอักษร" : NET_TH;
  return NET_TH;
}

/** Merge polled messages into the current list: dedupe by id (newer copy wins, e.g. a removal), oldest first. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : 1));
}

/** Polling cursor: the created_at of the newest message, or null when there is none. */
export function cursorOf(messages: ChatMessage[]): string | null {
  return messages.length ? messages[messages.length - 1].created_at : null;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
export const isIsoTimestamp = (s: string) => ISO_RE.test(s) && !Number.isNaN(Date.parse(s));

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID_RE.test(s);

/** First letters of a display name, for the avatar circle (no photo upload in v1). */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  // Thai leading vowels (เ แ โ ใ ไ) are not a useful initial on their own: keep the next letter too.
  const lead = new Set(["เ", "แ", "โ", "ใ", "ไ"]);
  const pick = (w: string) => { const c = [...w]; return lead.has(c[0]) && c[1] ? c[0] + c[1] : c[0]; };
  if (parts.length === 1) return pick(parts[0]).toUpperCase();
  return (pick(parts[0]) + pick(parts[parts.length - 1])).toUpperCase();
}

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "inappropriate", label: "ไม่เหมาะสม" },
  { value: "harassment", label: "คุกคาม / รังแก" },
  { value: "impersonation", label: "แอบอ้างเป็นคนอื่น" },
  { value: "minor_safety", label: "เกี่ยวกับความปลอดภัยของเด็ก" },
  { value: "other", label: "อื่น ๆ" },
];
export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value);

export const REMOVED_TH = "(ข้อความถูกลบ)";

/** "14:05" style time in Thai locale for a message bubble. */
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
}
