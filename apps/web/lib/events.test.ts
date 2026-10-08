import { describe, expect, it } from "vitest";
import {
  APPROVER_MSG, GATES, GATE_TH, READINESS_TH, bkkLocalToIso, dbErrorMessage, formatDateTh, formatRangeTh, formatTimeTh, isUpcoming,
  okMessage, parseEventForm, parseReadiness, parseReason, parseTargetForm, parseTaskForm, toBkkLocal, weightLabel,
} from "./events";

describe("labels", () => {
  it("readiness states in Thai", () => {
    expect(READINESS_TH).toEqual({ READY: "พร้อม", ALMOST_READY: "ใกล้พร้อม", IN_PROGRESS: "กำลังเตรียม", NOT_READY: "ยังไม่พร้อม", UNKNOWN: "ไม่ทราบ" });
  });
  it("every gate has a Thai label", () => {
    expect(GATES).toEqual(["G-OWNER", "G-VENUE", "G-STAFF", "G-CRIT", "G-CHECK"]);
    for (const g of GATES) expect(GATE_TH[g].length).toBeGreaterThan(3);
  });
  it("task weights 1-5", () => {
    expect([1, 2, 3, 4, 5].map(weightLabel)).toEqual(["ต่ำ", "ปกติ", "สูง", "สำคัญมาก", "วิกฤต"]);
  });
});

describe("parseReadiness", () => {
  it("full detail only when the DB sent gates", () => {
    const full = parseReadiness({ state: "NOT_READY", percent: 24, reason: "GATE_FAILED", staffing: 60, tasks_done_weight: 0, tasks_total_weight: 3, volunteer_gap: 2,
      gates: { "G-OWNER": "PASS", "G-VENUE": "PASS", "G-STAFF": "FAIL", "G-CRIT": "PASS", "G-CHECK": "PASS" } })!;
    expect(full.state).toBe("NOT_READY");
    expect(full.percent).toBe(24);
    expect(full.detail?.gates["G-STAFF"]).toBe("FAIL");
    expect(full.detail).toMatchObject({ staffing: 60, tasksDone: 0, tasksTotal: 3, volunteerGap: 2 });
  });
  it("state + percent only for members without gates (no detail leaks)", () => {
    const v = parseReadiness({ state: "READY", percent: 100 })!;
    expect(v.detail).toBeNull();
    expect(v.state).toBe("READY");
    expect(v.percent).toBe(100);
  });
  it("draft: state null; unknown gate values become UNKNOWN; null input", () => {
    expect(parseReadiness({ state: null, reason: "NOT_PLANNED" })).toMatchObject({ state: null, percent: null, reason: "NOT_PLANNED" });
    expect(parseReadiness({ state: "UNKNOWN", percent: null, gates: { "G-STAFF": "UNKNOWN" } })!.detail!.gates["G-OWNER"]).toBe("UNKNOWN");
    expect(parseReadiness(null)).toBeNull();
    expect(parseReadiness({ state: "BOGUS", percent: "75" })).toMatchObject({ state: null, percent: 75 });
  });
  it("frozen snapshot flag", () => expect(parseReadiness({ state: "READY", percent: 95, frozen: true })!.frozen).toBe(true));
});

