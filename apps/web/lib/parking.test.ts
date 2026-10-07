import { describe, expect, it } from "vitest";
import { presentParking, type ParkingRow } from "./parking";

const base: ParkingRow = {
  temple_name_th: "วัดตัวอย่าง เอ", parking_declared: "lots", lot_code: "P1", lot_name_th: "ลานจอดหน้าวัด",
  capacity: 40, accessible_spaces: 2, vehicle_types: ["car", "motorcycle"], fee_note_th: "ฟรี",
  hours_note_th: "06:00–18:00", status: "UNKNOWN", free_spaces: null, reported_at: null,
};

describe("presentParking", () => {
  it("no rows => temple not found / not listed", () => expect(presentParking([]).kind).toBe("not_found"));
  it("declared none => says the temple has no parking", () =>
    expect(presentParking([{ ...base, parking_declared: "none", lot_code: null }]).kind).toBe("none"));
  it("unknown and no lots => no information (not 'no parking')", () =>
    expect(presentParking([{ ...base, parking_declared: "unknown", lot_code: null }]).kind).toBe("no_info"));
  it("UNKNOWN never shows a number", () => {
    const v = presentParking([{ ...base, free_spaces: 7 }]);
    if (v.kind !== "lots") throw new Error();
    expect(v.lots[0].label).toBe("ไม่ทราบสถานะตอนนี้");
    expect(v.lots[0].freeText).toBeNull();
    expect(v.lots[0].updatedText).toBe("ยังไม่มีการรายงานสถานะ");
  });
  it("fresh FILLING report shows label, count and time", () => {
    const v = presentParking([{ ...base, status: "FILLING", free_spaces: 5, reported_at: "2026-10-07T03:05:00Z" }]);
    if (v.kind !== "lots") throw new Error();
    expect(v.lots[0].tone).toBe("warn");
    expect(v.lots[0].freeText).toBe("ว่างประมาณ 5 คัน");
    expect(v.lots[0].updatedText).toContain("10:05");
  });
  it("unknown capacity is labelled, not invented", () => {
    const v = presentParking([{ ...base, capacity: null }]);
    if (v.kind !== "lots") throw new Error();
    expect(v.lots[0].details).toContain("จำนวนช่องจอด: ไม่ทราบ");
  });
});
