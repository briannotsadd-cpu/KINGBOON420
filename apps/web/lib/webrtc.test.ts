import { describe, expect, it } from "vitest";
import { formatDuration, mediaErrorTh, phaseFromDbStatus, phaseFromPc, splitCallRows, startCallErrorTh, statusText, validateSignal, MAX_SIGNAL_BYTES } from "./webrtc";

describe("validateSignal", () => {
  it("accepts offer/answer/ice", () => {
    expect(validateSignal("offer", { type: "offer", sdp: "v=0" }).ok).toBe(true);
    expect(validateSignal("answer", { type: "answer", sdp: "v=0" }).ok).toBe(true);
    expect(validateSignal("ice", { candidate: "candidate:1 1 udp ..." }).ok).toBe(true);
  });
  it("rejects wrong shapes and kinds", () => {
    expect(validateSignal("offer", { type: "answer", sdp: "v=0" }).ok).toBe(false);
    expect(validateSignal("offer", { type: "offer", sdp: "" }).ok).toBe(false);
    expect(validateSignal("ice", {}).ok).toBe(false);
    expect(validateSignal("bye", {}).ok).toBe(false);
    expect(validateSignal("ice", null).ok).toBe(false);
    expect(validateSignal("ice", [1]).ok).toBe(false);
  });
  it("enforces the 16 KB limit", () => {
    expect(validateSignal("offer", { type: "offer", sdp: "a".repeat(MAX_SIGNAL_BYTES) }).ok).toBe(false);
    expect(validateSignal("offer", { type: "offer", sdp: "a".repeat(MAX_SIGNAL_BYTES - 100) }).ok).toBe(true);
  });
});

describe("duration + status text", () => {
  it("formats mm:ss and h:mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(-3)).toBe("00:00");
    expect(formatDuration(NaN)).toBe("00:00");
  });
  it("maps phases to Thai", () => {
    expect(statusText("calling")).toBe("กำลังโทร…");
    expect(statusText("connecting")).toBe("กำลังเชื่อมต่อ");
    expect(statusText("connected", 75)).toBe("คุยอยู่ 01:15");
    expect(statusText("ended")).toBe("วางสายแล้ว");
    expect(statusText("missed")).toBe("ไม่มีผู้รับสาย");
    expect(statusText("declined")).toBe("ปฏิเสธสาย");
    expect(statusText("failed")).toBe("เชื่อมต่อไม่สำเร็จ — เครือข่ายนี้อาจไม่รองรับการโทรตรง");
  });
});

describe("phase mapping", () => {
  it("db status", () => {
    expect(phaseFromDbStatus("ringing", "incoming")).toBe("incoming");
    expect(phaseFromDbStatus("ringing", "idle")).toBe("calling");
    expect(phaseFromDbStatus("active", "calling")).toBe("connecting");
    expect(phaseFromDbStatus("active", "connected")).toBe("connected");
    expect(phaseFromDbStatus("declined", "calling")).toBe("declined");
    expect(phaseFromDbStatus("failed", "connecting")).toBe("failed");
  });
  it("peer connection", () => {
    expect(phaseFromPc("connected", "connected")).toBe("connected");
    expect(phaseFromPc("failed", "checking")).toBe("failed");
    expect(phaseFromPc("connecting", "failed")).toBe("failed");
    expect(phaseFromPc("disconnected", "disconnected")).toBeNull();
  });
});

describe("errors", () => {
  it("start_call errors", () => {
    expect(startCallErrorTh("42501")).toBe("คนนี้ไม่รับสายในตอนนี้");
    expect(startCallErrorTh("55006")).toBe("อีกฝ่ายกำลังติดสายอยู่");
    expect(startCallErrorTh("54000")).toBe("ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่");
  });
  it("media errors mention what to do", () => {
    expect(mediaErrorTh("NotAllowedError", true)).toContain("กล้อง");
    expect(mediaErrorTh("NotAllowedError", false)).not.toContain("กล้อง");
    expect(mediaErrorTh("NotFoundError", false)).toContain("ไมโครโฟน");
  });
});

describe("splitCallRows", () => {
  it("handles empty, no-signal and ordered signals", () => {
    expect(splitCallRows([])).toBeNull();
    const base = { status: "ringing" as const, media: "voice" as const, caller: "a", callee: "b", other_name: "N" };
    expect(splitCallRows([{ ...base, signal_id: null, signal_kind: null, payload: null }])!.signals).toEqual([]);
    const s = splitCallRows([
      { ...base, signal_id: "7", signal_kind: "ice", payload: { candidate: "x" } },
      { ...base, signal_id: "3", signal_kind: "offer", payload: { type: "offer", sdp: "v" } }])!;
    expect(s.signals.map((x) => x.id)).toEqual([3, 7]);
  });
});
