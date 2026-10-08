// Pure helpers for community boon points ("แต้มบุญชุมชน"), rewards and staff tools. No server-only imports: unit-tested (points.test.ts).
// Community points are for lay members only and are never combined with the monastic practice score (SCORING_SPEC F-5).
export const NET_ERR = "ตอนนี้บันทึกไม่ได้ กรุณาลองใหม่อีกครั้ง ข้อมูลที่กรอกไว้ยังอยู่";
export const NOT_POINTS_COPY = "แต้มจากการร่วมกิจกรรม ไม่ใช่การซื้อหรือแลกบุญ";

type PgErr = { code?: string; message?: string };
const has = (e: PgErr, s: string) => (e.message ?? "").includes(s);

// ---------- ledger labels ----------
export const TXN_LABEL: Record<string, string> = {
  EARN: "สะสมจากกิจกรรม", MANUAL_AWARD: "มอบโดยเจ้าหน้าที่", REDEEM: "แลกของที่ระลึก", REFUND: "คืนแต้ม", REVERSAL: "ปรับรายการคืน",
};
export const txnLabel = (t: string | null | undefined): string => (t && TXN_LABEL[t]) || "รายการแต้ม";
/** "+20" / "−15" (a real minus sign so it reads clearly); the sign is always shown. */
export const signed = (n: number): string => (n > 0 ? `+${n.toLocaleString("th-TH")}` : n < 0 ? `−${Math.abs(n).toLocaleString("th-TH")}` : "0");
export const txnTone = (n: number): "b-ok" | "b-closed" => (n >= 0 ? "b-ok" : "b-closed");

export const REDEMPTION_LABEL: Record<string, string> = { REQUESTED: "รอรับของ", FULFILLED: "รับของแล้ว", CANCELLED: "ยกเลิกแล้ว" };
export const redemptionLabel = (s: string) => REDEMPTION_LABEL[s] ?? "ไม่ทราบสถานะ";
export const redemptionTone = (s: string): string => (s === "FULFILLED" ? "b-ok" : s === "REQUESTED" ? "b-warn" : "b-closed");

// ---------- held points ----------
export const SIGNAL_TH: Record<string, string> = {
  VERIFIER_CONCENTRATION: "ผู้ตรวจคนเดียวตรวจงานของคนนี้เกือบทั้งหมด จึงพักแต้มไว้ให้คนอื่นตรวจ",
};
export const signalExplain = (s: string): string => SIGNAL_TH[s] ?? "ระบบพักแต้มนี้ไว้ให้เจ้าหน้าที่ตรวจก่อน";

// ---------- validation ----------
export const AWARD_MIN = 1, AWARD_MAX = 50;
const UUID = /^[0-9a-f-]{36}$/;
/** Whole number in [min, max] from form text, or null. */
export function parseWhole(raw: string, min: number, max: number): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!/^\d{1,9}$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}
export type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string> };

export function parseAward(v: { person_id: string; amount: string; reason: string }): Parsed<{ person: string; amount: number; reason: string }> {
  const fe: Record<string, string> = {};
  if (!UUID.test(v.person_id)) fe.person_id = "กรุณาเลือกคนที่จะมอบแต้มให้";
  const amount = parseWhole(v.amount, AWARD_MIN, AWARD_MAX);
  if (amount === null) fe.amount = `กรุณาใส่จำนวนแต้มเป็นตัวเลข ${AWARD_MIN}–${AWARD_MAX} แต้มต่อครั้ง`;
  const reason = v.reason.trim();
  if (!reason) fe.reason = "กรุณาบอกเหตุผลที่มอบแต้ม เพื่อให้ผู้รับเห็นว่าแต้มมาจากไหน ตัวอย่าง: ช่วยจัดสถานที่งานบุญ";
  else if (reason.length > 200) fe.reason = "เหตุผลยาวเกินไป กรุณาสรุปให้ไม่เกิน 200 ตัวอักษร";
  return Object.keys(fe).length ? { ok: false, fieldErrors: fe } : { ok: true, value: { person: v.person_id, amount: amount!, reason } };
}

export interface RewardInput { name: string; description: string | null; cost: number; stock: number; limit: number | null; active: boolean }
export function parseReward(v: { name: string; description: string; cost: string; stock: string; limit: string; active: boolean }): Parsed<RewardInput> {
  const fe: Record<string, string> = {};
  const name = v.name.trim();
  if (name.length < 2 || name.length > 120) fe.name = "กรุณาใส่ชื่อของที่ระลึก 2–120 ตัวอักษร ตัวอย่าง: ผ้ารัดข้อมือพร้อมพรวัด";
  const description = v.description.trim();
  if (description.length > 500) fe.description = "คำอธิบายยาวเกินไป กรุณาสรุปให้ไม่เกิน 500 ตัวอักษร";
  const cost = parseWhole(v.cost, 1, 100000);
  if (cost === null) fe.cost = "กรุณาใส่จำนวนแต้มที่ใช้เป็นตัวเลข 1–100,000";
  const stock = parseWhole(v.stock, 0, 1_000_000);
  if (stock === null) fe.stock = "กรุณาใส่จำนวนที่มีเป็นตัวเลข 0 ขึ้นไป";
  let limit: number | null = null;
  if (v.limit.trim()) { limit = parseWhole(v.limit, 1, 1000); if (limit === null) fe.limit = "จำกัดต่อคน ใส่เป็นตัวเลข 1 ขึ้นไป หรือเว้นว่างถ้าไม่จำกัด"; }
  return Object.keys(fe).length ? { ok: false, fieldErrors: fe }
    : { ok: true, value: { name, description: description || null, cost: cost!, stock: stock!, limit, active: v.active } };
}

