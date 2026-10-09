import { describe, expect, it } from "vitest";
import { presentParking, readSavedParking, type ParkingRow } from "./parking";

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
    expect(v.lots[0].details).toContainEqual({ kind: "count", text: "จำนวนช่องจอด: ไม่ทราบ" });
  });
  it("stale reports retain their date without inventing availability", () => {
    const v = presentParking([{ ...base, reported_at: "2026-10-01T03:05:00Z", free_spaces: 40 }]);
    if (v.kind !== "lots") throw new Error();
    expect(v.lots[0].reportState).toBe("stale");
    expect(v.lots[0].updatedText).toContain("1");
    expect(v.lots[0].occupiedPercent).toBeNull();
    expect(v.lots[0].freeText).toBeNull();
  });
  it("shows genuine zero counts and computes aggregate occupancy", () => {
    const v = presentParking([{ ...base, status: "FULL", free_spaces: 0, accessible_spaces: 0, reported_at: "2026-10-07T03:05:00Z" }]);
    if (v.kind !== "lots") throw new Error();
    expect(v.lots[0].freeText).toBe("ว่างประมาณ 0 คัน");
    expect(v.lots[0].occupiedPercent).toBe(100);
    expect(v.lots[0].details).toContainEqual({ kind: "access", text: "ช่องจอดผู้พิการ 0 ช่อง" });
  });
  it("zero capacity never produces a divided-by-zero occupancy", () => {
    const v = presentParking([{ ...base, capacity: 0, status: "FULL", free_spaces: 0, reported_at: "2026-10-07T03:05:00Z" }]);
    if (v.kind !== "lots") throw new Error();
    expect(v.lots[0].occupiedPercent).toBeNull();
    expect(v.lots[0].details).toContainEqual({ kind: "count", text: "ทั้งหมด 0 คัน" });
  });
  it("suppresses invalid counts and missing report timestamps", () => {
    for (const row of [{ ...base, status: "AVAILABLE" as const, free_spaces: 7 },
      { ...base, status: "AVAILABLE" as const, free_spaces: 41, reported_at: "2026-10-07T03:05:00Z" },
      { ...base, status: "AVAILABLE" as const, free_spaces: 7, reported_at: "invalid" }]) {
      const v = presentParking([row]);
      if (v.kind !== "lots") throw new Error();
      expect(v.lots[0].freeText).toBeNull();
      expect(v.lots[0].occupiedPercent).toBeNull();
    }
  });
});

describe("readSavedParking", () => {
  const saved = { version: 1, lotCode: "P1", lotName: "ลานหน้าวัด", note: "ใกล้ต้นไม้", savedAt: "2026-10-08T08:00:00Z", position: null };
  it("round trips a note without requiring geolocation", () => {
    expect(readSavedParking(JSON.stringify(saved))).toEqual(saved);
  });
  it("accepts valid device coordinates with reported accuracy", () => {
    const withGps = { ...saved, position: { lat: 13.7, lng: 100.5, accuracy: 35 } };
    expect(readSavedParking(JSON.stringify(withGps))).toEqual(withGps);
  });
  it("rejects corrupt, incompatible, and out-of-range local records", () => {
    for (const raw of [null, "{", "null", "[]", JSON.stringify({ ...saved, version: 2 }),
      JSON.stringify({ ...saved, note: "x".repeat(281) }), JSON.stringify({ ...saved, savedAt: "invalid" }),
      JSON.stringify({ ...saved, position: { lat: 91, lng: 100, accuracy: 4 } }),
      JSON.stringify({ ...saved, position: { lat: 13, lng: 181, accuracy: 4 } }),
      JSON.stringify({ ...saved, position: { lat: 13, lng: 100, accuracy: -1 } })]) {
      expect(readSavedParking(raw)).toBeNull();
    }
  });
});
