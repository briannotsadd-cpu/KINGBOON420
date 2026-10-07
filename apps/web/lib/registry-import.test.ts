import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module shared with the node CLI
import { validateRegistryRecord } from "./registry-import.mjs";

const now = new Date("2026-10-07T12:00:00Z");
const base = { temple_id: "11111111-2222-3333-4444-555555555555", source_type: "onab_registry",
  source_name: "ระบบทะเบียนวัด (ข้อมูลทดสอบ)", source_url: "https://www.onab.go.th/registry/test-0001",
  retrieved_at: "2026-10-07T10:00:00Z", snapshot_sha256: "a".repeat(64), evidence: "ข้อความทดสอบจากหน้าทะเบียน (fictional)",
  fields: { "temple.name_th": "วัดทดสอบระบบ", "temple.province": "จังหวัดทดสอบ" } };

describe("validateRegistryRecord", () => {
  it("accepts a complete tier-1 record and keeps provenance", () => {
    const r = validateRegistryRecord(base, now);
    expect(r.ok).toBe(true);
    expect(r.rows).toHaveLength(2);
    expect(r.source.evidence).toContain("sha256:" + "a".repeat(64));
    expect(r.source.source_date).toBe("2026-10-07");
  });
  it("rejects non-official domains even with an official source_type", () => {
    const r = validateRegistryRecord({ ...base, source_url: "https://onab.go.th.example.invalid/x" }, now);
    expect(r.ok).toBe(false);
  });
  it("rejects tier-2/3 source types", () => {
    expect(validateRegistryRecord({ ...base, source_type: "google_maps" }, now).ok).toBe(false);
    expect(validateRegistryRecord({ ...base, source_type: "temple_website" }, now).ok).toBe(false);
  });
  it("rejects fields the registry does not hold (phone, donation account)", () => {
    const r = validateRegistryRecord({ ...base, fields: { "temple.donation_account": "x", "temple.office_phone": "02" } }, now);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("ต้องให้วัดกรอกเอง");
  });
  it("requires snapshot hash, retrieval time not in the future, and evidence", () => {
    expect(validateRegistryRecord({ ...base, snapshot_sha256: "" }, now).ok).toBe(false);
    expect(validateRegistryRecord({ ...base, retrieved_at: "2027-01-01T00:00:00Z" }, now).ok).toBe(false);
    expect(validateRegistryRecord({ ...base, evidence: "" }, now).ok).toBe(false);
    expect(validateRegistryRecord({ ...base, fields: { "temple.name_th": " " } }, now).ok).toBe(false);
  });
});
