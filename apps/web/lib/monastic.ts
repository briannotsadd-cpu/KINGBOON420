// Pure helpers for the monk features (My Day, practice, availability, invitations). No server-only imports:
// unit-tested (monastic.test.ts) and used by server and client code. All times are Asia/Bangkok (UTC+7, no DST).
export const TZ = "Asia/Bangkok";
const OFFSET_MS = 7 * 3600_000;

// ---------- dates / time zone ----------
/** YYYY-MM-DD of an instant as seen in Bangkok. */
export const bkkYmd = (d: Date): string => new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
/** HH:mm of an instant as seen in Bangkok. */
export const bkkHm = (d: Date): string => new Date(d.getTime() + OFFSET_MS).toISOString().slice(11, 16);
/** YYYY-MM-DDTHH:mm (value for <input type=datetime-local>) in Bangkok. */
export const bkkLocal = (d: Date): string => `${bkkYmd(d)}T${bkkHm(d)}`;

export function isYmd(s: string | undefined | null): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
/** "2026-10-07" + "09:30" (Bangkok wall time) -> "2026-10-07T09:30:00+07:00", or null when not a real date/time. */
export function bkkToIso(ymd: string, hm: string): string | null {
  if (!isYmd(ymd) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hm)) return null;
  return `${ymd}T${hm}:00+07:00`;
}
/** Value of a datetime-local input ("YYYY-MM-DDTHH:mm") -> ISO with +07:00, or null. */
export function localToIso(v: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(v.trim());
  return m ? bkkToIso(m[1], m[2]) : null;
}
/** The default for "valid until": the end of today (Bangkok). */
export const endOfTodayLocal = (now: Date): string => `${bkkYmd(now)}T23:59`;

