import { describe, expect, it } from "vitest";
import {
  BUILDING_KINDS, CODE_RE, KIND_TH, countLabel, kindLabel, labelPoint, mapError, nodeCode, nodeKindLabel, normalizeCode, parseBuildingInput,
  parsePolygonText, parseZoneInput, readPolygon, serializePolygon, statusLabel, svgPoints, toMapPoint, validatePolygon, visLabel, ZONE_KIND_TH,
  type Pt,
} from "./map";

const base = { code: "main.sala.01", name_th: "ศาลาทดสอบ", kind: "SALA", status: "ACTIVE", visibility: "PUBLIC", polygon: "", source_note: "" };

describe("building code", () => {
  it("matches the DB pattern", () => {
    for (const ok of ["MAIN.SALA.01", "A1.B2", "AB-CD.EF-01.G", "X.Y.Z.W.V"]) expect(CODE_RE.test(ok), ok).toBe(true);
    for (const bad of ["MAIN", "main.sala", "MAIN..SALA", "MAIN.SALA.", ".A.B", "A B.C", "ศาลา.01", "A.B.C.D.E.F.G", "A--B.C"]) expect(CODE_RE.test(bad), bad).toBe(false);
  });
  it("normalizes case and spaces", () => expect(normalizeCode("  main.sala.01 ")).toBe("MAIN.SALA.01"));
});

describe("polygon", () => {
  const sq: Pt[] = [[100, 100], [300, 100], [300, 250], [100, 250]];
  it("empty means no position", () => {
    expect(validatePolygon(null)).toEqual({ ok: true, value: null });
    expect(validatePolygon([])).toEqual({ ok: true, value: null });
    expect(parsePolygonText("")).toEqual({ ok: true, value: null });
  });
  it("accepts 3..64 points inside 1600x1000 and rounds", () => {
    expect(validatePolygon(sq)).toEqual({ ok: true, value: sq });
    expect(validatePolygon([[0, 0], [1600, 0], [1600.4, 999.6]])).toEqual({ ok: true, value: [[0, 0], [1600, 0], [1600, 1000]] });
    expect(validatePolygon(Array.from({ length: 64 }, (_, i) => [i, i])).ok).toBe(true);
  });
  it("refuses too few, too many, out of range, malformed", () => {
    expect(validatePolygon([[1, 1], [2, 2]])).toMatchObject({ ok: false });
    expect(validatePolygon(Array.from({ length: 65 }, (_, i) => [i, i]))).toMatchObject({ ok: false });
    expect(validatePolygon([[0, 0], [1601, 0], [5, 5]])).toMatchObject({ ok: false });
    expect(validatePolygon([[0, 0], [5, -1], [5, 5]])).toMatchObject({ ok: false });
    expect(validatePolygon([[0, 0], [5], [5, 5]])).toMatchObject({ ok: false });
    expect(validatePolygon([[0, 0], ["1", 2], [5, 5]])).toMatchObject({ ok: false });
    expect(validatePolygon("x")).toMatchObject({ ok: false });
    expect(parsePolygonText("{not json")).toMatchObject({ ok: false });
  });
  it("serialises and round-trips", () => {
    expect(serializePolygon(null)).toBe("");
    expect(serializePolygon([])).toBe("");
    expect(parsePolygonText(serializePolygon(sq))).toEqual({ ok: true, value: sq });
    expect(svgPoints(sq)).toBe("100,100 300,100 300,250 100,250");
  });
  it("readPolygon never invents coordinates", () => {
    expect(readPolygon(null)).toBeNull();
    expect(readPolygon([[1, 2]])).toBeNull();
    expect(readPolygon(sq)).toEqual(sq);
  });
  it("label point and screen mapping", () => {
    expect(labelPoint(sq)).toEqual([200, 175]);
    expect(toMapPoint(200, 150, { left: 0, top: 0, width: 400, height: 250 })).toEqual([800, 600]);
    expect(toMapPoint(-50, 9999, { left: 0, top: 0, width: 400, height: 250 })).toEqual([0, 1000]);
  });
});

