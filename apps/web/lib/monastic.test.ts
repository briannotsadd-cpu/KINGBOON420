import { describe, expect, it } from "vitest";
import {
  addDaysYmd, availabilityError, bkkLocal, bkkToIso, bkkYmd, countStates, dayKindLabel, endOfTodayLocal, fmtDate, fmtTime, groupSuggestions,
  invitationError, isYmd, localToIso, parseAvailability, parseInvitation, parseOtherUnavailable, parseRiteType, questStatusLabel, reasonLabel,
  teamWarnings, hardConstraintDetail, stateLabel, CONFIRM_ERR, STALE_ERR, type InvitationInput,
} from "./monastic";

const NOW = new Date("2026-10-07T10:00:00Z");   // 17:00 in Bangkok

describe("Bangkok time", () => {
  it("date flips at 17:00 UTC", () => {
    expect(bkkYmd(new Date("2026-10-07T16:59:00Z"))).toBe("2026-10-07");
    expect(bkkYmd(new Date("2026-10-07T17:00:00Z"))).toBe("2026-10-08");
    expect(bkkLocal(NOW)).toBe("2026-10-07T17:00");
  });
  it("end of today", () => expect(endOfTodayLocal(NOW)).toBe("2026-10-07T23:59"));
  it("converts wall time to +07:00 and rejects impossible values", () => {
    expect(bkkToIso("2026-10-07", "09:30")).toBe("2026-10-07T09:30:00+07:00");
    expect(new Date(bkkToIso("2026-10-07", "09:30")!).toISOString()).toBe("2026-10-07T02:30:00.000Z");
    expect(bkkToIso("2026-02-30", "09:30")).toBeNull();
    expect(bkkToIso("2026-10-07", "24:00")).toBeNull();
    expect(localToIso("2026-10-07T23:59")).toBe("2026-10-07T23:59:00+07:00");
    expect(localToIso("garbage")).toBeNull();
  });
  it("date arithmetic", () => {
    expect(addDaysYmd("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysYmd("2026-01-01", -1)).toBe("2025-12-31");
    expect(isYmd("2026-13-01")).toBe(false);
    expect(isYmd("2026-10-07")).toBe(true);
  });
  it("formats with the Thai Buddhist year, in Bangkok", () => {
    expect(fmtDate(new Date("2026-10-07T05:00:00Z"))).toContain("2569");
    expect(fmtDate(new Date("2026-10-07T05:00:00Z"))).toContain("ตุลาคม");
    expect(fmtTime(new Date("2026-10-07T02:30:00Z"))).toBe("09:30 น.");
  });
});

describe("labels", () => {
  it("day kinds in Thai", () => {
    expect(dayKindLabel("schedule", "invitation")).toBe("กิจนิมนต์");
    expect(dayKindLabel("schedule", "travel", "OUT")).toBe("เดินทางไป");
    expect(dayKindLabel("schedule", "travel", "BACK")).toBe("เดินทางกลับ");
    expect(dayKindLabel("schedule", "ceremony")).toBe("พิธี");
    expect(dayKindLabel("schedule", "class")).toBe("เรียน");
    expect(dayKindLabel("quest")).toBe("ภารกิจ");
  });
  it("quest status", () => {
    expect(questStatusLabel("SUBMITTED", false, true)).toBe("รอตรวจรับ");
    expect(questStatusLabel("STARTED", true, false)).toBe("เลยกำหนดแล้ว");
    expect(questStatusLabel("COMPLETED", false, false)).toBe("เสร็จแล้ว");
  });
  it("reasons and states", () => {
    expect(reasonLabel("MANUAL:SICK")).toContain("อาพาธ");
    expect(reasonLabel("CALENDAR:ceremony")).toContain("ทำพิธี");
    expect(stateLabel("UNAVAILABLE")).toBe("ไม่ว่าง");
    expect(stateLabel("???")).toBe("ไม่ทราบ");
  });
});

describe("board counters", () => {
  it("always includes UNKNOWN, omits other empty states", () => {
    const c = countStates([{ state: "AVAILABLE" }, { state: "AVAILABLE" }, { state: "UNAVAILABLE" }]);
    expect(c).toEqual([{ state: "AVAILABLE", n: 2 }, { state: "UNAVAILABLE", n: 1 }, { state: "UNKNOWN", n: 0 }]);
    expect(countStates([])).toEqual([{ state: "UNKNOWN", n: 0 }]);
  });
});

describe("availability form", () => {
  it("valid_until is required", () => {
    const r = parseAvailability({ state: "AVAILABLE", valid_until: "", reason: "" }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.valid_until).toContain("ระบุ");
  });
  it("accepts end of today, converts to +07:00", () => {
    const r = parseAvailability({ state: "AVAILABLE", valid_until: "2026-10-07T23:59", reason: "" }, NOW);
    expect(r).toEqual({ ok: true, value: { state: "AVAILABLE", untilIso: "2026-10-07T23:59:00+07:00", reason: null } });
  });
  it("past, >24h for non-UNAVAILABLE, >120 days", () => {
    expect(parseAvailability({ state: "REST", valid_until: "2026-10-07T10:00", reason: "" }, NOW).ok).toBe(false);
    expect(parseAvailability({ state: "REST", valid_until: "2026-10-09T10:00", reason: "" }, NOW).ok).toBe(false);
    expect(parseAvailability({ state: "UNAVAILABLE", valid_until: "2026-10-12T10:00", reason: "SICK" }, NOW).ok).toBe(true);
    expect(parseAvailability({ state: "UNAVAILABLE", valid_until: "2027-06-01T10:00", reason: "SICK" }, NOW).ok).toBe(false);
  });
  it("UNAVAILABLE defaults the reason to OTHER; others carry no reason", () => {
    const u = parseAvailability({ state: "UNAVAILABLE", valid_until: "2026-10-08T10:00", reason: "" }, NOW);
    expect(u.ok && u.value.reason).toBe("OTHER");
    const p = parseAvailability({ state: "PERSONAL", valid_until: "2026-10-07T20:00", reason: "SICK" }, NOW);
    expect(p.ok && p.value.reason).toBeNull();
  });
  it("rejects an unknown state", () => expect(parseAvailability({ state: "CEREMONY", valid_until: "2026-10-07T20:00", reason: "" }, NOW).ok).toBe(false));
});

describe("set another monk unavailable", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  it("end date required; lasts to the end of that Bangkok day", () => {
    expect(parseOtherUnavailable({ person_id: id, end_date: "", reason: "SICK" }, NOW).ok).toBe(false);
    const r = parseOtherUnavailable({ person_id: id, end_date: "2026-10-09", reason: "SICK" }, NOW);
    expect(r.ok && r.value.untilIso).toBe("2026-10-10T00:00:00+07:00");
  });
  it("max 120 days, not in the past, reason required", () => {
    expect(parseOtherUnavailable({ person_id: id, end_date: "2026-10-06", reason: "SICK" }, NOW).ok).toBe(false);
    expect(parseOtherUnavailable({ person_id: id, end_date: "2027-03-01", reason: "SICK" }, NOW).ok).toBe(false);
    expect(parseOtherUnavailable({ person_id: id, end_date: "2026-10-09", reason: "" }, NOW).ok).toBe(false);
    expect(parseOtherUnavailable({ person_id: "x", end_date: "2026-10-09", reason: "SICK" }, NOW).ok).toBe(false);
  });
});

const INV: InvitationInput = {
  host_name: "เจ้าภาพทดสอบ", host_phone: "081 234 5678", host_relation: "", rite: "11111111-1111-1111-1111-111111111111", venue: "บ้านสมมติ",
  date: "2026-10-09", time: "09:00", duration: "60", monks: "2", transport: "HOST_PROVIDES", travel_out: "", travel_back: "", via: "phone", note: "",
};
describe("invitation form", () => {
  it("valid input -> Bangkok instant; blank travel stays null (never guessed)", () => {
    const r = parseInvitation(INV, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.startsIso).toBe("2026-10-09T09:00:00+07:00"); expect(r.value.out).toBeNull(); expect(r.value.back).toBeNull(); expect(r.value.monks).toBe(2); }
  });
  it("travel minutes 0..600", () => {
    const r = parseInvitation({ ...INV, travel_out: "30", travel_back: "45" }, NOW);
    expect(r.ok && [r.value.out, r.value.back]).toEqual([30, 45]);
    expect(parseInvitation({ ...INV, travel_out: "700" }, NOW).ok).toBe(false);
    expect(parseInvitation({ ...INV, travel_back: "abc" }, NOW).ok).toBe(false);
  });
  it("field errors in Thai", () => {
    const r = parseInvitation({ ...INV, host_name: "", venue: "", host_phone: "12ab", rite: "", monks: "0", date: "2026-10-01" }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["date", "host_name", "host_phone", "monks", "rite", "venue"]);
  });
  it("rite type form", () => {
    expect(parseRiteType({ name: "ก", duration: "60", requires_lead: false }).ok).toBe(false);
    expect(parseRiteType({ name: "สวดมนต์เย็น", duration: "60", requires_lead: true }).ok).toBe(true);
  });
});

