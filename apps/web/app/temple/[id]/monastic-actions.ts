"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import {
  availabilityError, invitationError, respondError, parseAvailability, parseInvitation, parseOtherUnavailable, parseRiteType,
  NET_ERR, OP_OK, RESPOND_OK, type InvitationInput,
} from "@/lib/monastic";

// Every write goes through a DB function that decides authority (RLS + SECURITY DEFINER checks). Nothing here guesses roles.
export type MonasticState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string };
const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const raw = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const UUID = /^[0-9a-f-]{36}$/;
const BAD: MonasticState = { error: "คำสั่งไม่ถูกต้อง กรุณาโหลดหน้านี้ใหม่" };
const pgc = (e: unknown) => e as { code?: string; message?: string };

async function session() { const s = await getSession(); if (!s) redirect("/login"); return s; }

/** My own availability. valid_until is REQUIRED (the form prefills the end of today, Asia/Bangkok). */
export async function setMyAvailabilityAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id");
  const values = { state: val(fd, "state"), valid_until: val(fd, "valid_until"), reason: val(fd, "reason") };
  if (!UUID.test(temple)) return BAD;
  const p = parseAvailability(values, new Date());
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.set_availability($1, $2, $3, null, $4::timestamptz, $5)",
      [temple, s.personId, p.value.state, p.value.untilIso, p.value.reason]));
  } catch (e) { console.error("[action:setMyAvailability]", e); return { error: availabilityError(pgc(e)), values }; }
  return { ok: "บันทึกสถานะแล้ว", values };
}

export async function checkInAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id");
  if (!UUID.test(temple)) return BAD;
  try { await asUser(s.authUserId, (c) => c.query("select app.check_in($1)", [temple])); }
  catch (e) { console.error("[action:checkIn]", e); return { error: availabilityError(pgc(e)) }; }
  return { ok: "เช็คอินเข้าวัดแล้ว" };
}

/** Secretary / abbot: set ANOTHER monk to UNAVAILABLE (the DB refuses every other state for others). End date required, max 120 days. */
export async function setOtherUnavailableAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id");
  const values = { person_id: val(fd, "person_id"), end_date: val(fd, "end_date"), reason: val(fd, "reason") };
  if (!UUID.test(temple)) return BAD;
  const p = parseOtherUnavailable(values, new Date());
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.set_availability($1, $2, 'UNAVAILABLE', null, $3::timestamptz, $4)",
      [temple, p.value.personId, p.value.untilIso, p.value.reason]));
  } catch (e) { console.error("[action:setOtherUnavailable]", e); return { error: availabilityError(pgc(e)), values }; }
  return { ok: "ตั้งสถานะ ไม่ว่าง แล้ว", values: { reason: values.reason } };
}

export async function clearAvailabilityAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id"), row = val(fd, "row_id");
  if (!UUID.test(temple) || !UUID.test(row)) return BAD;
  try { await asUser(s.authUserId, (c) => c.query("select app.clear_availability($1, $2)", [temple, row])); }
  catch (e) { console.error("[action:clearAvailability]", e); return { error: availabilityError(pgc(e)) }; }
  return { ok: "ยกเลิกการตั้งสถานะแล้ว" };
}

export async function respondAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id"), inv = val(fd, "inv_id"), resp = val(fd, "response");
  if (!UUID.test(temple) || !UUID.test(inv) || !(resp in RESPOND_OK)) return BAD;
  try { await asUser(s.authUserId, (c) => c.query("select app.invitation_respond($1, $2, $3)", [temple, inv, resp])); }
  catch (e) { console.error("[action:respond]", e); return { error: respondError(pgc(e)) }; }
  return { ok: RESPOND_OK[resp] };
}