describe("labels", () => {
  it("every DB kind has a Thai label", () => {
    expect(BUILDING_KINDS).toHaveLength(16);
    for (const k of BUILDING_KINDS) expect(KIND_TH[k]).toMatch(/[฀-๿]/);
    expect(Object.keys(ZONE_KIND_TH)).toHaveLength(7);
    expect(kindLabel("PRANG")).toBe("พระปรางค์");
    expect(kindLabel("???")).toBe("ไม่ทราบประเภท");
    expect(statusLabel("UNDER_RENOVATION")).toBe("กำลังปรับปรุง");
    expect(visLabel("MONASTIC_ONLY")).toBe("เฉพาะพระ");
  });
  it("unknown counts are never 0", () => {
    expect(countLabel(null, "รายการ")).toBe("ไม่ทราบ");
    expect(countLabel(undefined, "รายการ")).toBe("ไม่ทราบ");
    expect(countLabel("3", "รายการ")).toBe("3 รายการ");
    expect(countLabel("0", "รายการ")).toBe("0 รายการ");
  });
  it("3D node names", () => {
    expect(nodeCode("ABC.PRANG.MAIN_LOD0")).toBe("ABC.PRANG.MAIN");
    expect(nodeCode("ABC.PRANG.MAIN")).toBe("ABC.PRANG.MAIN");
    expect(nodeKindLabel("ABC.PRANG.MAIN")).toBe("พระปรางค์");
    expect(nodeKindLabel("ABC.GROUND")).toBeNull();
  });
});

describe("parseBuildingInput", () => {
  it("accepts a valid new building, upper-casing the code", () => {
    expect(parseBuildingInput(base, true)).toMatchObject({ ok: true, value: { code: "MAIN.SALA.01", name: "ศาลาทดสอบ", polygon: null, note: null } });
  });
  it("code is only checked for new buildings (it is immutable afterwards)", () => {
    expect(parseBuildingInput({ ...base, code: "bad code" }, true)).toMatchObject({ ok: false, fieldErrors: { code: expect.any(String) } });
    expect(parseBuildingInput({ ...base, code: "bad code" }, false).ok).toBe(true);
  });
  it("collects every field error", () => {
    const r = parseBuildingInput({ code: "x", name_th: " a ", kind: "NOPE", status: "RETIRED", visibility: "ALL", polygon: "[[1,1],[2,2]]", source_note: "x".repeat(301) }, true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(["code", "kind", "name_th", "polygon", "source_note", "status", "visibility"]);
  });
});

describe("parseZoneInput", () => {
  it("validates", () => {
    expect(parseZoneInput({ building: "", code: "z.1", name_th: "ลาน", kind: "COURTYARD" })).toMatchObject({ ok: true, value: { code: "Z.1", building: null } });
    expect(parseZoneInput({ building: "", code: "z", name_th: "ล", kind: "X" })).toMatchObject({ ok: false });
  });
});

describe("mapError", () => {
  it("maps database errors to Thai", () => {
    expect(mapError({ code: "42501" }).error).toMatch(/ไม่มีสิทธิ์/);
    expect(mapError({ code: "23505" }).fieldErrors?.code).toMatch(/ถูกใช้แล้ว/);
    expect(mapError({ code: "23514", message: "polygon points must be [x,y] inside 1600x1000" }).fieldErrors?.polygon).toMatch(/1600/);
    expect(mapError({ code: "23514", constraint: "buildings_polygon2d_check", message: "violates check constraint" }).fieldErrors?.polygon).toMatch(/3-64/);
    expect(mapError({ code: "23514", constraint: "buildings_code_check", message: "violates" }).fieldErrors?.code).toMatch(/ตัวพิมพ์ใหญ่/);
    expect(mapError({ code: "23514", message: "code is immutable" }).fieldErrors?.code).toMatch(/แก้ไขไม่ได้/);
    expect(mapError({ code: "P0002" }).error).toMatch(/ไม่พบ/);
    expect(mapError({ code: "XX000" }).error).toMatch(/ข้อมูลที่กรอกยังอยู่/);
  });
});