describe("Asia/Bangkok conversion", () => {
  it("datetime-local -> +07:00 instant", () => {
    expect(bkkLocalToIso("2026-10-17T09:00")).toBe("2026-10-17T09:00:00+07:00");
    expect(new Date(bkkLocalToIso("2026-10-17T09:00")!).toISOString()).toBe("2026-10-17T02:00:00.000Z");
    expect(new Date(bkkLocalToIso("2026-01-01T00:30")!).toISOString()).toBe("2025-12-31T17:30:00.000Z");
  });
  it("rejects malformed and impossible dates", () => {
    for (const bad of ["", "2026-10-17", "2026-10-17 09:00", "2026-02-30T09:00", "2026-13-01T09:00", "2026-10-17T24:00", "2026-10-17T09:60"]) expect(bkkLocalToIso(bad)).toBeNull();
  });
  it("instant -> Bangkok wall clock, round trip", () => {
    expect(toBkkLocal(new Date("2026-10-17T02:00:00Z"))).toBe("2026-10-17T09:00");
    expect(toBkkLocal("2025-12-31T17:30:00Z")).toBe("2026-01-01T00:30");
    for (const v of ["2026-10-17T09:00", "2026-03-31T23:59", "2027-01-01T00:00"]) expect(toBkkLocal(bkkLocalToIso(v)!)).toBe(v);
  });
  it("Thai Buddhist year, Bangkok date and 24h time", () => {
    const d = new Date("2026-10-17T02:00:00Z");   // 09:00 Bangkok, Saturday
    expect(formatDateTh(d)).toBe("วันเสาร์ที่ 17 ตุลาคม 2569");
    expect(formatTimeTh(d)).toBe("09:00 น.");
    expect(formatDateTh(new Date("2026-10-16T18:30:00Z"))).toContain("17 ตุลาคม 2569");   // 01:30 next day in Bangkok
  });
  it("range on one day vs several days", () => {
    expect(formatRangeTh("2026-10-17T02:00:00Z", "2026-10-17T05:30:00Z")).toBe("วันเสาร์ที่ 17 ตุลาคม 2569 เวลา 09:00 น. – 12:30 น.");
    expect(formatRangeTh("2026-10-17T02:00:00Z", "2026-10-18T05:30:00Z")).toContain("ถึง");
  });
  it("upcoming vs past", () => {
    const now = new Date("2026-10-07T00:00:00Z");
    expect(isUpcoming({ status: "APPROVED", ends_at: "2026-10-08T00:00:00Z" }, now)).toBe(true);
    expect(isUpcoming({ status: "APPROVED", ends_at: "2026-10-06T00:00:00Z" }, now)).toBe(false);
    expect(isUpcoming({ status: "CANCELLED", ends_at: "2026-10-30T00:00:00Z" }, now)).toBe(false);
    expect(isUpcoming({ status: "COMPLETED", ends_at: "2026-10-30T00:00:00Z" }, now)).toBe(false);
  });
});

const goodEvent = { kind: "ceremony", title: "งานบุญทดสอบ", description: "", starts: "2026-10-17T09:00", ends: "2026-10-17T12:00", venue: "", visibility: "public", lead: "", expected: "" };
describe("parseEventForm", () => {
  it("accepts minimal input and converts to Bangkok instants", () => {
    const r = parseEventForm(goodEvent);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ startsIso: "2026-10-17T09:00:00+07:00", endsIso: "2026-10-17T12:00:00+07:00", lead: null, expected: null });
  });
  it("title 2..120", () => {
    expect(parseEventForm({ ...goodEvent, title: " ก " }).ok).toBe(false);
    expect(parseEventForm({ ...goodEvent, title: "ก".repeat(120) }).ok).toBe(true);
    expect(parseEventForm({ ...goodEvent, title: "ก".repeat(121) }).ok).toBe(false);
  });
  it("end must be after start; both required", () => {
    const r = parseEventForm({ ...goodEvent, ends: "2026-10-17T09:00" });
    expect(!r.ok && r.fieldErrors.ends).toContain("หลังเวลาเริ่มงาน");
    const r2 = parseEventForm({ ...goodEvent, starts: "", ends: "" });
    expect(!r2.ok && Object.keys(r2.fieldErrors).sort()).toEqual(["ends", "starts"]);
  });
  it("kind, visibility, lead uuid, expected number", () => {
    expect(parseEventForm({ ...goodEvent, kind: "x" }).ok).toBe(false);
    expect(parseEventForm({ ...goodEvent, visibility: "everyone" }).ok).toBe(false);
    expect(parseEventForm({ ...goodEvent, lead: "not-a-uuid" }).ok).toBe(false);
    expect(parseEventForm({ ...goodEvent, lead: "aaaaaaaa-0000-0000-0000-000000000001" }).ok).toBe(true);
    expect(parseEventForm({ ...goodEvent, expected: "12a" }).ok).toBe(false);
    expect(parseEventForm({ ...goodEvent, expected: "-5" }).ok).toBe(false);
    const r = parseEventForm({ ...goodEvent, expected: " 300 " });
    expect(r.ok && r.value.expected).toBe(300);
  });
  it("description limit 2000", () => {
    expect(parseEventForm({ ...goodEvent, description: "ก".repeat(2001) }).ok).toBe(false);
    expect(parseEventForm({ ...goodEvent, description: "ก".repeat(2000) }).ok).toBe(true);
  });
});

