// Pure helpers for the staff parking screens (report status, manage lots). No DB or React here (parking-staff.test.ts).
// The database repeats every check (app.save_parking_lot / app.report_parking_status); these only give a friendly Thai message first.
import { formatTime } from "./parking";

export const REPORT_STATUSES = ["AVAILABLE", "FILLING", "FULL", "CLOSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_TH: Record<ReportStatus, { label: string; hint: string; tone: "ok" | "warn" | "bad" | "closed" }> = {
  AVAILABLE: { label: "มีที่ว่าง", hint: "ยังจอดได้สบาย", tone: "ok" },
  FILLING: { label: "ใกล้เต็ม", hint: "เหลือไม่มาก", tone: "warn" },
  FULL: { label: "เต็ม", hint: "ไม่มีช่องว่างแล้ว", tone: "bad" },
  CLOSED: { label: "ปิด", hint: "ลานนี้ไม่เปิดให้จอด", tone: "closed" },
};

export const VEHICLES = ["car", "motorcycle", "van", "bus"] as const;
export const VEHICLE_TH: Record<string, string> = { car: "รถยนต์", motorcycle: "มอเตอร์ไซค์", van: "รถตู้", bus: "รถบัส" };

export const DECLARED_TH: Record<string, string> = {
  lots: "วัดมีลานจอดรถ (แสดงตามรายการลานที่วัดยืนยันแล้ว)",
  none: "วัดไม่มีที่จอดรถของวัด",
  unknown: "ยังไม่ระบุ",
};

export const LOT_CODE_RE = /^[A-Z0-9][A-Z0-9-]{0,15}$/;
export const LOT_CODE_ERR = "รหัสลานใช้ตัวพิมพ์ใหญ่ A-Z ตัวเลข หรือขีด (-) ไม่เกิน 16 ตัว เช่น P1 หรือ NORTH-2";

type Fields = Record<string, string>;
type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Fields };

/** Whole number from a text box: "" -> null (not known), otherwise a non-negative integer or an error. */
function wholeNumber(raw: string): number | null | "bad" {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^\d{1,5}$/.test(t)) return "bad";
  return Number(t);
}

export interface ReportInput { status: ReportStatus; free: number | null; note: string | null }
export function parseReportInput(v: { status: string; free: string; note: string }, capacity: number | null): Parsed<ReportInput> {
  const e: Fields = {};
  const status = REPORT_STATUSES.find((s) => s === v.status);
  if (!status) e.status = "กรุณาเลือกสถานะของลานจอดก่อนส่ง";
  let free = wholeNumber(v.free);
  if (free === "bad") { e.free = "จำนวนที่ว่างต้องเป็นตัวเลขจำนวนเต็ม 0 ขึ้นไป หรือเว้นว่างถ้าไม่ได้นับ"; free = null; }
  else if (free !== null && capacity !== null && free > capacity) e.free = `ลานนี้จุได้ ${capacity} คัน จำนวนที่ว่างต้องไม่เกิน ${capacity}`;
  else if (status === "FULL" && free !== null && free !== 0) e.free = "สถานะ “เต็ม” ต้องไม่มีที่ว่าง เว้นช่องนี้ว่าง หรือเลือก “ใกล้เต็ม” แทน";
  else if (status === "CLOSED" && free !== null) e.free = "ลานที่ปิดไม่ต้องใส่จำนวนที่ว่าง กรุณาเว้นช่องนี้ว่าง";
  const note = v.note.trim();
  if (note.length > 200) e.note = `หมายเหตุยาวได้ไม่เกิน 200 ตัวอักษร (ตอนนี้ ${note.length})`;
  if (Object.keys(e).length || !status) return { ok: false, fieldErrors: e };
  return { ok: true, value: { status, free: status === "FULL" ? 0 : free, note: note || null } };
}

