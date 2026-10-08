// Events ("Boss Quest", งานบุญ/กิจกรรม): pure helpers (labels, Bangkok time conversion, form validation, DB error messages).
// No I/O here so it is unit-tested and importable from client components. All authority stays in the database functions.

export const BKK_OFFSET_H = 7;   // Asia/Bangkok has had no daylight saving since 1920

export const KINDS = [
  { value: "festival_day", label: "วันสำคัญทางศาสนา" },
  { value: "merit_offering", label: "ทอดกฐิน/ผ้าป่า" },
  { value: "ceremony", label: "พิธีทางศาสนา" },
  { value: "ordination", label: "บรรพชา/อุปสมบท" },
  { value: "course", label: "อบรม/ปฏิบัติธรรม" },
  { value: "community", label: "กิจกรรมชุมชน" },
  { value: "other", label: "อื่น ๆ" },
] as const;
export const kindLabel = (k: string) => KINDS.find((x) => x.value === k)?.label ?? "อื่น ๆ";

export const VISIBILITIES = [
  { value: "internal", label: "ภายในทีมงาน", hint: "เห็นเฉพาะผู้จัดการงานของวัด" },
  { value: "temple_members", label: "สมาชิกวัด", hint: "เจ้าหน้าที่และพระของวัดเห็นได้" },
  { value: "public", label: "สาธารณะ", hint: "แสดงบนหน้าวัดให้ทุกคนเห็น (ชื่องาน เวลา สถานที่ และจำนวนอาสาที่ต้องการ)" },
] as const;
export const visibilityLabel = (v: string) => VISIBILITIES.find((x) => x.value === v)?.label ?? v;

export const STATUS_TH: Record<string, string> = {
  DRAFT: "ร่าง", PLANNING: "กำลังวางแผน", APPROVED: "อนุมัติแล้ว", LIVE: "กำลังจัดงาน", COMPLETED: "ปิดงานแล้ว", CANCELLED: "ยกเลิก",
};
export type Tone = "ok" | "warn" | "bad" | "closed" | "unknown";
export const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "closed", PLANNING: "unknown", APPROVED: "ok", LIVE: "ok", COMPLETED: "closed", CANCELLED: "bad",
};

export type ReadinessState = "READY" | "ALMOST_READY" | "IN_PROGRESS" | "NOT_READY" | "UNKNOWN";
export const READINESS_TH: Record<ReadinessState, string> = {
  READY: "พร้อม", ALMOST_READY: "ใกล้พร้อม", IN_PROGRESS: "กำลังเตรียม", NOT_READY: "ยังไม่พร้อม", UNKNOWN: "ไม่ทราบ",
};
export const READINESS_TONE: Record<ReadinessState, Tone> = {
  READY: "ok", ALMOST_READY: "warn", IN_PROGRESS: "unknown", NOT_READY: "bad", UNKNOWN: "closed",
};
export const READINESS_REASON_TH: Record<string, string> = {
  GATE_FAILED: "มีเงื่อนไขบังคับที่ยังไม่ผ่าน (ดูรายการด้านล่าง)",
  TIME_PRESSURE: "ใกล้วันงานแล้วแต่ยังเตรียมไม่ครบ",
  OVERDUE_START: "ถึงเวลาเริ่มงานแล้วแต่ยังไม่ได้กดเริ่มงาน",
  NO_PLAN: "ยังไม่มีงานย่อยหรือเป้าหมายกำลังคน จึงยังบอกความพร้อมไม่ได้",
  NOT_PLANNED: "งานยังเป็นร่าง กดวางแผนเพื่อเริ่มวัดความพร้อม",
};

export const GATES = ["G-OWNER", "G-VENUE", "G-STAFF", "G-CRIT", "G-CHECK"] as const;
export type GateKey = (typeof GATES)[number];
export type GateResult = "PASS" | "FAIL" | "UNKNOWN";
export const GATE_TH: Record<GateKey, string> = {
  "G-OWNER": "มีผู้รับผิดชอบงาน",
  "G-VENUE": "ระบุสถานที่จัดงานแล้ว",
  "G-STAFF": "กำลังคนถึงขั้นต่ำของเป้าหมายบังคับ",
  "G-CRIT": "งานสำคัญมาก/วิกฤตไม่เลยกำหนด",
  "G-CHECK": "งาน \"ต้องเสร็จก่อนงาน\" ไม่เลยกำหนด",
};
export const GATE_RESULT_TH: Record<GateResult, string> = { PASS: "ผ่าน", FAIL: "ไม่ผ่าน", UNKNOWN: "ยังไม่ทราบ" };
export const GATE_RESULT_TONE: Record<GateResult, Tone> = { PASS: "ok", FAIL: "bad", UNKNOWN: "closed" };

