// Pure helpers for the temple map (2D registry). No DB or React here, so they are unit-tested (map.test.ts).
export const MAP_W = 1600, MAP_H = 1000, MIN_POINTS = 3, MAX_POINTS = 64;
export type Pt = [number, number];

export const KIND_TH: Record<string, string> = {
  PRANG: "พระปรางค์", UBOSOT: "อุโบสถ", VIHARA: "วิหาร", MANDAPA: "มณฑป", SALA: "ศาลา", KUTI: "กุฏิ", BELL_TOWER: "หอระฆัง",
  GATE: "ประตู", PIER: "ท่าน้ำ", OFFICE: "สำนักงาน", KITCHEN: "โรงครัว", TOILET: "ห้องน้ำ", PARKING: "ที่จอดรถ",
  GARDEN_AREA: "สวน / พื้นที่สีเขียว", STORAGE: "ห้องเก็บของ", OTHER: "อื่น ๆ",
};
export const BUILDING_KINDS = Object.keys(KIND_TH);
export const kindLabel = (k: string) => KIND_TH[k] ?? "ไม่ทราบประเภท";

export const STATUS_TH: Record<string, string> = { ACTIVE: "เปิดใช้งาน", CLOSED_TEMPORARILY: "ปิดชั่วคราว", UNDER_RENOVATION: "กำลังปรับปรุง", RETIRED: "เลิกใช้" };
// RETIRED is not offered in the editor: the DB never deletes, and retiring is a separate decision.
export const EDITABLE_STATUSES = ["ACTIVE", "CLOSED_TEMPORARILY", "UNDER_RENOVATION"];
export const statusLabel = (s: string) => STATUS_TH[s] ?? "ไม่ทราบสถานะ";

export const VIS_TH: Record<string, string> = { PUBLIC: "ทุกคน", STAFF_ONLY: "เฉพาะเจ้าหน้าที่", MONASTIC_ONLY: "เฉพาะพระ" };
export const VISIBILITIES = ["PUBLIC", "STAFF_ONLY", "MONASTIC_ONLY"];
export const visLabel = (v: string) => VIS_TH[v] ?? "ไม่ทราบ";

export const ZONE_KIND_TH: Record<string, string> = { INTERIOR: "ภายในอาคาร", EXTERIOR: "ภายนอกอาคาร", COURTYARD: "ลาน", GARDEN: "สวน", RIVERFRONT: "ริมน้ำ", PARKING: "ที่จอดรถ", PATH: "ทางเดิน" };
export const ZONE_KINDS = Object.keys(ZONE_KIND_TH);
export const zoneKindLabel = (k: string) => ZONE_KIND_TH[k] ?? "ไม่ทราบประเภท";

/** Same pattern as the DB check on buildings.code / zones.code (at least two dot-separated parts). */
export const CODE_RE = /^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$/;
export const normalizeCode = (raw: string) => raw.trim().toUpperCase();
export const codeOk = (code: string) => code.length <= 64 && CODE_RE.test(code);
export const CODE_ERR = "รหัสต้องเป็นตัวพิมพ์ใหญ่ A-Z หรือตัวเลข คั่นด้วยจุด อย่างน้อย 2 ส่วน เช่น MAIN.SALA.01 (ห้ามเว้นวรรคหรือใช้ภาษาไทย)";

export type PolyResult = { ok: true; value: Pt[] | null } | { ok: false; error: string };
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Validate a polygon from a point list. Empty/null = "no position on the map yet" (allowed). Points are rounded to whole units. */
export function validatePolygon(input: unknown): PolyResult {
  if (input === null || input === undefined) return { ok: true, value: null };
  if (!Array.isArray(input)) return { ok: false, error: "รูปร่างอาคารไม่ถูกต้อง กรุณาล้างแล้ววาดใหม่" };
  if (input.length === 0) return { ok: true, value: null };
  if (input.length < MIN_POINTS) return { ok: false, error: `รูปร่างต้องมีอย่างน้อย ${MIN_POINTS} จุด (ตอนนี้มี ${input.length} จุด) แตะบนแผนที่เพิ่ม หรือกด “ล้างทั้งหมด” ถ้ายังไม่วาด` };
  if (input.length > MAX_POINTS) return { ok: false, error: `รูปร่างมีได้ไม่เกิน ${MAX_POINTS} จุด กรุณาลดจุดลง` };
  const out: Pt[] = [];
  for (const p of input) {
    if (!Array.isArray(p) || p.length !== 2 || !num(p[0]) || !num(p[1])) return { ok: false, error: "มีจุดที่ไม่ถูกต้อง กรุณาล้างแล้ววาดใหม่" };
    const x = Math.round(p[0]), y = Math.round(p[1]);
    if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return { ok: false, error: `จุดต้องอยู่ในกรอบแผนที่ (x 0-${MAP_W}, y 0-${MAP_H}) กรุณาลบจุดที่อยู่นอกกรอบ` };
    out.push([x, y]);
  }
  return { ok: true, value: out };
}