export async function saveRiteTypeAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id");
  const values = { rite_name: raw(fd, "rite_name"), rite_duration: val(fd, "rite_duration"), requires_lead: fd.get("requires_lead") ? "1" : "" };
  if (!UUID.test(temple)) return BAD;
  const p = parseRiteType({ name: values.rite_name, duration: values.rite_duration, requires_lead: !!values.requires_lead });
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.save_rite_type($1, $2, true, $3, $4)", [temple, p.value.name, p.value.requiresLead, p.value.duration]));
  } catch (e) {
    console.error("[action:saveRiteType]", e);
    return { error: pgc(e).code === "42501" ? "คุณไม่มีสิทธิ์เพิ่มประเภทพิธี กรุณาติดต่อเลขาฯ" : NET_ERR, values };
  }
  return { ok: `เพิ่มประเภทพิธี "${p.value.name}" แล้ว เลือกได้ในช่องประเภทพิธีของแบบฟอร์มด้านล่าง` };
}

const INV_FIELDS = ["host_name", "host_phone", "host_relation", "rite", "venue", "date", "time", "duration", "monks", "transport", "travel_out", "travel_back", "via", "note"] as const;
export async function createInvitationAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id");
  const values = Object.fromEntries(INV_FIELDS.map((k) => [k, raw(fd, k)])) as unknown as InvitationInput & Record<string, string>;
  if (!UUID.test(temple)) return BAD;
  const p = parseInvitation(values, new Date());
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  const v = p.value;
  let id: string;
  try {
    id = (await asUser(s.authUserId, (c) => c.query<{ id: string }>(
      "select app.create_invitation($1, $2, $3, $4, $5, $6, $7::timestamptz, $8, $9, $10, $11, $12, $13, $14) as id",
      [temple, v.hostName, v.hostPhone, v.hostRelation, v.rite, v.venue, v.startsIso, v.duration, v.monks, v.transport, v.out, v.back, v.via, v.note]))).rows[0].id;
  } catch (e) {
    console.error("[action:createInvitation]", e);
    const x = pgc(e);
    if (x.code === "42501") return { error: "คุณไม่มีสิทธิ์รับกิจนิมนต์ กรุณาติดต่อเลขาฯ หรือเจ้าอาวาส", values };
    if (x.code === "23503") return { error: "ไม่พบประเภทพิธีที่เลือก กรุณาเลือกใหม่", values };
    return { error: invitationError(x), values };
  }
  redirect(`/temple/${temple}/invitations/${id}`);
}

const OPS = ["start_review", "propose_team", "revise_team", "confirm", "decline", "cancel", "start", "complete"];
/** One entry point for every transition: app.invitation_transition. The DB decides who may (manage vs confirm) and checks the version. */
export async function invitationOpAction(_: MonasticState, fd: FormData): Promise<MonasticState> {
  const s = await session();
  const temple = val(fd, "temple_id"), inv = val(fd, "inv_id"), op = val(fd, "op"), version = Number(val(fd, "version"));
  const team = fd.getAll("team").map(String).filter((x) => UUID.test(x));
  const values = { team: team.join(","), lead: val(fd, "lead"), reason_code: val(fd, "reason_code"), cancel_reason: raw(fd, "cancel_reason"), ack: fd.get("ack") ? "1" : "" };
  if (!UUID.test(temple) || !UUID.test(inv) || !OPS.includes(op) || !Number.isInteger(version)) return BAD;
  if (op === "decline" && !values.reason_code) return { fieldErrors: { reason_code: "กรุณาเลือกเหตุผลที่ไม่รับกิจนิมนต์" }, values };
  if (op === "cancel" && !values.cancel_reason.trim()) return { fieldErrors: { cancel_reason: "กรุณาพิมพ์เหตุผลที่ยกเลิก" }, values };
  if (op === "propose_team" && team.length === 0) return { fieldErrors: { team: "กรุณาเลือกพระอย่างน้อย 1 รูปจากรายชื่อด้านบน" }, values };
  const reason = op === "decline" ? values.reason_code : op === "cancel" ? values.cancel_reason.trim() : null;
  const lead = op === "propose_team" && UUID.test(values.lead) ? values.lead : null;
  try {
    await asUser(s.authUserId, (c) => c.query("select app.invitation_transition($1, $2, $3, $4, $5::uuid[], $6::uuid, $7, $8)",
      [temple, inv, version, op, op === "propose_team" ? team : null, lead, reason, op === "confirm" && !!values.ack]));
  } catch (e) {
    console.error("[action:invitationOp]", op, e);
    return { error: invitationError(pgc(e), op), values };
  }
  return { ok: OP_OK[op], values: {} };
}