export interface ReadinessView {
  state: ReadinessState | null; percent: number | null; reason: string | null; frozen: boolean;
  /** Present only when the database returned full detail (managers / staff with event.view T). */
  detail: null | { gates: Record<GateKey, GateResult>; staffing: number | null; tasksDone: number | null; tasksTotal: number | null; volunteerGap: number | null };
}
const STATES = new Set<string>(["READY", "ALMOST_READY", "IN_PROGRESS", "NOT_READY", "UNKNOWN"]);
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;

/** app.event_readiness() jsonb -> view. Gates are shown only if the database sent them. */
export function parseReadiness(raw: unknown): ReadinessView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const state = typeof r.state === "string" && STATES.has(r.state) ? (r.state as ReadinessState) : null;
  const g = r.gates && typeof r.gates === "object" ? (r.gates as Record<string, unknown>) : null;
  let detail: ReadinessView["detail"] = null;
  if (g) {
    const gates = {} as Record<GateKey, GateResult>;
    for (const k of GATES) gates[k] = g[k] === "PASS" || g[k] === "FAIL" ? (g[k] as GateResult) : "UNKNOWN";
    detail = { gates, staffing: num(r.staffing), tasksDone: num(r.tasks_done_weight), tasksTotal: num(r.tasks_total_weight), volunteerGap: num(r.volunteer_gap) };
  }
  return { state, percent: num(r.percent), reason: typeof r.reason === "string" ? r.reason : null, frozen: r.frozen === true, detail };
}

export const CATEGORIES = [
  { value: "monk", label: "พระ" }, { value: "volunteer", label: "อาสาสมัคร" }, { value: "staff", label: "เจ้าหน้าที่" },
] as const;
export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const WEIGHTS = [
  { value: 1, label: "ต่ำ" }, { value: 2, label: "ปกติ" }, { value: 3, label: "สูง" }, { value: 4, label: "สำคัญมาก" }, { value: 5, label: "วิกฤต" },
] as const;
export const weightLabel = (w: number) => WEIGHTS.find((x) => x.value === w)?.label ?? String(w);

export const PARTICIPANT_TH: Record<string, string> = { PENDING: "รออนุมัติ", CONFIRMED: "ยืนยันแล้ว", DECLINED: "ไม่ได้รับอนุมัติ", CANCELLED: "ถอนตัวแล้ว" };
export const PARTICIPANT_TONE: Record<string, Tone> = { PENDING: "warn", CONFIRMED: "ok", DECLINED: "bad", CANCELLED: "closed" };
export const TASK_TH: Record<string, string> = {
  ASSIGNED: "ยังไม่เริ่ม", IN_PROGRESS: "กำลังทำ", BLOCKED: "ติดขัด", SUBMITTED: "ส่งงานแล้ว รอตรวจรับ", COMPLETED: "ตรวจรับแล้ว", CANCELLED: "ยกเลิก",
};
export const TASK_TONE: Record<string, Tone> = { ASSIGNED: "closed", IN_PROGRESS: "unknown", BLOCKED: "bad", SUBMITTED: "warn", COMPLETED: "ok", CANCELLED: "closed" };

// ---- Asia/Bangkok time ------------------------------------------------------------------------------------------------