/** Parse the hidden form field (JSON text). */
export function parsePolygonText(text: string): PolyResult {
  const t = text.trim();
  if (!t) return { ok: true, value: null };
  try { return validatePolygon(JSON.parse(t)); } catch { return { ok: false, error: "รูปร่างอาคารไม่ถูกต้อง กรุณาล้างแล้ววาดใหม่" }; }
}
export const serializePolygon = (p: Pt[] | null) => (p && p.length ? JSON.stringify(p) : "");

/** Coerce a DB jsonb value to points; anything unusable becomes null (never invent coordinates). */
export function readPolygon(raw: unknown): Pt[] | null {
  const r = validatePolygon(raw);
  return r.ok ? r.value : null;
}
export const svgPoints = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(" ");
/** Mean of the vertices: good enough to place a label (not a true centroid). */
export function labelPoint(p: Pt[]): Pt {
  const n = p.length || 1;
  return [Math.round(p.reduce((a, q) => a + q[0], 0) / n), Math.round(p.reduce((a, q) => a + q[1], 0) / n)];
}
/** Screen position inside the canvas box -> map units (clamped to the canvas). */
export function toMapPoint(cx: number, cy: number, box: { left: number; top: number; width: number; height: number }): Pt {
  const x = ((cx - box.left) / (box.width || 1)) * MAP_W, y = ((cy - box.top) / (box.height || 1)) * MAP_H;
  return [Math.min(MAP_W, Math.max(0, Math.round(x))), Math.min(MAP_H, Math.max(0, Math.round(y)))];
}

/** A count from the DB; null/undefined/non-numeric means unknown, never 0. */
export const countLabel = (n: unknown, unit: string) => {
  if (n === null || n === undefined || n === "") return "ไม่ทราบ";
  const v = Number(n);
  return Number.isFinite(v) ? `${v} ${unit}` : "ไม่ทราบ";
};

export interface BuildingInput { code: string; name_th: string; kind: string; status: string; visibility: string; polygon: string; source_note: string }
export type BuildingParse =
  | { ok: true; value: { code: string; name: string; kind: string; status: string; visibility: string; polygon: Pt[] | null; note: string | null } }
  | { ok: false; fieldErrors: Record<string, string> };

/** Pre-check with Thai messages so the person sees what to fix and keeps the input. The DB re-checks everything. */
export function parseBuildingInput(v: BuildingInput, isNew: boolean): BuildingParse {
  const e: Record<string, string> = {};
  const code = normalizeCode(v.code);
  if (isNew && !codeOk(code)) e.code = CODE_ERR;
  const name = v.name_th.trim();
  if (name.length < 2 || name.length > 120) e.name_th = "ชื่ออาคารต้องยาว 2-120 ตัวอักษร ตัวอย่าง: ศาลาการเปรียญ";
  if (!BUILDING_KINDS.includes(v.kind)) e.kind = "กรุณาเลือกประเภทอาคาร";
  if (!EDITABLE_STATUSES.includes(v.status)) e.status = "กรุณาเลือกสถานะ";
  if (!VISIBILITIES.includes(v.visibility)) e.visibility = "กรุณาเลือกว่าใครเห็นอาคารนี้ได้";
  if (v.source_note.length > 300) e.source_note = "หมายเหตุยาวเกิน 300 ตัวอักษร";
  const poly = parsePolygonText(v.polygon);
  if (!poly.ok) e.polygon = poly.error;
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { code, name, kind: v.kind, status: v.status, visibility: v.visibility, polygon: poly.ok ? poly.value : null, note: v.source_note.trim() || null } };
}

