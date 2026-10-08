import { describe, expect, it } from "vitest";
import {
  awardError, decideError, parseAward, parseReward, parseWhole, redeemError, redemptionLabel, reviewError, signalExplain, signed, txnLabel,
  NET_ERR,
} from "./points";

const PID = "11111111-1111-1111-1111-111111111111";

describe("ledger labels", () => {
  it("maps every ledger type to a Thai label", () => {
    expect(txnLabel("EARN")).toBe("สะสมจากกิจกรรม");
    expect(txnLabel("MANUAL_AWARD")).toBe("มอบโดยเจ้าหน้าที่");
    expect(txnLabel("REDEEM")).toBe("แลกของที่ระลึก");
    expect(txnLabel("REFUND")).toBe("คืนแต้ม");
    expect(txnLabel("SOMETHING_NEW")).toBe("รายการแต้ม");
    expect(txnLabel(null)).toBe("รายการแต้ม");
  });
  it("always shows a sign", () => {
    expect(signed(20)).toBe("+20");
    expect(signed(-15)).toBe("−15");
    expect(signed(0)).toBe("0");
  });
  it("redemption statuses", () => {
    expect(redemptionLabel("REQUESTED")).toBe("รอรับของ");
    expect(redemptionLabel("X")).toBe("ไม่ทราบสถานะ");
  });
  it("explains the hold signal, with a safe fallback", () => {
    expect(signalExplain("VERIFIER_CONCENTRATION")).toBe("ผู้ตรวจคนเดียวตรวจงานของคนนี้เกือบทั้งหมด จึงพักแต้มไว้ให้คนอื่นตรวจ");
    expect(signalExplain("OTHER")).toContain("พักแต้มนี้ไว้");
  });
});

describe("amount validation", () => {
  it("accepts whole numbers in range only", () => {
    expect(parseWhole("20", 1, 50)).toBe(20);
    expect(parseWhole(" 50 ", 1, 50)).toBe(50);
    expect(parseWhole("51", 1, 50)).toBeNull();
    expect(parseWhole("0", 1, 50)).toBeNull();
    expect(parseWhole("-3", 1, 50)).toBeNull();
    expect(parseWhole("2.5", 1, 50)).toBeNull();
    expect(parseWhole("abc", 1, 50)).toBeNull();
    expect(parseWhole("", 1, 50)).toBeNull();
  });
  it("award needs person, 1-50 amount and a reason", () => {
    expect(parseAward({ person_id: PID, amount: "20", reason: "  ช่วยจัดสถานที่ " })).toEqual({ ok: true, value: { person: PID, amount: 20, reason: "ช่วยจัดสถานที่" } });
    const bad = parseAward({ person_id: "", amount: "99", reason: " " });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.fieldErrors).sort()).toEqual(["amount", "person_id", "reason"]);
    const long = parseAward({ person_id: PID, amount: "5", reason: "ก".repeat(201) });
    expect(long.ok).toBe(false);
  });
  it("reward form: limit is optional, cost is 1+, stock 0+", () => {
    const ok = parseReward({ name: " สมุดจดบันทึก ", description: "", cost: "15", stock: "1", limit: "", active: true });
    expect(ok).toEqual({ ok: true, value: { name: "สมุดจดบันทึก", description: null, cost: 15, stock: 1, limit: null, active: true } });
    const lim = parseReward({ name: "ของ", description: "รายละเอียด", cost: "15", stock: "0", limit: "1", active: false });
    expect(lim.ok && lim.value.limit === 1 && lim.value.stock === 0 && !lim.value.active).toBe(true);
    const bad = parseReward({ name: "ก", description: "", cost: "0", stock: "-1", limit: "0", active: true });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.fieldErrors).sort()).toEqual(["cost", "limit", "name", "stock"]);
  });
});

describe("error mapping", () => {
  const e = (message: string, code?: string) => ({ message, code });
  it("award", () => {
    expect(awardError(e("SELF_AWARD_FORBIDDEN", "42501"))).toContain("ตัวเองไม่ได้");
    expect(awardError(e("AMOUNT_EXCEEDS_LIMIT", "23514"))).toContain("1–50");
    expect(awardError(e("reason required", "23514"))).toContain("เหตุผล");
    expect(awardError(e("not allowed", "42501"))).toContain("ไม่มีสิทธิ์");
    expect(awardError(e("boom"))).toBe(NET_ERR);
  });
  it("redeem", () => {
    expect(redeemError(e("INSUFFICIENT_POINTS", "23514"))).toContain("แต้มของคุณยังไม่พอ");
    expect(redeemError(e("OUT_OF_STOCK", "23514"))).toContain("หมดแล้ว");
    expect(redeemError(e("LIMIT_REACHED", "23514"))).toContain("ครบตามจำนวน");
    expect(redeemError(e("FORBIDDEN_MONASTIC_OR_NOT_MEMBER", "42501"))).toContain("ขอรับของที่ระลึกไม่ได้");
    expect(redeemError(e("reward not available", "P0002"))).toContain("โหลดหน้านี้ใหม่");
  });
  it("review and decide", () => {
    expect(reviewError(e("cannot review own points", "42501"))).toContain("ตัวเอง");
    expect(reviewError(e("not held", "P0002"))).toContain("ตรวจไปแล้ว");
    expect(decideError(e("not open", "P0002"))).toContain("จัดการไปแล้ว");
    expect(decideError(e("not allowed", "42501"))).toContain("ไม่มีสิทธิ์");
  });
});