export interface LotInput {
  code: string; name: string; capacity: number | null; accessible: number | null; vehicles: string[];
  fee: string | null; hours: string | null; isPublic: boolean; active: boolean; stale: number;
}
export function parseLotInput(v: { code: string; name_th: string; capacity: string; accessible: string; vehicles: string[]; fee: string; hours: string;
  is_public: string; active: string; stale: string }, isNew: boolean): Parsed<LotInput> {
  const e: Fields = {};
  const code = v.code.trim().toUpperCase();
  if (isNew && !LOT_CODE_RE.test(code)) e.code = LOT_CODE_ERR;
  const name = v.name_th.trim();
  if (name.length < 2 || name.length > 120) e.name_th = "ชื่อลานต้องยาว 2-120 ตัวอักษร เช่น ลานจอดหน้าวัด";
  let capacity = wholeNumber(v.capacity);
  if (capacity === "bad" || capacity === 0 || (capacity !== null && capacity > 10000)) { e.capacity = "ความจุต้องเป็นตัวเลข 1-10000 คัน หรือเว้นว่างถ้ายังไม่ทราบ"; capacity = null; }
  let accessible = wholeNumber(v.accessible);
  if (accessible === "bad") { e.accessible = "ช่องจอดผู้พิการต้องเป็นตัวเลข 0 ขึ้นไป หรือเว้นว่าง"; accessible = null; }
  else if (accessible !== null && capacity !== null && accessible > capacity) e.accessible = `ช่องจอดผู้พิการต้องไม่เกินความจุ (${capacity} คัน)`;
  const vehicles = [...new Set(v.vehicles)].filter((x) => (VEHICLES as readonly string[]).includes(x));
  if (vehicles.length === 0 || vehicles.length !== new Set(v.vehicles).size) e.vehicles = "เลือกประเภทรถที่จอดได้อย่างน้อย 1 แบบ";
  const fee = v.fee.trim(), hours = v.hours.trim();
  if (fee.length > 200) e.fee = "ค่าจอดยาวได้ไม่เกิน 200 ตัวอักษร";
  if (hours.length > 200) e.hours = "เวลาเปิดยาวได้ไม่เกิน 200 ตัวอักษร";
  const stale = wholeNumber(v.stale);
  if (stale === null || stale === "bad" || stale < 5 || stale > 1440) e.stale = "ระยะเวลาต้องเป็นตัวเลข 5-1440 นาที";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  return { ok: true, value: { code, name, capacity: capacity as number | null, accessible: accessible as number | null, vehicles,
    fee: fee || null, hours: hours || null, isPublic: v.is_public === "on", active: v.active === "on", stale: stale as number } };
}

/** Database error -> Thai message that says what to do next. */
export function parkingError(e: { code?: string; message?: string }): { error?: string; fieldErrors?: Fields } {
  const msg = e.message ?? "";
  if (e.code === "42501") return { error: "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้ ถ้าคิดว่าควรมีสิทธิ์ กรุณาแจ้งเจ้าอาวาสหรือผู้ดูแลวัด" };
  if (e.code === "54000") return { error: /too many lots/.test(msg) ? "วัดนี้มีลานจอดครบ 50 ลานแล้ว ปิดใช้งานลานเก่าที่ไม่ใช้ก่อน" : "ส่งข้อมูลถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
  if (e.code === "23505") return { fieldErrors: { code: "รหัสนี้ถูกใช้แล้วในวัดนี้ กรุณาใช้รหัสอื่น เช่น P2" } };
  if (e.code === "P0002") return { error: "ไม่พบลานจอดนี้ หรือลานถูกปิดใช้งานแล้ว กรุณาโหลดหน้านี้ใหม่" };
  if (e.code === "23514") {
    if (/exceeds capacity/.test(msg)) return { fieldErrors: { free: "จำนวนที่ว่างมากกว่าความจุของลาน กรุณานับใหม่" } };
    if (/FULL with free_spaces/.test(msg)) return { fieldErrors: { free: "สถานะ “เต็ม” ต้องไม่มีที่ว่าง" } };
    if (/accessible/.test(msg)) return { fieldErrors: { accessible: "ช่องจอดผู้พิการต้องไม่เกินความจุ" } };
    return { error: "ข้อมูลบางอย่างไม่ผ่านการตรวจ กรุณาตรวจอีกครั้ง ข้อมูลที่กรอกยังอยู่" };
  }
  return { error: "ตอนนี้บันทึกไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่ ข้อมูลที่กรอกยังอยู่" };
}

/** "อัปเดต 5 นาทีที่แล้ว" for the staff board; older reports show the full time. */
export function reportAge(at: Date | string | null, now = new Date()): string {
  if (!at) return "ยังไม่มีใครรายงาน";
  const d = new Date(at), mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (!Number.isFinite(mins)) return "ไม่ทราบเวลา";
  if (mins < 1) return "รายงานเมื่อสักครู่";
  if (mins < 60) return `รายงานเมื่อ ${mins} นาทีที่แล้ว`;
  return `รายงานล่าสุด ${formatTime(d)} น.`;
}
