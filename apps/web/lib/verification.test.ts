import { describe, expect, it } from "vitest";
import { formatDateTh, formatValue, parseFieldInput } from "./verification";

describe("parseFieldInput", () => {
  it("rejects empty input (never stores blanks)", () => expect(parseFieldInput("temple.name_th", "   ")).toBeNull());
  it("keeps text as typed (trimmed)", () => expect(parseFieldInput("temple.office_phone", " 02 123 4567 ")).toBe("02 123 4567"));
  it("geo needs 'lat, lng' inside Thailand", () => {
    expect(parseFieldInput("temple.geo", "13.7563, 100.5018")).toEqual({ lat: 13.7563, lng: 100.5018 });
    expect(parseFieldInput("temple.geo", "48.85, 2.35")).toBeNull();
    expect(parseFieldInput("temple.geo", "ใกล้ตลาด")).toBeNull();
  });
});
describe("format", () => {
  it("geo object shown as lat, lng", () => expect(formatValue({ lat: 13.7, lng: 100.5 })).toBe("13.7, 100.5"));
  it("dates in Thai Buddhist calendar", () => expect(formatDateTh("2026-10-07T03:00:00Z")).toContain("2569"));
});