const FMT_DATE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ };
/** Thai Buddhist-era long date, e.g. "วันพุธที่ 7 ตุลาคม 2569". */
export const fmtDate = (d: Date) => d.toLocaleDateString("th-TH", FMT_DATE);
export const fmtDateShort = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
export const fmtTime = (d: Date) => `${bkkHm(d)} น.`;
export const fmtDateTime = (d: Date) => `${fmtDateShort(d)} ${fmtTime(d)}`;
export const fmtYmd = (ymd: string) => fmtDate(new Date(`${ymd}T12:00:00+07:00`));
export function fmtDuration(min: number): string {
  if (min < 60) return `${min} นาที`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} ชั่วโมง ${m} นาที` : `${h} ชั่วโมง`;
}

// ---------- labels ----------
export const AVAIL_STATE_TH: Record<string, string> = {
  AVAILABLE: "ว่างรับกิจ", UNAVAILABLE: "ไม่ว่าง", PERSONAL: "ส่วนตัว", REST: "พักผ่อน", UNKNOWN: "ไม่ทราบ",
  IN_TEMPLE: "อยู่ในวัด (เช็คอินแล้ว)", CEREMONY: "ทำพิธี", ON_INVITATION: "ไปกิจนิมนต์", TRAVELING: "เดินทาง", TEACHING: "สอน/เรียน/เวร",
};
export const stateLabel = (s: string) => AVAIL_STATE_TH[s] ?? "ไม่ทราบ";
export const stateBadge = (s: string): string =>
  s === "AVAILABLE" ? "b-ok" : s === "UNKNOWN" || s === "IN_TEMPLE" ? "b-unknown" : s === "UNAVAILABLE" ? "b-bad" : "b-warn";
/** The four states a person may set about himself (order = order on screen). */
export const SELF_STATES = [
  { value: "AVAILABLE", label: "ว่างรับกิจ" }, { value: "PERSONAL", label: "ส่วนตัว" },
  { value: "REST", label: "พักผ่อน" }, { value: "UNAVAILABLE", label: "ไม่ว่าง" },
] as const;
export const UNAVAIL_REASONS = [
  { value: "SICK", label: "อาพาธ (ป่วย)" }, { value: "RETREAT", label: "เข้าพรรษา/ปลีกวิเวก" }, { value: "OTHER", label: "เหตุอื่น" },
] as const;
const REASON_TH: Record<string, string> = { SICK: "อาพาธ (ป่วย)", RETREAT: "เข้าพรรษา/ปลีกวิเวก", OTHER: "เหตุอื่น" };
const CAL_KIND_TH: Record<string, string> = {
  ceremony: "ทำพิธี", invitation: "ไปกิจนิมนต์", travel: "เดินทาง", teaching: "สอน", class: "เรียน", duty: "เวร", personal: "กิจส่วนตัว",
};
/** Reason as returned by the resolver ("MANUAL:SICK", "CALENDAR:ceremony", "CHECKIN", "NO_SIGNAL", "MANUAL"). */
export function reasonLabel(r: string | null | undefined): string {
  if (!r) return "";
  if (r.startsWith("MANUAL:")) return `ตั้งไว้เป็น ไม่ว่าง · ${REASON_TH[r.slice(7)] ?? REASON_TH.OTHER}`;
  if (r === "MANUAL") return "ตั้งสถานะไว้เอง";
  if (r.startsWith("CALENDAR:")) return `ตามตาราง: ${CAL_KIND_TH[r.slice(9)] ?? "กิจที่กำหนด"}`;
  if (r === "CHECKIN") return "เช็คอินเข้าวัดแล้ว";
  if (r === "NO_SIGNAL") return "ยังไม่มีเช็คอิน การตั้งสถานะ หรือตารางในช่วงนี้";
  return "";
}
export const COARSE_TH: Record<string, string> = { FREE: "ว่าง", BUSY: "ไม่ว่าง", UNKNOWN: "ไม่ทราบ" };
export const coarseBadge = (c: string) => (c === "FREE" ? "b-ok" : c === "BUSY" ? "b-bad" : "b-unknown");

export const MONASTIC_KIND_TH: Record<string, string> = { bhikkhu: "พระภิกษุ", samanera: "สามเณร", visiting: "พระที่มาพำนัก" };

/** My Day row kinds in Thai. `kind` = schedule kind, `leg` = OUT/BACK for travel. */
export function dayKindLabel(item: string, kind?: string | null, leg?: string | null): string {
  if (item === "quest") return "ภารกิจ";
  switch (kind) {
    case "invitation": return "กิจนิมนต์";
    case "travel": return leg === "BACK" ? "เดินทางกลับ" : leg === "OUT" ? "เดินทางไป" : "เดินทาง";
    case "ceremony": return "พิธี";
    case "teaching": return "สอน";
    case "class": return "เรียน";
    case "duty": return "เวร";
    case "personal": return "ส่วนตัว";
    case "meal": return "ฉัน/อาหาร";
    case "leave": return "ลา";
    case "meeting": return "ประชุม";
    default: return "กิจอื่น ๆ";
  }
}
export function questStatusLabel(status: string, overdue: boolean, waiting: boolean): string {
  if (waiting || status === "SUBMITTED") return "รอตรวจรับ";
  if (status === "COMPLETED") return "เสร็จแล้ว";
  return overdue ? "เลยกำหนดแล้ว" : "ยังไม่เสร็จ";
}

export const INV_STATUS_TH: Record<string, string> = {
  RECEIVED: "รับเรื่องใหม่", REVIEWING: "กำลังพิจารณา", TEAM_PROPOSED: "รอเจ้าอาวาสยืนยัน", CONFIRMED: "ยืนยันแล้ว",
  IN_PROGRESS: "กำลังดำเนินกิจ", COMPLETED: "เสร็จสิ้น", DECLINED: "ปฏิเสธ", CANCELLED: "ยกเลิก",
};
export const INV_STATUS_ORDER = ["RECEIVED", "REVIEWING", "TEAM_PROPOSED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "DECLINED", "CANCELLED"] as const;
export const invBadge = (s: string) =>
  s === "CONFIRMED" || s === "COMPLETED" || s === "IN_PROGRESS" ? "b-ok" : s === "DECLINED" || s === "CANCELLED" ? "b-closed" : "b-warn";
export const DECLINE_REASONS = [
  { value: "DATE_CONFLICT", label: "วันเวลาไม่สะดวก/ตรงกับกิจอื่น" }, { value: "NOT_ENOUGH_MONKS", label: "พระไม่พอ" },
  { value: "OUT_OF_AREA", label: "อยู่นอกพื้นที่ที่วัดไปได้" }, { value: "RITE_NOT_SUITABLE", label: "พิธีนี้ไม่เหมาะสม" }, { value: "OTHER", label: "เหตุอื่น" },
] as const;
export const declineLabel = (c: string | null) => DECLINE_REASONS.find((r) => r.value === c)?.label ?? "";
export const TRANSPORTS = [
  { value: "HOST_PROVIDES", label: "เจ้าภาพจัดรถรับส่ง" }, { value: "TEMPLE_VEHICLE", label: "ใช้รถวัด" }, { value: "OTHER", label: "อื่น ๆ" },
] as const;
export const transportLabel = (c: string) => TRANSPORTS.find((r) => r.value === c)?.label ?? c;
export const RECEIVED_VIA = [
  { value: "phone", label: "โทรศัพท์" }, { value: "line", label: "ไลน์" }, { value: "walk_in", label: "มาแจ้งที่วัด" },
  { value: "web_form", label: "แบบฟอร์มเว็บ" }, { value: "temple_contact", label: "ข้อความถึงวัด" },
] as const;
export const DURATIONS = [30, 45, 60, 90, 120, 180, 240, 360] as const;
export const RESPONSE_TH: Record<string, string> = { PENDING: "ยังไม่ตอบรับ", ACKNOWLEDGED: "รับทราบแล้ว", RELEASE_REQUESTED: "แจ้งติดขัด" };

export const VIOLATION_TH: Record<string, string> = {
  NOT_ELIGIBLE: "ไม่อยู่ในกลุ่มที่นิมนต์ได้ (ต้องเป็นพระภิกษุ)",
  MANUAL_BLOCK: "ตั้งสถานะไม่ว่าง/ส่วนตัว/พักผ่อนไว้ในช่วงนี้",
  COMMITMENT_OVERLAP: "ติดกิจอื่นที่ตรงกับช่วงเวลานี้",
  DAILY_LIMIT: "มีกิจนิมนต์ครบ 2 กิจในวันนั้นแล้ว",
};
export const WARNING_TH: Record<string, string> = {
  NO_AVAILABILITY_SIGNAL: "ยังไม่ได้แจ้งว่าว่างรับกิจในช่วงนี้ ควรสอบถามก่อน",
  RETURN_BUFFER_UNKNOWN: "ยังไม่ทราบเวลาเดินทางไป-กลับ จึงเผื่อเวลากลับไม่ได้",
};
export const violationLabel = (c: string) => VIOLATION_TH[c] ?? "ติดเงื่อนไขของระบบ";
export const warningLabel = (c: string) => WARNING_TH[c] ?? "ควรตรวจสอบก่อน";

// ---------- availability board ----------
export interface BoardRow { person_id: string; display_name: string; monastic_kind: string; state: string; location: string; reason: string | null; until_at: Date | null }
/** Counter per state; UNKNOWN is always present (even with 0). Order: AVAILABLE first, UNKNOWN last. */
export function countStates(rows: { state: string }[]): { state: string; n: number }[] {
  const order = ["AVAILABLE", "IN_TEMPLE", "TEACHING", "CEREMONY", "ON_INVITATION", "TRAVELING", "PERSONAL", "REST", "UNAVAILABLE", "UNKNOWN"];
  const m = new Map<string, number>(order.map((s) => [s, 0]));
  for (const r of rows) m.set(r.state, (m.get(r.state) ?? 0) + 1);
  return [...m].filter(([s, n]) => n > 0 || s === "UNKNOWN").map(([state, n]) => ({ state, n }));
}

// ---------- suggestions ----------
export interface SuggestRow { person_id: string; display_name: string; list: string; violations: string[]; warnings: string[] }
export function groupSuggestions(rows: SuggestRow[]) {
  return {
    suggested: rows.filter((r) => r.list === "suggested"),
    needs: rows.filter((r) => r.list === "needs_confirmation"),
    excluded: rows.filter((r) => r.list === "excluded"),
  };
}
/** Warnings of the people on the team, deduplicated, in Thai (used on the confirm form). */
export function teamWarnings(rows: SuggestRow[], teamIds: string[], travelKnown: boolean): string[] {
  const set = new Set<string>();
  for (const r of rows) if (teamIds.includes(r.person_id)) for (const w of r.warnings) set.add(w);
  if (!travelKnown) set.add("RETURN_BUFFER_UNKNOWN");
  return [...set].map(warningLabel);
}

// ---------- form parsing ----------
export type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };
const DAY_MS = 86_400_000;

export function parseAvailability(v: { state: string; valid_until: string; reason: string }, now: Date): Parsed<{ state: string; untilIso: string; reason: string | null }> {
  const fe: Record<string, string> = {};
  if (!SELF_STATES.some((s) => s.value === v.state)) fe.state = "กรุณาเลือกสถานะ";
  let iso: string | null = null;
  if (!v.valid_until.trim()) fe.valid_until = "กรุณาระบุว่าสถานะนี้ใช้ถึงเมื่อไร (ระบบไม่ตั้งให้เอง)";
  else if (!(iso = localToIso(v.valid_until))) fe.valid_until = "วันและเวลาไม่ถูกต้อง กรุณาเลือกใหม่";
  else {
    const t = new Date(iso).getTime();
    if (t <= now.getTime()) fe.valid_until = "เวลานี้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต";
    else if (v.state !== "UNAVAILABLE" && t - now.getTime() > DAY_MS) fe.valid_until = "สถานะนี้ตั้งได้ไม่เกิน 24 ชั่วโมง ถ้าต้องการนานกว่านั้นให้เลือก ไม่ว่าง";
    else if (t - now.getTime() > 120 * DAY_MS) fe.valid_until = "ตั้งได้ไม่เกิน 120 วัน";
  }
  if (v.state === "UNAVAILABLE" && v.reason && !UNAVAIL_REASONS.some((r) => r.value === v.reason)) fe.reason = "กรุณาเลือกเหตุผล";
  if (Object.keys(fe).length || !iso) return { ok: false, fieldErrors: fe };
  return { ok: true, value: { state: v.state, untilIso: iso, reason: v.state === "UNAVAILABLE" ? v.reason || "OTHER" : null } };
}

/** Secretary sets another monk UNAVAILABLE: the end DATE is required; the status lasts to the end of that day. */
export function parseOtherUnavailable(v: { person_id: string; end_date: string; reason: string }, now: Date): Parsed<{ personId: string; untilIso: string; reason: string }> {
  const fe: Record<string, string> = {};
  if (!/^[0-9a-f-]{36}$/.test(v.person_id)) fe.person_id = "กรุณาเลือกพระรูปที่ต้องการตั้งสถานะ";
  let iso: string | null = null;
  if (!v.end_date.trim()) fe.end_date = "กรุณาระบุวันสุดท้ายที่ไม่ว่าง (ระบบไม่ตั้งให้เอง)";
  else if (!isYmd(v.end_date.trim())) fe.end_date = "วันที่ไม่ถูกต้อง กรุณาเลือกใหม่";
  else {
    iso = bkkToIso(addDaysYmd(v.end_date.trim(), 1), "00:00");
    const t = new Date(iso!).getTime();
    if (t <= now.getTime()) fe.end_date = "วันนี้ผ่านไปแล้ว กรุณาเลือกวันนี้หรือวันหลังจากนี้";
    else if (t - now.getTime() > 120 * DAY_MS) fe.end_date = "ตั้งได้ไม่เกิน 120 วัน";
  }
  if (!UNAVAIL_REASONS.some((r) => r.value === v.reason)) fe.reason = "กรุณาเลือกเหตุผล";
  if (Object.keys(fe).length || !iso) return { ok: false, fieldErrors: fe };
  return { ok: true, value: { personId: v.person_id, untilIso: iso, reason: v.reason } };
}

export interface InvitationInput {
  host_name: string; host_phone: string; host_relation: string; rite: string; venue: string; date: string; time: string;
  duration: string; monks: string; transport: string; travel_out: string; travel_back: string; via: string; note: string;
}
export interface InvitationValue {
  hostName: string; hostPhone: string | null; hostRelation: string | null; rite: string; venue: string; startsIso: string; duration: number;
  monks: number; transport: string; out: number | null; back: number | null; via: string; note: string | null;
}
const optInt = (s: string, lo: number, hi: number): number | null | "bad" => {
  const t = s.trim(); if (!t) return null;
  if (!/^\d{1,4}$/.test(t)) return "bad";
  const n = Number(t); return n < lo || n > hi ? "bad" : n;
};
export function parseInvitation(v: InvitationInput, now: Date): Parsed<InvitationValue> {
  const fe: Record<string, string> = {};
  const host = v.host_name.trim(), venue = v.venue.trim();
  if (host.length < 2 || host.length > 120) fe.host_name = "กรุณาใส่ชื่อเจ้าภาพ (2-120 ตัวอักษร)";
  const phone = v.host_phone.trim();
  if (phone && !/^[0-9+ -]{6,20}$/.test(phone)) fe.host_phone = "เบอร์โทรใช้ได้เฉพาะตัวเลข เว้นวรรค + และ - (6-20 ตัว)";
  if (v.host_relation.trim().length > 80) fe.host_relation = "ยาวเกินไป (ไม่เกิน 80 ตัวอักษร)";
  if (!/^[0-9a-f-]{36}$/.test(v.rite)) fe.rite = "กรุณาเลือกประเภทพิธี ถ้าไม่มีในรายการให้เพิ่มประเภทพิธีใหม่";
  if (venue.length < 2 || venue.length > 300) fe.venue = "กรุณาใส่สถานที่ (2-300 ตัวอักษร)";
  const iso = bkkToIso(v.date.trim(), v.time.trim());
  if (!v.date.trim()) fe.date = "กรุณาเลือกวันที่";
  else if (!isYmd(v.date.trim())) fe.date = "วันที่ไม่ถูกต้อง";
  if (!v.time.trim()) fe.time = "กรุณาเลือกเวลา";
  else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time.trim())) fe.time = "เวลาไม่ถูกต้อง";
  if (iso && new Date(iso).getTime() <= now.getTime()) fe.date = "วันเวลานี้ผ่านไปแล้ว กรุณาเลือกวันเวลาในอนาคต";
  const dur = Number(v.duration);
  if (!Number.isInteger(dur) || dur < 10 || dur > 720) fe.duration = "กรุณาเลือกระยะเวลา";
  const monks = /^\d{1,2}$/.test(v.monks.trim()) ? Number(v.monks.trim()) : NaN;
  if (!(monks >= 1 && monks <= 50)) fe.monks = "จำนวนพระต้องเป็นตัวเลข 1-50 รูป";
  if (!TRANSPORTS.some((t) => t.value === v.transport)) fe.transport = "กรุณาเลือกการเดินทาง";
  const out = optInt(v.travel_out, 0, 600), back = optInt(v.travel_back, 0, 600);
  if (out === "bad") fe.travel_out = "ใส่เป็นจำนวนนาที 0-600 หรือเว้นว่างถ้าไม่ทราบ";
  if (back === "bad") fe.travel_back = "ใส่เป็นจำนวนนาที 0-600 หรือเว้นว่างถ้าไม่ทราบ";
  if (!RECEIVED_VIA.some((t) => t.value === v.via)) fe.via = "กรุณาเลือกช่องทางที่รับเรื่อง";
  if (v.note.trim().length > 1000) fe.note = "ยาวเกินไป (ไม่เกิน 1,000 ตัวอักษร)";
  if (Object.keys(fe).length || !iso) return { ok: false, fieldErrors: fe };
  return { ok: true, value: { hostName: host, hostPhone: phone || null, hostRelation: v.host_relation.trim() || null, rite: v.rite, venue, startsIso: iso,
    duration: dur, monks, transport: v.transport, out: out as number | null, back: back as number | null, via: v.via, note: v.note.trim() || null } };
}

export function parseRiteType(v: { name: string; duration: string; requires_lead: boolean }): Parsed<{ name: string; duration: number; requiresLead: boolean }> {
  const fe: Record<string, string> = {};
  const name = v.name.trim();
  if (name.length < 2 || name.length > 80) fe.rite_name = "กรุณาใส่ชื่อประเภทพิธี (2-80 ตัวอักษร)";
  const d = Number(v.duration);
  if (!Number.isInteger(d) || d < 10 || d > 720) fe.rite_duration = "กรุณาเลือกระยะเวลามาตรฐาน";
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
  return { ok: true, value: { name, duration: d, requiresLead: v.requires_lead } };
}

// ---------- error mapping (Postgres error -> Thai message that says what to do next) ----------
export const NET_ERR = "ตอนนี้ทำรายการไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองกดอีกครั้ง";
export const STALE_ERR = "มีคนแก้ไขกิจนิมนต์นี้ไปแล้ว กรุณาโหลดหน้านี้ใหม่";
export const CONFIRM_ERR = "ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายยืนยัน";
export interface PgLike { code?: string; message?: string }

export function availabilityError(e: PgLike): string {
  const m = e.message ?? "";
  if (m.includes("VALID_UNTIL_REQUIRED")) return "กรุณาระบุว่าสถานะนี้ใช้ถึงเมื่อไร";
  if (m.includes("VALID_UNTIL_IN_PAST")) return "เวลาที่เลือกผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต";
  if (m.includes("VALID_UNTIL_TOO_FAR")) return "ช่วงเวลานานเกินไป: ว่างรับกิจ/ส่วนตัว/พักผ่อน ไม่เกิน 24 ชั่วโมง และ ไม่ว่าง ไม่เกิน 120 วัน";
  if (m.includes("NOT_MONASTIC")) return "สถานะนี้ตั้งได้เฉพาะพระภิกษุและสามเณรของวัด";
  if (m.includes("FORBIDDEN_STATE_FOR_ACTOR")) return "การตั้งสถานะให้ผู้อื่น ตั้งได้เฉพาะ ไม่ว่าง เท่านั้น";
  if (m.includes("CALENDAR_STATE_NOT_SETTABLE")) return "สถานะนี้ตั้งเองไม่ได้ กรุณาเลือกสถานะอื่น";
  if (e.code === "42501") return "คุณไม่มีสิทธิ์ทำรายการนี้ กรุณาติดต่อเจ้าอาวาสหรือเลขาฯ";
  if (e.code === "P0002") return "ไม่พบรายการนี้ อาจถูกยกเลิกไปแล้ว กรุณาโหลดหน้านี้ใหม่";
  return NET_ERR;
}

/** Violations after "HARD_CONSTRAINT <uuid>: A,B" -> Thai list. */
export function hardConstraintDetail(message: string): string {
  const tail = message.split(":").slice(1).join(":").trim();
  const codes = tail.split(",").map((s) => s.trim()).filter(Boolean);
  return codes.length ? codes.map(violationLabel).join(" / ") : "";
}

export function invitationError(e: PgLike, op?: string): string {
  const m = e.message ?? "", c = e.code;
  if (c === "40001" || m.includes("STALE_PROPOSAL")) return STALE_ERR;
  if (m.includes("HUMAN_CONFIRM_REQUIRED")) return CONFIRM_ERR;
  if (c === "42501") return op === "confirm" || op === "decline" || op === "cancel" ? CONFIRM_ERR : "คุณไม่มีสิทธิ์ทำรายการนี้ กรุณาติดต่อเลขาฯ หรือเจ้าอาวาส";
  if (m.includes("HARD_CONSTRAINT")) {
    const d = hardConstraintDetail(m);
    return `มีพระในทีมที่ไม่สามารถไปกิจนี้ได้${d ? `: ${d}` : ""} กรุณาโหลดหน้านี้ใหม่แล้วเลือกทีมใหม่`;
  }
  if (m.includes("TEAM_SIZE_MISMATCH")) return "จำนวนพระที่เลือกไม่ตรงกับจำนวนที่เจ้าภาพขอ กรุณาเลือกให้ครบตามจำนวน";
  if (m.includes("WARNINGS_NOT_ACKNOWLEDGED")) return "มีคำเตือนที่ต้องรับทราบก่อนยืนยัน กรุณาติ๊ก รับทราบคำเตือน";
  if (m.includes("LEAD_REQUIRED")) return "พิธีนี้ต้องมีหัวหน้าคณะ กรุณาเลือกหัวหน้าคณะจากพระที่เลือกไว้";
  if (m.includes("ILLEGAL_TRANSITION")) return "ตอนนี้ทำรายการนี้ไม่ได้ เพราะสถานะของกิจนิมนต์เปลี่ยนไปแล้ว กรุณาโหลดหน้านี้ใหม่";
  if (m.includes("reason code required")) return "กรุณาเลือกเหตุผลที่ไม่รับกิจนิมนต์";
  if (m.includes("reason required")) return "กรุณาพิมพ์เหตุผลที่ยกเลิก";
  if (m.includes("starts_at passed") || m.includes("starts_at must be in the future")) return "วันเวลาของกิจนิมนต์ผ่านไปแล้ว";
  if (c === "P0002") return "ไม่พบกิจนิมนต์นี้ กรุณาโหลดหน้านี้ใหม่";
  if (c === "23514") return "ข้อมูลบางส่วนไม่ผ่านการตรวจสอบ กรุณาตรวจสอบแล้วลองอีกครั้ง";
  return NET_ERR;
}

export function respondError(e: PgLike): string {
  if (e.code === "42501") return "คุณไม่ได้อยู่ในคณะของกิจนิมนต์นี้ จึงตอบรับไม่ได้";
  return NET_ERR;
}

export const RESPOND_OK: Record<string, string> = {
  ACKNOWLEDGED: "บันทึกแล้ว: รับทราบกิจนิมนต์",
  RELEASE_REQUESTED: "ส่งเรื่องแจ้งติดขัดถึงเลขาฯ แล้ว (กิจนิมนต์ยังไม่ถูกยกเลิก รอเลขาฯ ติดต่อกลับ)",
};
export const OP_OK: Record<string, string> = {
  start_review: "เริ่มพิจารณากิจนิมนต์แล้ว", propose_team: "เสนอทีมพระแล้ว รอเจ้าอาวาสหรือผู้ได้รับมอบหมายยืนยัน",
  revise_team: "เปิดให้เลือกทีมใหม่แล้ว", confirm: "ยืนยันกิจนิมนต์แล้ว ตารางของพระในทีมถูกบันทึกเรียบร้อย",
  decline: "บันทึกการปฏิเสธกิจนิมนต์แล้ว", cancel: "ยกเลิกกิจนิมนต์แล้ว ตารางของพระในทีมถูกยกเลิกด้วย",
  start: "บันทึกว่าเริ่มกิจแล้ว", complete: "บันทึกว่ากิจเสร็จสิ้นแล้ว",
};
