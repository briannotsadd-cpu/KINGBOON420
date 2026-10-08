import { describe, expect, it } from "vitest";
import { asOfText, conflictLabel, countText, parseCommand, severityLabel, sortConflicts, UNKNOWN_TH } from "./command";

describe("unknown is never zero", () => {
  it("null/undefined render ไม่ทราบ with the database note", () => {
    expect(countText(null, "งานซ่อมยังไม่มีในระบบ")).toEqual({ text: UNKNOWN_TH, unknown: true, note: "งานซ่อมยังไม่มีในระบบ" });
    expect(countText(undefined).text).toBe("ไม่ทราบ");
    expect(countText("abc").unknown).toBe(true);
    expect(countText(NaN).unknown).toBe(true);
  });
  it("a real zero stays 0 and has no note", () => {
    expect(countText(0, "ignored")).toEqual({ text: "0", unknown: false, note: null });
    expect(countText(12).text).toBe("12");
    expect(countText("7").text).toBe("7");   // pg returns bigint as string
  });
});

describe("command JSON", () => {
  it("rejects unusable input and fills missing sections with empty objects", () => {
    expect(parseCommand(null)).toBeNull();
    expect(parseCommand({})).toBeNull();
    const c = parseCommand({ as_of: "2026-10-07T10:00:00Z", full_view: false })!;
    expect(c.full_view).toBe(false);
    expect(c.monastic).toBeUndefined();
    expect(c.facility).toEqual({});
    expect(c.quests).toBeNull();
  });
  it("keeps the monastic panel only when the JSON has it", () => {
    const c = parseCommand({ as_of: "2026-10-07T10:00:00Z", full_view: true, monastic: { total: 2, bhikkhu: 2, samanera: 0, by_state: {} } })!;
    expect(c.monastic?.total).toBe(2);
  });
  it("formats the as-of time in Bangkok", () => {
    expect(asOfText("2026-10-07T10:00:00Z")).toContain("17:00");
    expect(asOfText("2026-10-07T10:00:00Z").startsWith("ข้อมูล ณ ")).toBe(true);
    expect(asOfText("nope")).toContain("ไม่ทราบ");
  });
});

describe("conflicts", () => {
  it("Thai labels", () => {
    expect(conflictLabel("DOUBLE_BOOKED")).toBe("ตารางซ้อนกัน");
    expect(conflictLabel("MANUAL_BLOCK_OVER_COMMITMENT")).toBe("แจ้งไม่ว่างแต่มีกิจ");
    expect(severityLabel("HIGH")).toBe("สำคัญมาก");
  });
  it("sorts high first, then by time", () => {
    const rows = [
      { severity: "MEDIUM", a_start: "2026-10-08T01:00:00Z" }, { severity: "HIGH", a_start: "2026-10-09T01:00:00Z" },
      { severity: "HIGH", a_start: "2026-10-08T01:00:00Z" },
    ];
    expect(sortConflicts(rows).map((r) => r.severity + r.a_start.slice(8, 10))).toEqual(["HIGH08", "HIGH09", "MEDIUM08"]);
  });
});
