import { describe, expect, it } from "vitest";
import { chatErrorTh, cursorOf, httpStatusForPg, initials, isIsoTimestamp, isUuid, mergeMessages, validateBody, type ChatMessage } from "./chat";

const m = (id: string, at: string, extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({ id, sender: "s", sender_name: "x", body: "hi", removed: false, created_at: at, ...extra });

describe("validateBody", () => {
  it("rejects empty / whitespace", () => { expect(validateBody("   ").ok).toBe(false); });
  it("trims", () => { expect(validateBody("  สวัสดี ")).toEqual({ ok: true, body: "สวัสดี" }); });
  it("allows 2000 and rejects 2001", () => {
    expect(validateBody("a".repeat(2000)).ok).toBe(true);
    expect(validateBody("a".repeat(2001)).ok).toBe(false);
  });
});

describe("error mapping", () => {
  it("maps pg codes to http", () => {
    expect(httpStatusForPg("42501")).toBe(403);
    expect(httpStatusForPg("54000")).toBe(429);
    expect(httpStatusForPg(undefined)).toBe(500);
  });
  it("uses the required Thai texts", () => {
    expect(chatErrorTh("54000")).toBe("ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่");
  });
});

describe("mergeMessages / cursor", () => {
  it("dedupes, sorts and lets a newer copy (removal) win", () => {
    const a = m("a", "2026-01-01T10:00:00.000001Z"), b = m("b", "2026-01-01T10:00:01.000000Z");
    const merged = mergeMessages([b, a], [m("a", a.created_at, { removed: true, body: null })]);
    expect(merged.map((x) => x.id)).toEqual(["a", "b"]);
    expect(merged[0].removed).toBe(true);
    expect(cursorOf(merged)).toBe(b.created_at);
    expect(cursorOf([])).toBeNull();
  });
});

describe("validators", () => {
  it("iso timestamps", () => {
    expect(isIsoTimestamp("2026-01-01T10:00:00.123456Z")).toBe(true);
    expect(isIsoTimestamp("2026-01-01")).toBe(false);
    expect(isIsoTimestamp("x'; drop table")).toBe(false);
  });
  it("uuid", () => {
    expect(isUuid("0b6b1d1e-8f0a-4c21-9c2e-1a2b3c4d5e6f")).toBe(true);
    expect(isUuid("abc")).toBe(false);
  });
});

describe("initials", () => {
  it("handles latin, thai, leading vowels, empty", () => {
    expect(initials("Somchai Jaidee")).toBe("SJ");
    expect(initials("สมชาย ใจดี")).toBe("สใจ");
    expect(initials("เอก")).toBe("เอ");
    expect(initials("  ")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});
