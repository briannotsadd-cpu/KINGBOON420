import { describe, expect, it } from "vitest";
import { parkingError, parseLotInput, parseReportInput, reportAge } from "./parking-staff";

const lot = { code: "p1", name_th: "ลานจอดหน้าวัด", capacity: "40", accessible: "2", vehicles: ["car", "van"], fee: " ฟรี ", hours: "",
  is_public: "on", active: "on", stale: "60" };

describe("parseReportInput", () => {
  it("requires a status", () => {
    const r = parseReportInput({ status: "", free: "", note: "" }, 40);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.status).toContain("เลือกสถานะ");
  });
  it("never accepts UNKNOWN (it is computed, not reported)", () => {
    expect(parseReportInput({ status: "UNKNOWN", free: "", note: "" }, 40).ok).toBe(false);
  });
  it("keeps an empty count as null (no guessing) and trims the note", () => {
    expect(parseReportInput({ status: "FILLING", free: " ", note: "  ใช้ประตู 2  " }, 40))
      .toEqual({ ok: true, value: { status: "FILLING", free: null, note: "ใช้ประตู 2" } });
  });
  it("rejects counts above capacity, non-integers and negatives", () => {
    for (const free of ["41", "3.5", "-1", "abc"]) expect(parseReportInput({ status: "AVAILABLE", free, note: "" }, 40).ok).toBe(false);
    expect(parseReportInput({ status: "AVAILABLE", free: "41", note: "" }, null).ok).toBe(true);   // capacity unknown: no upper bound to check
  });
  it("FULL means 0 free; CLOSED takes no count", () => {
    expect(parseReportInput({ status: "FULL", free: "", note: "" }, 40)).toEqual({ ok: true, value: { status: "FULL", free: 0, note: null } });
    expect(parseReportInput({ status: "FULL", free: "3", note: "" }, 40).ok).toBe(false);
    expect(parseReportInput({ status: "CLOSED", free: "0", note: "" }, 40).ok).toBe(false);
  });
  it("limits the note to 200 characters", () => {
    expect(parseReportInput({ status: "AVAILABLE", free: "", note: "ก".repeat(201) }, 40).ok).toBe(false);
  });
});

describe("parseLotInput", () => {
  it("normalises a valid new lot", () => {
    expect(parseLotInput(lot, true)).toEqual({ ok: true, value: { code: "P1", name: "ลานจอดหน้าวัด", capacity: 40, accessible: 2,
      vehicles: ["car", "van"], fee: "ฟรี", hours: null, isPublic: true, active: true, stale: 60 } });
  });
  it("checks the code only for a new lot", () => {
    expect(parseLotInput({ ...lot, code: "ลาน 1" }, true).ok).toBe(false);
    expect(parseLotInput({ ...lot, code: "" }, false).ok).toBe(true);
  });
  it("keeps unknown numbers as null and rejects bad ones", () => {
    const r = parseLotInput({ ...lot, capacity: "", accessible: "" }, true);
    expect(r.ok && r.value.capacity === null && r.value.accessible === null).toBe(true);
    for (const capacity of ["0", "10001", "x"]) expect(parseLotInput({ ...lot, capacity }, true).ok).toBe(false);
    expect(parseLotInput({ ...lot, accessible: "41" }, true).ok).toBe(false);
  });
  it("needs at least one known vehicle type and rejects unknown ones", () => {
    expect(parseLotInput({ ...lot, vehicles: [] }, true).ok).toBe(false);
    expect(parseLotInput({ ...lot, vehicles: ["car", "plane"] }, true).ok).toBe(false);
  });
  it("unchecked boxes are false; stale minutes stay within 5-1440", () => {
    const r = parseLotInput({ ...lot, is_public: "", active: "" }, true);
    expect(r.ok && !r.value.isPublic && !r.value.active).toBe(true);
    for (const stale of ["4", "1441", ""]) expect(parseLotInput({ ...lot, stale }, true).ok).toBe(false);
  });
});

describe("parkingError", () => {
  it("maps database codes to Thai next steps", () => {
    expect(parkingError({ code: "42501" }).error).toContain("ไม่มีสิทธิ์");
    expect(parkingError({ code: "54000", message: "rate limited" }).error).toContain("รอสักครู่");
    expect(parkingError({ code: "23505" }).fieldErrors?.code).toContain("ถูกใช้แล้ว");
    expect(parkingError({ code: "23514", message: "free_spaces 41 exceeds capacity 40" }).fieldErrors?.free).toBeTruthy();
    expect(parkingError({ code: "P0002" }).error).toContain("ไม่พบลานจอด");
    expect(parkingError({}).error).toContain("ข้อมูลที่กรอกยังอยู่");
  });
});

describe("reportAge", () => {
  const now = new Date("2026-10-21T05:00:00Z");
  it("says when nobody has reported", () => expect(reportAge(null, now)).toBe("ยังไม่มีใครรายงาน"));
  it("uses minutes within the hour", () => {
    expect(reportAge(new Date("2026-10-21T04:59:40Z"), now)).toBe("รายงานเมื่อสักครู่");
    expect(reportAge(new Date("2026-10-21T04:48:00Z"), now)).toBe("รายงานเมื่อ 12 นาทีที่แล้ว");
  });
  it("shows the time for older reports", () => expect(reportAge(new Date("2026-10-21T02:00:00Z"), now)).toMatch(/^รายงานล่าสุด .* น\.$/));
});
