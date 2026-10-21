"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { parkingError, parseLotInput, parseReportInput } from "@/lib/parking-staff";

// Every write goes through a DB function that decides authority (parking.report / parking.manage / temple.settings).
export type ParkingState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string; created?: boolean };
const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const raw = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const UUID = /^[0-9a-f-]{36}$/;
const BAD: ParkingState = { error: "คำสั่งไม่ถูกต้อง กรุณาโหลดหน้านี้ใหม่" };
const pgc = (e: unknown) => e as { code?: string; message?: string };

async function session() { const s = await getSession(); if (!s) redirect("/login"); return s; }

/** One report = one tap on a status (+ optional count and note). Capacity is read back from the DB, never trusted from the form. */
export async function reportParkingAction(_: ParkingState, fd: FormData): Promise<ParkingState> {
  const s = await session();
  const temple = val(fd, "temple_id"), lot = val(fd, "lot_id");
  const values = { lot_id: lot, status: val(fd, "status"), free: raw(fd, "free"), note: raw(fd, "note") };
  if (!UUID.test(temple) || !UUID.test(lot)) return { ...BAD, values };
  try {
    return await asUser(s.authUserId, async (c) => {
      const cap = (await c.query<{ capacity: number | null; name_th: string }>(
        "select capacity, name_th from public.parking_lots where temple_id = $1 and id = $2", [temple, lot])).rows[0];
      if (!cap) return { error: "ไม่พบลานจอดนี้ กรุณาโหลดหน้านี้ใหม่", values };
      const p = parseReportInput(values, cap.capacity);
      if (!p.ok) return { fieldErrors: p.fieldErrors, values };
      await c.query("select app.report_parking_status($1, $2, $3, $4, $5)", [temple, lot, p.value.status, p.value.free, p.value.note]);
      return { ok: `ส่งสถานะ ${cap.name_th} แล้ว ผู้มาวัดจะเห็นสถานะนี้ทันที`, values: { lot_id: lot } };
    });
  } catch (e) {
    console.error("[action:reportParking]", e);
    return { ...parkingError(pgc(e)), values };
  }
}

/** Create (no lot_id) or edit (lot_id given; the code is never sent on edit: it is immutable). */
export async function saveLotAction(_: ParkingState, fd: FormData): Promise<ParkingState> {
  const s = await session();
  const temple = val(fd, "temple_id"), id = val(fd, "lot_id");
  const vehicles = fd.getAll("vehicles").map(String);
  const values = { code: val(fd, "code"), name_th: raw(fd, "name_th"), capacity: raw(fd, "capacity"), accessible: raw(fd, "accessible"),
    fee: raw(fd, "fee"), hours: raw(fd, "hours"), is_public: val(fd, "is_public"), active: val(fd, "active"), stale: raw(fd, "stale") };
  const kept = { ...values, vehicles: vehicles.join(",") };
  if (!UUID.test(temple) || (id && !UUID.test(id))) return BAD;
  const p = parseLotInput({ ...values, vehicles }, !id);
  if (!p.ok) return { fieldErrors: p.fieldErrors, values: kept };
  const v = p.value;
  try {
    await asUser(s.authUserId, (c) => c.query("select app.save_parking_lot($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10, $11, $12)",
      [temple, id || null, id ? null : v.code, v.name, v.capacity, v.accessible, v.vehicles, v.fee, v.hours, v.isPublic, v.active, v.stale]));
  } catch (e) {
    console.error("[action:saveLot]", e);
    return { ...parkingError(pgc(e)), values: kept };
  }
  return id ? { ok: "บันทึกแล้ว ถ้าแก้ข้อมูลที่ผู้มาวัดเห็น ต้องให้วัดยืนยันใหม่ก่อนจะแสดงต่อสาธารณะ", values: kept }
    : { ok: `เพิ่มลาน ${v.code} แล้ว ขั้นต่อไป: ให้เจ้าอาวาสหรือผู้ดูแลวัดกดยืนยัน`, created: true };
}

/** Only the temple (temple.settings) may confirm; the DB refuses everyone else with 42501. */
export async function confirmLotAction(_: ParkingState, fd: FormData): Promise<ParkingState> {
  const s = await session();
  const temple = val(fd, "temple_id"), id = val(fd, "lot_id");
  if (!UUID.test(temple) || !UUID.test(id)) return BAD;
  try { await asUser(s.authUserId, (c) => c.query("select app.confirm_parking_lot($1, $2)", [temple, id])); }
  catch (e) { console.error("[action:confirmLot]", e); return parkingError(pgc(e)); }
  return { ok: "ยืนยันข้อมูลลานจอดแล้ว" };
}

export async function setDeclaredAction(_: ParkingState, fd: FormData): Promise<ParkingState> {
  const s = await session();
  const temple = val(fd, "temple_id"), declared = val(fd, "declared");
  if (!UUID.test(temple) || !["unknown", "none", "lots"].includes(declared)) return BAD;
  try { await asUser(s.authUserId, (c) => c.query("select app.set_parking_declared($1, $2)", [temple, declared])); }
  catch (e) { console.error("[action:setDeclared]", e); return { ...parkingError(pgc(e)), values: { declared } }; }
  return { ok: "บันทึกการตั้งค่าที่จอดรถของวัดแล้ว", values: { declared } };
}
