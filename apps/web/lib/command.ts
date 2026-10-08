// Pure helpers for the Temple Command Center. Unknown is explicit: a null count renders "ไม่ทราบ" with the database's own reason, NEVER 0.
// No per-person scores and no rankings anywhere (COMMAND_CENTER_UX CC-P4).
export const UNKNOWN_TH = "ไม่ทราบ";
export const DAILY_SUMMARY_TITLE = "สรุปอัตโนมัติจากข้อมูลในระบบ";
export const DAILY_SUMMARY_NOTE = "สร้างจากการนับข้อมูลตามกฎ ไม่ได้ใช้ AI เขียน และไม่ได้ตัดสินแทนคน";

export type Counted = { text: string; unknown: boolean; note: string | null };
/** A count (or null/undefined/non-number = unknown). Unknown carries the reason the database gave; a real 0 stays "0". */
export function countText(v: unknown, note?: string | null): Counted {
  if (typeof v === "number" && Number.isFinite(v)) return { text: v.toLocaleString("th-TH"), unknown: false, note: null };
  if (typeof v === "string" && /^-?\d+$/.test(v)) return { text: Number(v).toLocaleString("th-TH"), unknown: false, note: null };
  return { text: UNKNOWN_TH, unknown: true, note: note?.trim() || null };
}

type N = number | null;
export interface CommandJson {
  as_of: string; full_view: boolean;
  monastic?: { total: N; bhikkhu: N; samanera: N; by_state: Record<string, number> };
  invitations?: { today_confirmed: N; waiting_decision: N; release_requests: N };
  staff: { total?: N; checked_in_today?: N; on_leave?: N; note?: string };
  quests: { all?: N; completed?: N; active?: N; overdue?: N; unassigned?: N; blocked?: N } | null;
  events: { today?: N; next_48h?: N; not_ready?: N; volunteers_missing?: N };
  facility: { buildings?: N; buildings_closed?: N; parking_lots?: N; maintenance?: N; assets?: N; vehicles?: N; kitchen?: N; inventory?: N; note?: string };
  community: { followers?: N; volunteers_confirmed_upcoming?: N; points_issued_30d?: N; redemptions_waiting?: N; points_on_hold?: N; contact_unanswered?: N };
}
/** Shape check for the JSON of app.command_center; null when it is not usable. Missing sections become empty objects (their tiles then read "ไม่ทราบ"). */
export function parseCommand(raw: unknown): CommandJson | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.as_of !== "string") return null;
  const obj = (k: string) => (r[k] && typeof r[k] === "object" ? (r[k] as Record<string, unknown>) : {});
  return { ...r, as_of: r.as_of, full_view: r.full_view === true, staff: obj("staff"), quests: r.quests ? obj("quests") : null,
    events: obj("events"), facility: obj("facility"), community: obj("community") } as unknown as CommandJson;
}

/** "ข้อมูล ณ 7 ต.ค. 2569 17:00 น." (Bangkok). */
export function asOfText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "ข้อมูล ณ เวลาที่ไม่ทราบ";
  const date = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
  return `ข้อมูล ณ ${date} ${time} น.`;
}

// ---------- schedule conflicts ----------
export const CONFLICT_TH: Record<string, string> = { DOUBLE_BOOKED: "ตารางซ้อนกัน", MANUAL_BLOCK_OVER_COMMITMENT: "แจ้งไม่ว่างแต่มีกิจ" };
export const conflictLabel = (c: string) => CONFLICT_TH[c] ?? "ตารางอาจมีปัญหา";
export const SEVERITY_TH: Record<string, string> = { HIGH: "สำคัญมาก", MEDIUM: "ควรดู", LOW: "เล็กน้อย" };
export const severityLabel = (s: string) => SEVERITY_TH[s] ?? "ควรดู";
export const severityTone = (s: string) => (s === "HIGH" ? "b-bad" : s === "MEDIUM" ? "b-warn" : "b-closed");
export const conflictSuggestion = (c: string) =>
  c === "DOUBLE_BOOKED" ? "ข้อเสนอแนะ: ตรวจว่ากิจสองรายการนี้ซ้อนกันจริงหรือไม่ แล้วให้เจ้าหน้าที่หรือพระที่เกี่ยวข้องเลือกว่าจะย้ายรายการใด ระบบไม่ได้แก้ตารางให้เอง"
  : "ข้อเสนอแนะ: สอบถามพระรูปนั้นว่ายังไม่ว่างจริงหรือไม่ แล้วปรับสถานะหรือย้ายกิจ ระบบไม่ได้แก้ตารางให้เอง";

export const SEVERITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
export const sortConflicts = <T extends { severity: string; a_start: Date | string }>(rows: T[]): T[] =>
  [...rows].sort((x, y) => (SEVERITY_ORDER[x.severity] ?? 9) - (SEVERITY_ORDER[y.severity] ?? 9) || +new Date(x.a_start) - +new Date(y.a_start));
