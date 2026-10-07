// Pure helpers for the community UI (no server-only imports so they are unit-testable).

export type Vis = "public" | "connections" | "private";
export const VIS_LABEL: Record<Vis, string> = { public: "ทุกคน", connections: "เฉพาะคนที่เชื่อมต่อ", private: "เฉพาะฉัน" };
export const VIS_VALUES: Vis[] = ["public", "connections", "private"];
export const POST_VIS_LABEL: Record<"public" | "connections", string> = { public: "ทุกคน", connections: "เฉพาะคนที่เชื่อมต่อ" };
export const CALL_PERMISSION_LABEL: Record<"connections" | "nobody", string> = { connections: "คนที่เชื่อมต่อกับฉันโทรหาได้", nobody: "ไม่ให้ใครโทรหา" };

export const isVis = (v: unknown): v is Vis => v === "public" || v === "connections" || v === "private";
export const isPostVis = (v: unknown): v is "public" | "connections" => v === "public" || v === "connections";
export const isCallPermission = (v: unknown): v is "connections" | "nobody" => v === "connections" || v === "nobody";
export const visLabel = (v: string): string => (isVis(v) ? VIS_LABEL[v] : v);

export const REPORT_REASONS = [
  { value: "inappropriate", label: "ข้อความไม่เหมาะสม" },
  { value: "harassment", label: "ก่อกวน" },
  { value: "impersonation", label: "แอบอ้าง" },
  { value: "minor_safety", label: "เกี่ยวกับผู้เยาว์" },
  { value: "other", label: "อื่น ๆ" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export const isReportReason = (v: unknown): v is ReportReason => REPORT_REASONS.some((r) => r.value === v);
export const reasonLabel = (v: string): string => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

export const REPORT_KINDS = ["person", "post", "comment"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const isReportKind = (v: unknown): v is ReportKind => (REPORT_KINDS as readonly string[]).includes(v as string);
export const KIND_LABEL: Record<string, string> = { person: "โปรไฟล์", post: "โพสต์", comment: "ความคิดเห็น", message: "ข้อความแชท" };

export const DECISIONS = [
  { value: "remove_content", label: "ลบเนื้อหา", help: "เนื้อหานี้จะถูกซ่อนจากทุกคน" },
  { value: "warn", label: "ตักเตือน", help: "บันทึกการตักเตือน ไม่ลบเนื้อหา" },
  { value: "suspend", label: "ระงับการใช้ชุมชน", help: "ผู้ใช้นี้เข้าชุมชนไม่ได้จนกว่าจะยกเลิกการระงับ" },
  { value: "dismiss", label: "ไม่ดำเนินการ", help: "ปิดรายงานโดยไม่ลงโทษ" },
] as const;
export type Decision = (typeof DECISIONS)[number]["value"];
export const isDecision = (v: unknown): v is Decision => DECISIONS.some((d) => d.value === v);
export const decisionLabel = (v: string): string => DECISIONS.find((d) => d.value === v)?.label ?? v;

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const shortId = (id: string): string => id.replace(/-/g, "").slice(-4);

/** Map a Postgres error code from the community functions to a Thai message that says what to do next. */
export function mapDbError(code: string | undefined): string {
  switch (code) {
    case "42501":
      return "ทำรายการนี้ไม่ได้ อาจเป็นเพราะบัญชีของคุณหรืออีกฝ่ายยังใช้ชุมชนไม่ได้ หรือมีการบล็อก/ระงับอยู่ กรุณากลับไปหน้าชุมชนเพื่อตรวจสอบสถานะของคุณ";
    case "54000":
      return "ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่";
    case "23514":
    case "22023":
      return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบความยาวและข้อมูลที่กรอก แล้วลองกดอีกครั้ง";
    case "P0002":
      return "ไม่พบรายการนี้ อาจถูกลบหรือเปลี่ยนแปลงไปแล้ว กรุณาโหลดหน้านี้ใหม่";
    default:
      return "ตอนนี้ทำรายการไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองกดอีกครั้ง";
  }
}

// ---- time (Thai, Buddhist era, Bangkok) ----------------------------------------------------------------------
const TH_DT = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
/** e.g. "7 ต.ค. 2569 14:30" */
export function formatThaiDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return TH_DT.format(date).replace(",", "");
}

// ---- input parsing -------------------------------------------------------------------------------------------
export const LIMITS = { nameMin: 2, nameMax: 60, bio: 500, post: 2000, comment: 1000, note: 500, listItems: 20, listItem: 40, decisionReason: 500 } as const;

/** Comma/newline separated list -> unique non-empty items. */
export function parseList(raw: string): { items: string[]; error?: string } {
  const items = [...new Set(raw.split(/[,\n，、]/).map((s) => s.trim()).filter(Boolean))];
  if (items.length > LIMITS.listItems) return { items, error: `ใส่ได้ไม่เกิน ${LIMITS.listItems} รายการ คั่นด้วยเครื่องหมายจุลภาค (,)` };
  if (items.some((s) => s.length > LIMITS.listItem)) return { items, error: `แต่ละรายการยาวได้ไม่เกิน ${LIMITS.listItem} ตัวอักษร` };
  return { items };
}

/** Accepts a Buddhist-era (พ.ศ.) or Gregorian year typed by the user; returns the Gregorian year the DB stores. */
export function parseBirthYear(raw: string, nowYear: number): { year?: number; error?: string } {
  const t = raw.trim().replace(/[๐-๙]/g, (c) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(c)));
  if (!/^\d{4}$/.test(t)) return { error: "กรุณากรอกปีเกิดเป็นตัวเลข 4 หลัก เช่น 2510 (พ.ศ.)" };
  let y = Number(t);
  if (y >= 2400) y -= 543;
  if (y < 1900 || y > nowYear) return { error: "ปีเกิดไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง เช่น 2510 (พ.ศ.)" };
  return { year: y };
}
/** DB rule (D-C2): year difference must be >= 21, i.e. at least 20 years old. */
export const isAdultByYear = (birthYear: number, nowYear: number): boolean => nowYear - birthYear >= 21;
export const toBuddhistYear = (ce: number): number => ce + 543;

export function validateBody(raw: string, max: number, what: string): string | null {
  const t = raw.trim();
  if (!t) return `กรุณาพิมพ์${what}ก่อนกดส่ง`;
  if (t.length > max) return `${what}ยาวเกินไป (ไม่เกิน ${max} ตัวอักษร ตอนนี้ ${t.length}) กรุณาตัดให้สั้นลง`;
  return null;
}

// ---- eligibility diagnosis (used only when the DB says community_can = false) ----------------------------------
export type GateReason = "suspended" | "monastic" | "minor" | "no_profile" | "no_temple";
export interface GateFacts { hasProfile: boolean; birthYear: number | null; suspended: boolean; monastic: boolean; minorFlag: boolean; nowYear: number }
export function diagnoseGate(f: GateFacts): GateReason {
  if (f.suspended) return "suspended";
  if (f.monastic) return "monastic";
  if (f.minorFlag) return "minor";
  if (!f.hasProfile || f.birthYear == null) return "no_profile";
  if (!isAdultByYear(f.birthYear, f.nowYear)) return "minor";
  return "no_temple";
}