describe("parseTargetForm", () => {
  const t = { category: "volunteer", label: "อาสาจัดสถานที่", required: "2", min: "", hard: "on" };
  it("accepts; empty min stays null so the DB default applies", () => {
    const r = parseTargetForm(t);
    expect(r.ok && r.value).toMatchObject({ required: 2, min: null, hard: true });
    const r2 = parseTargetForm({ ...t, hard: undefined as unknown as string, min: "1" });
    expect(r2.ok && r2.value).toMatchObject({ min: 1, hard: false });
  });
  it("rejects bad category, label, count; min above required", () => {
    expect(parseTargetForm({ ...t, category: "dog" }).ok).toBe(false);
    expect(parseTargetForm({ ...t, label: "ก" }).ok).toBe(false);
    for (const n of ["0", "501", "x", ""]) expect(parseTargetForm({ ...t, required: n }).ok).toBe(false);
    const r = parseTargetForm({ ...t, min: "3" });
    expect(!r.ok && r.fieldErrors.min).toBeTruthy();
  });
});

describe("parseTaskForm", () => {
  const t = { title: "เตรียมเครื่องเสียง", weight: "3", gate: "on", due: "2026-10-16T09:00", assignee: "" };
  it("accepts and converts due to Bangkok time", () => {
    const r = parseTaskForm(t);
    expect(r.ok && r.value).toMatchObject({ weight: 3, gate: true, dueIso: "2026-10-16T09:00:00+07:00", assignee: null });
  });
  it("weight 1..5, title, due, assignee", () => {
    for (const w of ["0", "6", "", "x"]) expect(parseTaskForm({ ...t, weight: w }).ok).toBe(false);
    expect(parseTaskForm({ ...t, title: "" }).ok).toBe(false);
    expect(parseTaskForm({ ...t, due: "tomorrow" }).ok).toBe(false);
    expect(parseTaskForm({ ...t, due: "" }).ok).toBe(true);
    expect(parseTaskForm({ ...t, assignee: "zzz" }).ok).toBe(false);
  });
});

describe("parseReason", () => {
  it("required for cancel", () => {
    expect(parseReason("   ").ok).toBe(false);
    expect(parseReason(" ฝนตกหนัก ").ok).toBe(true);
    expect(parseReason("ก".repeat(501)).ok).toBe(false);
  });
});

describe("DB refusals in Thai", () => {
  it("approve without authority", () => expect(dbErrorMessage("approve", "42501")).toBe("ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายอนุมัติ"));
  it("cancel of an approved event also needs the approver", () => expect(dbErrorMessage("cancel", "42501")).toContain(APPROVER_MSG));
  it("plan without lead and approve without venue tell what to do", () => {
    expect(dbErrorMessage("plan", "23514", "lead person required")).toContain("เลือกผู้รับผิดชอบ");
    expect(dbErrorMessage("approve", "23514", "venue required")).toContain("ระบุสถานที่");
  });
  it("monk/lay mismatch, self-verify, self-approve", () => {
    expect(dbErrorMessage("participant", "23514", "LEDGER_KIND_MISMATCH: wrong category")).toContain("พระต้องอยู่เป้าหมายประเภทพระ");
    expect(dbErrorMessage("progress", "42501", "not allowed", "verify")).toContain("ตรวจรับงานของตัวเองไม่ได้");
    expect(dbErrorMessage("decide", "P0002", "nothing to decide")).toContain("อนุมัติเองไม่ได้");
  });
  it("unknown errors fall back to a retry hint, never English", () => {
    expect(dbErrorMessage("task", undefined, "ECONNREFUSED")).toMatch(/ลองกดอีกครั้ง/);
    expect(dbErrorMessage("task", "XX000", "boom")).not.toMatch(/[a-z]{4,}/i);
  });
  it("success messages", () => {
    expect(okMessage("plan")).toContain("วางแผนงานแล้ว");
    expect(okMessage("progress", "submit")).toContain("ส่งงานแล้ว");
    expect(okMessage("decide", "accept")).toBe("อนุมัติแล้ว");
  });
});
