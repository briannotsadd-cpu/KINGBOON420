// Official registry importer — validation only (pure, no I/O). Used by scripts/import-registry.mjs and unit tests.
// Input is a record captured by a person from an official page (ONAB registry / provincial office / Royal Gazette).
// Nothing here fetches or guesses data: every value must come with its URL, retrieval time and a hash of the saved page.

export const OFFICIAL_SOURCES = {
  onab_registry: ["onab.go.th"],
  onab_provincial: ["onab.go.th"],
  royal_gazette: ["ratchakitcha.soc.go.th"],
};
// Fields the official registry is expected to hold (data_field_catalog.official_source_expected = true).
export const OFFICIAL_FIELDS = ["temple.name_th", "temple.registry_number", "temple.type", "temple.sect", "temple.province",
  "temple.district", "temple.subdistrict", "temple.address", "temple.founded", "temple.wisungkhamasima", "temple.history"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** @returns {{ ok: true, rows: Array<{field_key: string, value: unknown}>, source: object } | { ok: false, errors: string[] }} */
export function validateRegistryRecord(rec, now = new Date()) {
  const errors = [];
  if (!rec || typeof rec !== "object") return { ok: false, errors: ["ไฟล์ต้องเป็น JSON object"] };
  if (!UUID.test(rec.temple_id ?? "")) errors.push("temple_id ต้องเป็น UUID ของวัดที่สมัครในระบบแล้ว");
  const hosts = OFFICIAL_SOURCES[rec.source_type];
  if (!hosts) errors.push("source_type ต้องเป็นแหล่งทางการระดับ 1: " + Object.keys(OFFICIAL_SOURCES).join(", "));
  let url = null;
  try { url = new URL(rec.source_url); } catch { errors.push("source_url ต้องเป็นลิงก์หน้าทางการที่เปิดดูได้"); }
  if (url && url.protocol !== "https:") errors.push("source_url ต้องเป็น https");
  if (url && hosts && !hosts.some((h) => url.hostname === h || url.hostname.endsWith("." + h)))
    errors.push(`source_url ต้องอยู่บนโดเมนทางการ (${hosts.join(", ")}) ของ ${rec.source_type}`);
  if (typeof rec.source_name !== "string" || rec.source_name.trim().length < 2) errors.push("source_name ต้องระบุชื่อแหล่ง");
  const at = new Date(rec.retrieved_at);
  if (!rec.retrieved_at || Number.isNaN(at.getTime())) errors.push("retrieved_at ต้องเป็นวันเวลาที่ดึงข้อมูล (ISO 8601)");
  else if (at.getTime() > now.getTime() + 5 * 60_000) errors.push("retrieved_at อยู่ในอนาคต");
  if (!/^[0-9a-f]{64}$/.test(rec.snapshot_sha256 ?? "")) errors.push("snapshot_sha256 ต้องเป็น sha256 ของไฟล์หน้าเว็บที่บันทึกไว้");
  if (typeof rec.evidence !== "string" || rec.evidence.trim().length < 10) errors.push("evidence ต้องคัดข้อความจากหน้าทางการอย่างน้อย 10 ตัวอักษร");
  const rows = [];
  const fields = rec.fields && typeof rec.fields === "object" ? rec.fields : {};
  for (const [k, v] of Object.entries(fields)) {
    if (!OFFICIAL_FIELDS.includes(k)) { errors.push(`ช่อง ${k} ไม่ใช่ข้อมูลที่มาจากทะเบียนทางการ — ต้องให้วัดกรอกเอง`); continue; }
    if (typeof v !== "string" || !v.trim()) { errors.push(`ช่อง ${k} ว่าง — ถ้าไม่พบในหน้าทางการให้ลบช่องนี้ออก อย่าเดา`); continue; }
    rows.push({ field_key: k, value: v.trim() });
  }
  if (!rows.length && !errors.length) errors.push("ไม่มีช่องข้อมูลให้นำเข้า");
  if (errors.length) return { ok: false, errors };
  return { ok: true, rows, source: {
    source_type: rec.source_type, source_name: rec.source_name.trim(), source_url: url.toString(),
    source_date: at.toISOString().slice(0, 10),
    evidence: `${rec.evidence.trim()} | sha256:${rec.snapshot_sha256} | retrieved_at:${at.toISOString()}`,
  } };
}
