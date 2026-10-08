"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { mapError, parseBuildingInput, parseZoneInput, serializePolygon } from "@/lib/map";

// Every write goes through a DB function that decides authority (asset.manage / temple.settings). Nothing here guesses roles.
export type MapState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string; created?: boolean };
const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const raw = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const UUID = /^[0-9a-f-]{36}$/;
const BAD: MapState = { error: "คำสั่งไม่ถูกต้อง กรุณาโหลดหน้านี้ใหม่" };
const pgc = (e: unknown) => e as { code?: string; message?: string; constraint?: string };

async function session() { const s = await getSession(); if (!s) redirect("/login"); return s; }

/** Create (no building_id) or edit (building_id given; the code is never sent: it is immutable). */
export async function saveBuildingAction(_: MapState, fd: FormData): Promise<MapState> {
  const s = await session();
  const temple = val(fd, "temple_id"), id = val(fd, "building_id");
  const values = { code: val(fd, "code"), name_th: raw(fd, "name_th"), kind: val(fd, "kind"), status: val(fd, "status"), visibility: val(fd, "visibility"),
    polygon: raw(fd, "polygon"), source_note: raw(fd, "source_note") };
  if (!UUID.test(temple) || (id && !UUID.test(id))) return BAD;
  const p = parseBuildingInput(values, !id);
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  const v = p.value;
  try {
    await asUser(s.authUserId, (c) => c.query("select app.save_building($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)",
      [temple, id || null, id ? "" : v.code, v.name, v.kind, v.status, v.visibility, serializePolygon(v.polygon) || null, v.note]));
  } catch (e) {
    console.error("[action:saveBuilding]", e);
    return { ...mapError(pgc(e)), values };
  }
  return id ? { ok: "บันทึกแล้ว ถ้าอาคารนี้เคยยืนยันแล้ว ต้องให้วัดยืนยันใหม่", values } : { ok: `เพิ่มอาคาร ${v.code} แล้ว ตอนนี้รอวัดยืนยัน`, created: true };
}

/** Only the temple (temple.settings) may confirm; the DB refuses everyone else with 42501. */
export async function confirmBuildingAction(_: MapState, fd: FormData): Promise<MapState> {
  const s = await session();
  const temple = val(fd, "temple_id"), id = val(fd, "building_id");
  if (!UUID.test(temple) || !UUID.test(id)) return BAD;
  try { await asUser(s.authUserId, (c) => c.query("select app.confirm_building($1, $2)", [temple, id])); }
  catch (e) { console.error("[action:confirmBuilding]", e); return mapError(pgc(e)); }
  return { ok: "ยืนยันข้อมูลอาคารแล้ว" };
}

export async function saveZoneAction(_: MapState, fd: FormData): Promise<MapState> {
  const s = await session();
  const temple = val(fd, "temple_id");
  const values = { building: val(fd, "building"), code: val(fd, "code"), name_th: raw(fd, "name_th"), kind: val(fd, "kind") };
  if (!UUID.test(temple) || (values.building && !UUID.test(values.building))) return BAD;
  const p = parseZoneInput(values);
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.save_zone($1, $2, $3, $4, $5)",
      [temple, p.value.building, p.value.code, p.value.name, p.value.kind]));
  } catch (e) {
    console.error("[action:saveZone]", e);
    return { ...mapError(pgc(e)), values };
  }
  return { ok: `เพิ่มโซน ${p.value.code} แล้ว`, created: true };
}