describe("error mapping", () => {
  it("stale proposal", () => {
    expect(invitationError({ code: "40001", message: "STALE_PROPOSAL" })).toBe(STALE_ERR);
    expect(STALE_ERR).toBe("มีคนแก้ไขกิจนิมนต์นี้ไปแล้ว กรุณาโหลดหน้านี้ใหม่");
  });
  it("human confirm / 42501", () => {
    expect(invitationError({ code: "42501", message: "HUMAN_CONFIRM_REQUIRED: invitation.confirm needed" }, "confirm")).toBe(CONFIRM_ERR);
    expect(invitationError({ code: "42501", message: "not allowed" }, "cancel")).toBe(CONFIRM_ERR);
    expect(invitationError({ code: "42501", message: "not allowed" }, "propose_team")).not.toBe(CONFIRM_ERR);
  });
  it("23514 variants", () => {
    expect(invitationError({ code: "23514", message: "TEAM_SIZE_MISMATCH" })).toContain("จำนวนพระ");
    expect(invitationError({ code: "23514", message: "WARNINGS_NOT_ACKNOWLEDGED" })).toContain("รับทราบคำเตือน");
    expect(invitationError({ code: "23514", message: "LEAD_REQUIRED" })).toContain("หัวหน้าคณะ");
    expect(invitationError({ code: "23514", message: "reason required" })).toContain("เหตุผล");
    expect(invitationError({ code: "23514", message: "reason code required" })).toContain("เลือกเหตุผล");
    const h = invitationError({ code: "23514", message: "HARD_CONSTRAINT 3f2a: MANUAL_BLOCK,DAILY_LIMIT" });
    expect(h).toContain("ตั้งสถานะไม่ว่าง");
    expect(h).toContain("ครบ 2 กิจ");
    expect(hardConstraintDetail("HARD_CONSTRAINT x: COMMITMENT_OVERLAP")).toContain("ติดกิจอื่น");
  });
  it("unknown errors fall back to the network message", () => expect(invitationError({ code: "XX000", message: "boom" })).toContain("ตรวจสอบอินเทอร์เน็ต"));
  it("availability errors", () => {
    expect(availabilityError({ code: "23514", message: "VALID_UNTIL_REQUIRED" })).toContain("ระบุ");
    expect(availabilityError({ code: "23514", message: "VALID_UNTIL_TOO_FAR" })).toContain("120 วัน");
    expect(availabilityError({ code: "22023", message: "NOT_MONASTIC" })).toContain("พระภิกษุ");
    expect(availabilityError({ code: "42501", message: "not allowed" })).toContain("ไม่มีสิทธิ์");
  });
});

describe("suggestions", () => {
  const rows = [
    { person_id: "a", display_name: "A", list: "suggested", violations: [], warnings: [] },
    { person_id: "b", display_name: "B", list: "needs_confirmation", violations: [], warnings: ["NO_AVAILABILITY_SIGNAL"] },
    { person_id: "c", display_name: "C", list: "excluded", violations: ["MANUAL_BLOCK"], warnings: [] },
  ];
  it("groups into three lists", () => {
    const g = groupSuggestions(rows);
    expect([g.suggested.length, g.needs.length, g.excluded.length]).toEqual([1, 1, 1]);
  });
  it("team warnings are Thai, deduplicated, only for the team", () => {
    expect(teamWarnings(rows, ["a", "b"], true)).toEqual(["ยังไม่ได้แจ้งว่าว่างรับกิจในช่วงนี้ ควรสอบถามก่อน"]);
    expect(teamWarnings(rows, ["a"], true)).toEqual([]);
    expect(teamWarnings(rows, ["a"], false)).toHaveLength(1);
  });
});
