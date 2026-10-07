import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { parseContact, validReply } from "./contact";
import { firstIp, ipHash } from "./contact-ip";

const ok = { topic: "other", message: "สวัสดีครับ ขอสอบถาม", name: "", phone: "" };

describe("ip hash", () => {
  it("uses the first x-forwarded-for address", () => {
    expect(firstIp("203.0.113.5, 10.0.0.1")).toBe("203.0.113.5");
    expect(firstIp(" 203.0.113.5 ")).toBe("203.0.113.5");
  });
  it("falls back to 'unknown'", () => {
    expect(firstIp(null)).toBe("unknown");
    expect(firstIp("")).toBe("unknown");
    expect(firstIp(" , 1.2.3.4")).toBe("unknown");
  });
  it("is sha256(ip + pepper) hex", () => {
    expect(ipHash("203.0.113.5, 10.0.0.1", "pep")).toBe(createHash("sha256").update("203.0.113.5pep").digest("hex"));
    expect(ipHash(null, "pep")).toBe(createHash("sha256").update("unknownpep").digest("hex"));
  });
  it("differs per pepper and per ip, and hides the address", () => {
    expect(ipHash("1.1.1.1", "a")).not.toBe(ipHash("1.1.1.1", "b"));
    expect(ipHash("1.1.1.1", "a")).not.toBe(ipHash("1.1.1.2", "a"));
    expect(ipHash("1.1.1.1", "a")).not.toContain("1.1.1.1");
  });
});

describe("parseContact", () => {
  it("accepts minimal input", () => expect(parseContact(ok).ok).toBe(true));
  it("rejects unknown topic", () => {
    const r = parseContact({ ...ok, topic: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.topic).toBeTruthy();
  });
  it("message 5..2000 (trimmed, counted in characters)", () => {
    expect(parseContact({ ...ok, message: "  กขคง  " }).ok).toBe(false);
    expect(parseContact({ ...ok, message: "กขคงจ" }).ok).toBe(true);
    expect(parseContact({ ...ok, message: "ก".repeat(2000) }).ok).toBe(true);
    expect(parseContact({ ...ok, message: "ก".repeat(2001) }).ok).toBe(false);
  });
  it("phone optional; digits + - space only; 6..20", () => {
    expect(parseContact({ ...ok, phone: "081 234 5678" }).ok).toBe(true);
    expect(parseContact({ ...ok, phone: "+66-81-234-5678" }).ok).toBe(true);
    expect(parseContact({ ...ok, phone: "12345" }).ok).toBe(false);
    expect(parseContact({ ...ok, phone: "12 345" }).ok).toBe(false);
    expect(parseContact({ ...ok, phone: "081abc5678" }).ok).toBe(false);
    expect(parseContact({ ...ok, phone: "1".repeat(21) }).ok).toBe(false);
    expect(parseContact({ ...ok, phone: "1".repeat(20) }).ok).toBe(true);
  });
  it("name max 80", () => {
    expect(parseContact({ ...ok, name: "ก".repeat(80) }).ok).toBe(true);
    expect(parseContact({ ...ok, name: "ก".repeat(81) }).ok).toBe(false);
  });
});

describe("validReply", () => {
  it("1..2000", () => {
    expect(validReply("   ")).not.toBeNull();
    expect(validReply("รับทราบ")).toBeNull();
    expect(validReply("ก".repeat(2001))).not.toBeNull();
  });
});
