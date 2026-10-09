import { describe, expect, it } from "vitest";
import { kingboonDatabaseUrl } from "./database-config";
const ref = "abcdefghijklmnopqrst";
const direct = `postgresql://postgres:test-secret@db.${ref}.supabase.co:5432/postgres`;
describe("KINGBOON database separation", () => {
  it("accepts only the explicitly pinned remote project", () => {
    expect(kingboonDatabaseUrl({ KINGBOON_DATABASE_URL: direct, KINGBOON_SUPABASE_PROJECT_REF: ref, NODE_ENV: "production" })).toBe(direct);
  });
  it("accepts a pooler only when its username carries the KINGBOON ref", () => {
    const pooled = `postgres://postgres.${ref}:test-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;
    expect(kingboonDatabaseUrl({ KINGBOON_DATABASE_URL: pooled, KINGBOON_SUPABASE_PROJECT_REF: ref })).toBe(pooled);
  });
  it("rejects another project's direct or pooled connection", () => {
    for (const url of [direct.replace(ref, "zzzzzzzzzzzzzzzzzzzz"), `postgres://postgres.zzzzzzzzzzzzzzzzzzzz:test-secret@aws-0-ap-southeast-1.pooler.supabase.com/postgres`]) {
      expect(() => kingboonDatabaseUrl({ KINGBOON_DATABASE_URL: url, KINGBOON_SUPABASE_PROJECT_REF: ref })).toThrow("does not match");
    }
  });
  it("never inherits a remote generic DATABASE_URL", () => {
    expect(() => kingboonDatabaseUrl({ DATABASE_URL: direct })).toThrow("not allowed");
    expect(() => kingboonDatabaseUrl({ DATABASE_URL: direct, NODE_ENV: "production" })).toThrow("not set");
  });
  it("keeps local development and existing local E2E configuration working", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      const url = `postgres://postgres@${host}:54322/boon`;
      expect(kingboonDatabaseUrl({ DATABASE_URL: url })).toBe(url);
    }
  });
  it("requires an explicit ref for remote use", () => {
    expect(() => kingboonDatabaseUrl({ KINGBOON_DATABASE_URL: direct })).toThrow("PROJECT_REF");
  });
  it("rejects hostname spoofing and incorrect protocols without leaking credentials", () => {
    for (const url of [direct.replace(".supabase.co", ".supabase.co.example.com"), direct.replace("postgresql:", "https:"), "bad:test-secret"] ) {
      try { kingboonDatabaseUrl({ KINGBOON_DATABASE_URL: url, KINGBOON_SUPABASE_PROJECT_REF: ref }); throw new Error("Expected rejection"); }
      catch (e) { expect(String(e)).not.toContain("test-secret"); expect(String(e)).not.toContain("Expected rejection"); }
    }
  });
  it("dedicated configuration wins over unrelated generic configuration", () => {
    expect(kingboonDatabaseUrl({ KINGBOON_DATABASE_URL: direct, KINGBOON_SUPABASE_PROJECT_REF: ref, DATABASE_URL: "postgres://unrelated/other" })).toBe(direct);
  });
});