export interface ZoneInput { building: string; code: string; name_th: string; kind: string }
export type ZoneParse =
  | { ok: true; value: { building: string | null; code: string; name: string; kind: string } }
  | { ok: false; fieldErrors: Record<string, string> };
export function parseZoneInput(v: ZoneInput): ZoneParse {
  const e: Record<string, string> = {};
  const code = normalizeCode(v.code);
  if (!codeOk(code)) e.code = CODE_ERR;
  const name = v.name_th.trim();
  if (name.length < 2 || name.length > 120) e.name_th = "ชื่อโซนต้องยาว 2-120 ตัวอักษร ตัวอย่าง: ลานหน้าอาคาร";
  if (!ZONE_KINDS.includes(v.kind)) e.kind = "กรุณาเลือกประเภทโซน";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { building: v.building || null, code, name, kind: v.kind } };
}

export const NET_ERR = "บันทึกไม่สำเร็จ เพราะเชื่อมต่อไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณากดบันทึกอีกครั้ง";
/** Map a Postgres error from save_building / save_zone / confirm_building to a Thai message that says what to do next. */
export function mapError(e: { code?: string; message?: string; constraint?: string }): { error?: string; fieldErrors?: Record<string, string> } {
  const msg = e.message ?? "", con = e.constraint ?? "";
  if (e.code === "42501") return { error: "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้ ถ้าคิดว่าควรมีสิทธิ์ กรุณาแจ้งเจ้าอาวาสหรือผู้ดูแลวัด" };
  if (e.code === "23505") return { fieldErrors: { code: "รหัสนี้ถูกใช้แล้วในวัดนี้ กรุณาใช้รหัสอื่น เช่น เปลี่ยนเลขท้ายเป็น 02" } };
  if (e.code === "23514" && (/polygon/i.test(msg) || /polygon/i.test(con))) {
    return { fieldErrors: { polygon: /inside 1600x1000/.test(msg) ? `จุดต้องอยู่ในกรอบแผนที่ (x 0-${MAP_W}, y 0-${MAP_H}) กรุณาล้างแล้ววาดใหม่ในกรอบ` : `รูปร่างต้องมี ${MIN_POINTS}-${MAX_POINTS} จุด` } };
  }
  if (e.code === "23514" && (/immutable/.test(msg) || /code/i.test(con))) return { fieldErrors: { code: /immutable/.test(msg) ? "รหัสแก้ไขไม่ได้หลังสร้างแล้ว" : CODE_ERR } };
  if (e.code === "23514" && /name_th/.test(con)) return { fieldErrors: { name_th: "ชื่อต้องยาว 2-120 ตัวอักษร" } };
  if (e.code === "23514") return { error: "ข้อมูลบางอย่างไม่ผ่านการตรวจ กรุณาตรวจรหัส ชื่อ และรูปร่างอีกครั้ง ข้อมูลที่กรอกยังอยู่" };
  if (e.code === "P0002") return { error: "ไม่พบอาคารนี้ อาจถูกเปลี่ยนไปแล้ว กรุณาโหลดหน้านี้ใหม่" };
  if (e.code === "23503") return { error: "ไม่พบอาคารที่เลือก กรุณาโหลดหน้านี้ใหม่แล้วเลือกใหม่" };
  return { error: NET_ERR };
}

export const CONFIRM_TEXT = "เมื่อยืนยันแล้ว อาคารที่ตั้งเป็น 'ทุกคน' จะแสดงบนแผนที่สาธารณะ; ถ้าแก้ไขภายหลังต้องยืนยันใหม่";

/** Node name of the 3D asset -> code shown to the viewer (strips the _LOD suffix). */
export const nodeCode = (name: string) => name.replace(/_LOD\d+$/, "");
/** Kind segment of a node code such as XXX.PRANG.MAIN -> Thai kind label, or null if it is not a building kind. */
export function nodeKindLabel(code: string): string | null {
  const seg = code.split(".")[1];
  return seg && KIND_TH[seg] ? KIND_TH[seg] : null;
}
