import { describe, expect, it } from "vitest";
import {
  diagnoseGate, formatThaiDateTime, isAdultByYear, isUuid, mapDbError, parseBirthYear, parseList, reasonLabel, validateBody, visLabel, shortId,
} from "./community";

describe("visibility + reasons", () => {
  it("maps visibility to Thai labels", () => {
    expect(visLabel("public")).toBe("ทุกคน");
    expect(visLabel("connections")).toBe("เฉพาะคนที่เชื่อมต่อ");
    expect(visLabel("private")).toBe("เฉพาะฉัน");
  });
  it("maps report reasons", () => {
    expect(reasonLabel("minor_safety")).toBe("เกี่ยวกับผู้เยาว์");
    expect(reasonLabel("harassment")).toBe("ก่อกวน");
  });
});

describe("parseList", () => {
  it("splits, trims, dedupes", () => {
    expect(parseList(" ทำอาหาร, ปลูกต้นไม้ ,ทำอาหาร,, ").items).toEqual(["ทำอาหาร", "ปลูกต้นไม้"]);
  });
  it("rejects more than 20 or too long", () => {
    expect(parseList(Array.from({ length: 21 }, (_, i) => `a${i}`).join(",")).error).toBeTruthy();
    expect(parseList("x".repeat(41)).error).toBeTruthy();
    expect(parseList("").items).toEqual([]);
  });
});

describe("parseBirthYear", () => {
  it("converts Buddhist era", () => expect(parseBirthYear("2510", 2026).year).toBe(1967));
  it("accepts Gregorian and Thai digits", () => {
    expect(parseBirthYear("1980", 2026).year).toBe(1980);
    expect(parseBirthYear("๒๕๑๐", 2026).year).toBe(1967);
  });
  it("rejects junk and future years", () => {
    expect(parseBirthYear("abc", 2026).error).toBeTruthy();
    expect(parseBirthYear("2300", 2026).error).toBeTruthy();
    expect(parseBirthYear("2600", 2026).error).toBeTruthy();
  });
  it("adult rule matches DB (year diff >= 21)", () => {
    expect(isAdultByYear(2005, 2026)).toBe(true);
    expect(isAdultByYear(2006, 2026)).toBe(false);
  });
});

describe("validateBody", () => {
  it("requires text and enforces max", () => {
    expect(validateBody("   ", 10, "ข้อความ")).toContain("กรุณาพิมพ์");
    expect(validateBody("x".repeat(11), 10, "ข้อความ")).toContain("ยาวเกินไป");
    expect(validateBody(" ok ", 10, "ข้อความ")).toBeNull();
  });
});

describe("mapDbError", () => {
  it("maps known codes to Thai", () => {
    expect(mapDbError("54000")).toBe("ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่");
    expect(mapDbError("42501")).toContain("ทำรายการนี้ไม่ได้");
    expect(mapDbError("23514")).toContain("ข้อมูลไม่ถูกต้อง");
    expect(mapDbError("22023")).toContain("ข้อมูลไม่ถูกต้อง");
    expect(mapDbError(undefined)).toContain("อินเทอร์เน็ต");
  });
});

describe("diagnoseGate", () => {
  const base = { hasProfile: true, birthYear: 1970, suspended: false, monastic: false, minorFlag: false, nowYear: 2026 };
  it("orders reasons", () => {
    expect(diagnoseGate({ ...base, suspended: true, monastic: true })).toBe("suspended");
    expect(diagnoseGate({ ...base, monastic: true, hasProfile: false })).toBe("monastic");
    expect(diagnoseGate({ ...base, minorFlag: true })).toBe("minor");
    expect(diagnoseGate({ ...base, hasProfile: false, birthYear: null })).toBe("no_profile");
    expect(diagnoseGate({ ...base, birthYear: 2012 })).toBe("minor");
    expect(diagnoseGate(base)).toBe("no_temple");
  });
});

describe("misc", () => {
  it("formats Thai Buddhist-era time in Bangkok", () => {
    expect(formatThaiDateTime("2026-10-07T07:30:00Z")).toMatch(/^7 ต\.ค\. 2569 14:30$/);
    expect(formatThaiDateTime("garbage")).toBe("");
  });
  it("uuid + shortId", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isUuid("nope")).toBe(false);
    expect(shortId("123e4567-e89b-12d3-a456-426614174000")).toBe("4000");
  });
});
