// Labels and value formatting for the verification system (pure, no I/O).
export type Status = "DISCOVERED" | "SOURCE_FOUND" | "SOURCE_VERIFIED" | "CROSS_CHECKED" | "WAITING_TEMPLE_CONFIRMATION"
  | "TEMPLE_CONFIRMED" | "PUBLISHED" | "CONFLICT" | "REJECTED" | "OUTDATED" | "SUSPENDED" | "VERIFICATION_EXPIRED";

export const STATUS_TH: Record<Status, { label: string; tone: "ok" | "warn" | "bad" | "closed" | "unknown"; icon: string }> = {
  DISCOVERED: { label: "พบเบาะแส (ยังใช้ไม่ได้)", tone: "unknown", icon: "search" },
  SOURCE_FOUND: { label: "พบแหล่งข้อมูล รอตรวจหลักฐาน", tone: "unknown", icon: "file" },
  SOURCE_VERIFIED: { label: "ตรวจหลักฐานแล้ว", tone: "unknown", icon: "file-check" },
  CROSS_CHECKED: { label: "ตรวจเทียบหลายแหล่งแล้ว", tone: "unknown", icon: "file-check" },
  WAITING_TEMPLE_CONFIRMATION: { label: "รอวัดยืนยัน", tone: "warn", icon: "clock" },
  TEMPLE_CONFIRMED: { label: "ยืนยันโดยวัด", tone: "ok", icon: "check" },
  PUBLISHED: { label: "เผยแพร่แล้ว", tone: "ok", icon: "check" },
  CONFLICT: { label: "ข้อมูลขัดกัน ต้องให้วัดเลือก", tone: "bad", icon: "alert" },
  REJECTED: { label: "ไม่ใช้", tone: "closed", icon: "x" },
  OUTDATED: { label: "ข้อมูลเก่า", tone: "closed", icon: "x" },
  SUSPENDED: { label: "ระงับ", tone: "closed", icon: "x" },
  VERIFICATION_EXPIRED: { label: "หมดอายุการตรวจสอบ ต้องตรวจซ้ำ", tone: "bad", icon: "clock" },
};

export const SOURCE_TYPES: { value: string; label: string; tier: 1 | 2 | 3 }[] = [
  { value: "onab_registry", label: "ระบบทะเบียนวัด สำนักงานพระพุทธศาสนาแห่งชาติ", tier: 1 },
  { value: "onab_provincial", label: "สำนักงานพระพุทธศาสนาจังหวัด", tier: 1 },
  { value: "royal_gazette", label: "ราชกิจจานุเบกษา", tier: 1 },
  { value: "temple_admin_entry", label: "ผู้ดูแลวัดกรอกเอง", tier: 2 },
  { value: "temple_office", label: "สำนักงานวัด", tier: 2 },
  { value: "temple_document", label: "เอกสาร/ป้ายประกาศของวัด", tier: 2 },
  { value: "temple_website", label: "เว็บไซต์ทางการของวัด", tier: 2 },
  { value: "temple_facebook", label: "เพจ Facebook ทางการของวัด", tier: 2 },
  { value: "temple_line", label: "LINE ทางการของวัด", tier: 2 },
  { value: "google_maps", label: "Google Maps (ใช้ตรวจเทียบเท่านั้น)", tier: 3 },
  { value: "news", label: "ข่าว (ใช้ตรวจเทียบเท่านั้น)", tier: 3 },
  { value: "travel_site", label: "เว็บท่องเที่ยว (ใช้ตรวจเทียบเท่านั้น)", tier: 3 },
  { value: "other", label: "อื่นๆ (ใช้ตรวจเทียบเท่านั้น)", tier: 3 },
];
export const TIER_TH: Record<number, string> = { 1: "แหล่งทางราชการ", 2: "แหล่งของวัด", 3: "แหล่งประกอบ (ใช้เดี่ยวๆ ไม่ได้)" };
export const RELATIONSHIP_TH: Record<string, string> = {
  abbot: "เจ้าอาวาส", assistant_abbot: "รองเจ้าอาวาส / ผู้ช่วยเจ้าอาวาส", monk_secretary: "พระเลขานุการ",
  waiyawatchakon: "ไวยาวัจกร", temple_committee: "กรรมการวัด", temple_staff: "เจ้าหน้าที่สำนักงานวัด",
};

/** Turns what a person typed into the stored JSON value. Returns null when the input is not acceptable. */
export function parseFieldInput(fieldKey: string, raw: string): unknown | null {
  const s = raw.trim();
  if (!s) return null;
  if (fieldKey === "temple.geo") {
    const m = s.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (!m) return null;
    const lat = Number(m[1]), lng = Number(m[2]);
    return lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106 ? { lat, lng } : null; // Thailand bounding box
  }
  return s.length <= 2000 ? s : null;
}

export function formatValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "lat" in v && "lng" in v) return `${(v as { lat: number }).lat}, ${(v as { lng: number }).lng}`;
  return JSON.stringify(v);
}

export const formatDateTh = (d: string | Date) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(d));

/** Page-level success messages after a data action (the button that was pressed may no longer exist). */
export const DONE_TH: Record<string, string> = {
  confirm: "ยืนยันข้อมูลเรียบร้อยแล้ว", send: "ส่งให้วัดยืนยันแล้ว", verify_source: "บันทึกว่าตรวจหลักฐานแล้ว",
  cross_check: "บันทึกว่าตรวจเทียบหลายแหล่งแล้ว", reject: "บันทึกว่าข้อมูลนี้ไม่ถูกต้องแล้ว", outdated: "บันทึกว่าข้อมูลนี้เก่าแล้ว",
  reconfirm: "ยืนยันซ้ำเรียบร้อยแล้ว นับอายุการตรวจสอบใหม่", resolve: "เลือกข้อมูลนี้แล้ว ข้อมูลอื่นถูกยกเลิก กรุณากดยืนยันอีกครั้ง",
  recorded: "บันทึกข้อมูลพร้อมแหล่งที่มาแล้ว ข้อมูลนี้ยังไม่แสดงต่อสาธารณะจนกว่าวัดจะยืนยัน",
  recorded_tier3: "บันทึกไว้เป็นเบาะแสแล้ว ข้อมูลจากแหล่งนี้ใช้เดี่ยวๆ ไม่ได้ ต้องมีแหล่งของวัดหรือราชการยืนยัน",
  first_approval: "อนุมัติขั้นที่ 1 แล้ว รอเจ้าอาวาสยืนยันขั้นที่ 2",
  reconfirm_first: "ยืนยันซ้ำขั้นที่ 1 แล้ว รอเจ้าอาวาสยืนยันขั้นที่ 2 ระหว่างนี้ข้อมูลยังไม่แสดงต่อสาธารณะ",
};