/** "2026-10-17T09:00" (datetime-local, read as Bangkok time) -> "2026-10-17T09:00:00+07:00"; null if not a real date. */
export function bkkLocalToIso(v: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d || t.getUTCHours() !== h || t.getUTCMinutes() !== mi) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+07:00`;
}
/** instant -> "YYYY-MM-DDTHH:mm" as Bangkok wall-clock time (value for <input type=datetime-local>). */
export function toBkkLocal(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  return new Date(t.getTime() + BKK_OFFSET_H * 3600_000).toISOString().slice(0, 16);
}
const dateFmt = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
const timeFmt = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
const asDate = (d: Date | string) => (typeof d === "string" ? new Date(d) : d);
/** "วันเสาร์ที่ 17 ตุลาคม 2569" (Thai Buddhist year, Bangkok date) */
export const formatDateTh = (d: Date | string) => dateFmt.format(asDate(d));
/** "09:00 น." */
export const formatTimeTh = (d: Date | string) => `${timeFmt.format(asDate(d)).replace(".", ":")} น.`;
export function formatRangeTh(start: Date | string, end: Date | string): string {
  const s = asDate(start), e = asDate(end);
  return toBkkLocal(s).slice(0, 10) === toBkkLocal(e).slice(0, 10)
    ? `${formatDateTh(s)} เวลา ${formatTimeTh(s)} – ${formatTimeTh(e)}`
    : `${formatDateTh(s)} ${formatTimeTh(s)} ถึง ${formatDateTh(e)} ${formatTimeTh(e)}`;
}
/** Upcoming = not cancelled/completed and not yet finished. */
export const isUpcoming = (e: { status: string; ends_at: Date | string }, now = new Date()) =>
  e.status !== "CANCELLED" && e.status !== "COMPLETED" && asDate(e.ends_at).getTime() >= now.getTime();

// ---- form validation --------------------------------------------------------------------------------------------------

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Fe = Record<string, string>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Fe };
const intOf = (s: string): number | null => (/^\d{1,9}$/.test(s.trim()) ? Number(s.trim()) : null);
const len = (s: string) => [...s.trim()].length;

export interface EventInput {
  kind: string; title: string; description: string; startsIso: string; endsIso: string; venue: string;
  visibility: string; lead: string | null; expected: number | null;
}
export function parseEventForm(v: Record<string, string>): Parsed<EventInput> {
  const e: Fe = {};
  const kind = (v.kind ?? "").trim(), title = (v.title ?? "").trim(), description = (v.description ?? "").trim(), venue = (v.venue ?? "").trim();
  const visibility = (v.visibility ?? "").trim(), lead = (v.lead ?? "").trim(), expectedRaw = (v.expected ?? "").trim();
  if (!KINDS.some((k) => k.value === kind)) e.kind = "กรุณาเลือกประเภทงาน";
  if (len(title) < 2 || len(title) > 120) e.title = "ชื่องานต้องยาว 2 ถึง 120 ตัวอักษร ตัวอย่าง: ทอดกฐินสามัคคี";
  if (len(description) > 2000) e.description = "รายละเอียดยาวเกิน 2,000 ตัวอักษร กรุณาตัดให้สั้นลง";
  const startsIso = bkkLocalToIso(v.starts ?? ""), endsIso = bkkLocalToIso(v.ends ?? "");
  if (!startsIso) e.starts = "กรุณาใส่วันและเวลาเริ่มงาน";
  if (!endsIso) e.ends = "กรุณาใส่วันและเวลาสิ้นสุดงาน";
  if (startsIso && endsIso && new Date(endsIso).getTime() <= new Date(startsIso).getTime()) e.ends = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มงาน";
  if (len(venue) > 300) e.venue = "สถานที่ยาวเกิน 300 ตัวอักษร";
  if (!VISIBILITIES.some((x) => x.value === visibility)) e.visibility = "กรุณาเลือกว่าใครเห็นงานนี้ได้";
  if (lead && !UUID_RE.test(lead)) e.lead = "ผู้รับผิดชอบที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่";
  let expected: number | null = null;
  if (expectedRaw) { expected = intOf(expectedRaw); if (expected === null) e.expected = "ใส่เป็นตัวเลขเท่านั้น ตัวอย่าง: 300"; }
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { kind, title, description, startsIso: startsIso!, endsIso: endsIso!, venue, visibility, lead: lead || null, expected } };
}

export interface TargetInput { category: string; label: string; required: number; min: number | null; hard: boolean }
export function parseTargetForm(v: Record<string, string>): Parsed<TargetInput> {
  const e: Fe = {};
  const category = (v.category ?? "").trim(), label = (v.label ?? "").trim();
  const required = intOf(v.required ?? ""), minRaw = (v.min ?? "").trim();
  if (!CATEGORIES.some((c) => c.value === category)) e.category = "กรุณาเลือกประเภท พระ อาสาสมัคร หรือเจ้าหน้าที่";
  if (len(label) < 2 || len(label) > 80) e.label = "ชื่อเป้าหมายต้องยาว 2 ถึง 80 ตัวอักษร ตัวอย่าง: อาสาจัดสถานที่";
  if (required === null || required < 1 || required > 500) e.required = "จำนวนที่ต้องการต้องเป็นตัวเลข 1 ถึง 500";
  let min: number | null = null;
  if (minRaw) {
    min = intOf(minRaw);
    if (min === null) e.min = "ใส่เป็นตัวเลขเท่านั้น หรือเว้นว่างไว้";
    else if (required !== null && min > required) e.min = "ขั้นต่ำต้องไม่มากกว่าจำนวนที่ต้องการ";
  }
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { category, label, required: required!, min, hard: v.hard === "on" } };
}

export interface TaskInput { title: string; weight: number; gate: boolean; dueIso: string | null; assignee: string | null }
export function parseTaskForm(v: Record<string, string>): Parsed<TaskInput> {
  const e: Fe = {};
  const title = (v.title ?? "").trim(), weight = intOf(v.weight ?? ""), dueRaw = (v.due ?? "").trim(), assignee = (v.assignee ?? "").trim();
  if (len(title) < 2 || len(title) > 120) e.title = "ชื่องานย่อยต้องยาว 2 ถึง 120 ตัวอักษร ตัวอย่าง: เตรียมเครื่องเสียง";
  if (weight === null || weight < 1 || weight > 5) e.weight = "กรุณาเลือกความสำคัญของงาน";
  let dueIso: string | null = null;
  if (dueRaw) { dueIso = bkkLocalToIso(dueRaw); if (!dueIso) e.due = "วันและเวลากำหนดส่งไม่ถูกต้อง"; }
  if (assignee && !UUID_RE.test(assignee)) e.assignee = "ผู้รับผิดชอบที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { title, weight: weight!, gate: v.gate === "on", dueIso, assignee: assignee || null } };
}

export function parseReason(raw: string): Parsed<string> {
  const r = raw.trim();
  if (!r) return { ok: false, fieldErrors: { reason: "กรุณาบอกเหตุผลที่ยกเลิกงาน เพื่อให้ทีมงานเข้าใจ" } };
  if (len(r) > 500) return { ok: false, fieldErrors: { reason: "เหตุผลยาวเกิน 500 ตัวอักษร กรุณาตัดให้สั้นลง" } };
  return { ok: true, value: r };
}

// ---- operations & DB refusals -----------------------------------------------------------------------------------------

export const TRANSITIONS = ["plan", "approve", "start", "close", "cancel"] as const;
export type Transition = (typeof TRANSITIONS)[number];
export const TRANSITION_TH: Record<Transition, string> = { plan: "วางแผนงาน", approve: "อนุมัติงาน", start: "เริ่มงาน", close: "ปิดงาน", cancel: "ยกเลิกงาน" };
export const TRANSITION_DONE_TH: Record<Transition, string> = {
  plan: "วางแผนงานแล้ว ตอนนี้เพิ่มเป้าหมายกำลังคนและงานย่อยได้", approve: "อนุมัติงานแล้ว", start: "เริ่มงานแล้ว (ค่าความพร้อมถูกบันทึกไว้ ณ ตอนเริ่ม)",
  close: "ปิดงานแล้ว", cancel: "ยกเลิกงานแล้ว",
};
/** Which next-step button an event in this status offers (cancel is separate). */
export const NEXT_STEP: Record<string, Transition | undefined> = { DRAFT: "plan", PLANNING: "approve", APPROVED: "start", LIVE: "close" };
export const CAN_CANCEL = new Set(["DRAFT", "PLANNING", "APPROVED"]);
export const APPROVER_MSG = "ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายอนุมัติ";

export type Op = Transition | "target" | "participant" | "decide" | "signup" | "withdraw" | "task" | "progress";
export const TASK_ACTIONS = ["start", "submit", "verify", "reject"] as const;

/** Thai message for a database refusal. code = SQLSTATE, msg = the DB's English message (only used to tell causes apart). */
export function dbErrorMessage(op: Op, code: string | undefined, msg = "", sub?: string): string {
  const m = msg.toLowerCase();
  if (code === "42501") {
    if (op === "approve") return APPROVER_MSG;
    if (op === "cancel") return `${APPROVER_MSG} (การยกเลิกงานที่อนุมัติแล้วต้องให้ผู้อนุมัติทำ)`;
    if (op === "signup") return "สมัครเป็นอาสาไม่ได้ในตอนนี้ งานต้องอยู่ในช่วงวางแผนหรืออนุมัติแล้ว และพระหรือผู้เยาว์สมัครเองไม่ได้ กรุณาติดต่อเจ้าหน้าที่วัด";
    if (op === "progress" && sub === "verify") return "ตรวจรับงานไม่ได้ คนที่ส่งงานตรวจรับงานของตัวเองไม่ได้ กรุณาให้ผู้จัดการงานคนอื่นตรวจรับ";
    if (op === "progress") return "คุณไม่ใช่ผู้ได้รับมอบหมายงานนี้ จึงเริ่มหรือส่งงานแทนไม่ได้";
    if (op === "decide") return "คุณไม่มีสิทธิ์อนุมัติอาสาสมัครของงานนี้";
    return "คุณไม่มีสิทธิ์ทำรายการนี้ กรุณาติดต่อผู้ดูแลวัด";
  }
  if (code === "P0002") {
    if (op === "decide") return "ไม่มีรายการที่ต้องตัดสินใจ อาจมีคนอื่นตัดสินไปแล้ว หรือเป็นการสมัครของตัวคุณเอง ซึ่งอนุมัติเองไม่ได้ กรุณาโหลดหน้านี้ใหม่";
    return "ไม่พบรายการนี้ อาจถูกเปลี่ยนไปแล้ว กรุณาโหลดหน้านี้ใหม่";
  }
  if (code === "23514") {
    if (m.includes("lead person required")) return "ต้องเลือกผู้รับผิดชอบงานก่อนวางแผน กรุณากด \"แก้ไขรายละเอียดงาน\" แล้วเลือกผู้รับผิดชอบ";
    if (m.includes("venue required")) return "ต้องระบุสถานที่จัดงานก่อนอนุมัติ กรุณากด \"แก้ไขรายละเอียดงาน\" แล้วใส่สถานที่";
    if (m.includes("reason required")) return "กรุณาบอกเหตุผลที่ยกเลิกงาน";
    if (m.includes("illegal_transition")) return "สถานะของงานเปลี่ยนไปแล้ว (อาจมีคนอื่นดำเนินการ) กรุณาโหลดหน้านี้ใหม่";
    if (m.includes("ledger_kind_mismatch")) return "ใส่คนนี้ในเป้าหมายนี้ไม่ได้ พระต้องอยู่เป้าหมายประเภทพระ ส่วนฆราวาสต้องอยู่ประเภทอาสาสมัครหรือเจ้าหน้าที่";
    if (m.includes("can no longer be edited")) return "งานนี้เริ่มหรือปิดไปแล้ว แก้ไขรายละเอียดไม่ได้";
    if (m.includes("verifier")) return "ผู้ตรวจรับต้องเป็นคนละคนกับผู้ทำงาน กรุณาให้คนอื่นตรวจรับ";
    if (m.includes("ends_at") || m.includes("events_check")) return "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มงาน";
    if (op === "participant" || op === "decide") return "บันทึกไม่ได้ เพราะข้อมูลไม่ตรงเงื่อนไขของระบบ กรุณาโหลดหน้านี้ใหม่แล้วลองอีกครั้ง";
    return "ข้อมูลบางส่วนไม่ผ่านการตรวจสอบของระบบ กรุณาตรวจสอบแล้วลองอีกครั้ง";
  }
  if (code === "23503") return "คนที่เลือกไม่ได้เป็นสมาชิกของวัดนี้ หรือรายการนี้ไม่มีแล้ว กรุณาโหลดหน้านี้ใหม่แล้วเลือกใหม่";
  if (code === "23505") return "มีรายการนี้อยู่แล้ว";
  return "ตอนนี้บันทึกไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองกดอีกครั้ง";
}

/** Message shown after a successful operation. */
export function okMessage(op: Op, sub?: string): string {
  switch (op) {
    case "target": return "เพิ่มเป้าหมายกำลังคนแล้ว";
    case "participant": return "เพิ่มผู้ร่วมงานแล้ว";
    case "decide": return sub === "accept" ? "อนุมัติแล้ว" : "บันทึกว่าไม่อนุมัติแล้ว";
    case "signup": return "สมัครแล้ว กำลังรอเจ้าหน้าที่อนุมัติ";
    case "withdraw": return "ถอนตัวแล้ว";
    case "task": return "เพิ่มงานย่อยแล้ว";
    case "progress": return ({ start: "เริ่มงานแล้ว", submit: "ส่งงานแล้ว รอผู้จัดการงานตรวจรับ", verify: "ตรวจรับแล้ว", reject: "ส่งกลับให้แก้แล้ว" } as Record<string, string>)[sub ?? ""] ?? "บันทึกแล้ว";
    default: return TRANSITION_DONE_TH[op as Transition] ?? "บันทึกแล้ว";
  }
}