// ---------- DB error -> Thai message that says what to do next ----------
export function awardError(e: PgErr): string {
  if (has(e, "SELF_AWARD_FORBIDDEN")) return "มอบแต้มให้ตัวเองไม่ได้ กรุณาเลือกคนอื่นจากรายชื่อ";
  if (has(e, "AMOUNT_EXCEEDS_LIMIT")) return `มอบได้ครั้งละ ${AWARD_MIN}–${AWARD_MAX} แต้ม กรุณาใส่จำนวนใหม่ ถ้าต้องการมอบมากกว่านี้ให้แบ่งเป็นหลายครั้งพร้อมเหตุผลของแต่ละครั้ง`;
  if (has(e, "reason required")) return "กรุณาบอกเหตุผลที่มอบแต้ม";
  if (has(e, "monastic membership")) return "ผู้รับเป็นพระหรือสามเณร ซึ่งรับแต้มบุญชุมชนไม่ได้ กรุณาเลือกสมาชิกฆราวาส";
  if (e.code === "42501") return "คุณไม่มีสิทธิ์มอบแต้ม กรุณาติดต่อเจ้าอาวาสหรือเลขาฯ ของวัด";
  if (e.code === "23503") return "ไม่พบผู้รับในรายชื่อสมาชิกของวัดนี้ กรุณาเลือกใหม่จากรายชื่อ";
  return NET_ERR;
}
export function reviewError(e: PgErr): string {
  if (has(e, "cannot review own")) return "ตรวจแต้มของตัวเองไม่ได้ กรุณาให้เจ้าหน้าที่คนอื่นตรวจ";
  if (e.code === "P0002") return "รายการนี้ถูกตรวจไปแล้ว กรุณารอสักครู่ รายการจะอัปเดต";
  if (e.code === "42501") return "คุณไม่มีสิทธิ์ตรวจแต้มที่พักไว้ กรุณาติดต่อเจ้าอาวาสหรือเลขาฯ ของวัด";
  return NET_ERR;
}
export function redeemError(e: PgErr): string {
  if (has(e, "INSUFFICIENT_POINTS")) return "แต้มของคุณยังไม่พอสำหรับของชิ้นนี้ ร่วมกิจกรรมของวัดเพื่อสะสมแต้มเพิ่ม แล้วกลับมาขอรับใหม่ได้";
  if (has(e, "OUT_OF_STOCK")) return "ของชิ้นนี้หมดแล้ว กรุณารอทางวัดเพิ่มของ หรือเลือกของชิ้นอื่น";
  if (has(e, "LIMIT_REACHED")) return "คุณขอรับของชิ้นนี้ครบตามจำนวนที่กำหนดต่อคนแล้ว กรุณาเลือกของชิ้นอื่น";
  if (has(e, "FORBIDDEN_MONASTIC") || e.code === "42501") return "บัญชีนี้ขอรับของที่ระลึกไม่ได้ เพราะพระสงฆ์ไม่ร่วมระบบแต้มบุญชุมชน หรือยังไม่ได้เป็นสมาชิกวัดนี้";
  if (e.code === "P0002") return "ของชิ้นนี้ไม่เปิดให้ขอรับแล้ว กรุณาโหลดหน้านี้ใหม่เพื่อดูรายการล่าสุด";
  return NET_ERR;
}
export function decideError(e: PgErr): string {
  if (e.code === "P0002") return "รายการนี้ถูกจัดการไปแล้ว กรุณารอสักครู่ รายการจะอัปเดต";
  if (e.code === "42501") return "คุณไม่มีสิทธิ์จัดการรายการนี้ กรุณาติดต่อเจ้าหน้าที่ดูแลของที่ระลึก";
  return NET_ERR;
}
export function saveRewardError(e: PgErr): string {
  if (e.code === "42501") return "คุณไม่มีสิทธิ์จัดการของที่ระลึก กรุณาติดต่อเจ้าหน้าที่สำนักงานวัด";
  if (e.code === "23514") return "ข้อมูลไม่ถูกต้องตามที่ระบบกำหนด กรุณาตรวจชื่อ จำนวนแต้ม และจำนวนที่มี แล้วลองใหม่";
  return NET_ERR;
}
export const REDEEM_OK = "ขอรับของที่ระลึกแล้ว ระบบหักแต้มให้แล้ว เจ้าหน้าที่จะมอบของให้เมื่อพร้อม";
