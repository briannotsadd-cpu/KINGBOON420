"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, normalizeEmail, requestLoginCode, signOut, verifyLoginCode } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { DONE_TH, parseFieldInput, SOURCE_TYPES } from "@/lib/verification";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string };
const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const logErr = (where: string, e: unknown) => console.error(`[action:${where}]`, e);
const NET_ERR = "ตอนนี้บันทึกข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองกดอีกครั้ง";

export async function requestCodeAction(_: FormState, fd: FormData): Promise<FormState> {
  const raw = val(fd, "email");
  const email = normalizeEmail(raw);
  if (!email) return { fieldErrors: { email: "อีเมลไม่ถูกต้อง ตัวอย่างที่ถูก: somchai@gmail.com" }, values: { email: raw } };
  let target: string;
  try {
    const r = await requestLoginCode(email);
    if (!r.ok) return { error: "ขอรหัสบ่อยเกินไป กรุณารอประมาณ 1 ชั่วโมงแล้วลองใหม่", values: { email: raw } };
    if (r.mail.sent) target = `/login/code?email=${encodeURIComponent(email)}`;
    else if (r.mail.reason === "not_configured" && r.mail.devLogged) target = `/login/code?email=${encodeURIComponent(email)}&dev=1`;
    else if (r.mail.reason === "not_configured")
      return { error: "ระบบยังส่งอีเมลไม่ได้ เพราะผู้ดูแลระบบยังไม่ได้ตั้งค่าการส่งอีเมล กรุณาติดต่อผู้ดูแลระบบ", values: { email: raw } };
    else return { error: "ส่งอีเมลไม่สำเร็จ กรุณาลองกดอีกครั้งในอีกสักครู่", values: { email: raw } };
  } catch (e) { logErr("requestCode", e); return { error: NET_ERR, values: { email: raw } }; }
  redirect(target);
}

export async function verifyCodeAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(val(fd, "email"));
  const code = val(fd, "code").replace(/\D/g, "");
  if (!email) return { error: "ไม่พบอีเมล กรุณากลับไปกรอกอีเมลใหม่" };
  if (code.length !== 6) return { fieldErrors: { code: "รหัสต้องเป็นตัวเลข 6 หลัก" }, values: { code } };
  let next: string;
  try {
    const r = await verifyLoginCode(email, code);
    if (!r.ok) {
      const msg = { invalid: "รหัสไม่ถูกต้อง กรุณาตรวจสอบตัวเลขในอีเมลแล้วลองใหม่",
        expired: "รหัสหมดอายุแล้ว (ใช้ได้ 10 นาที) กรุณากด \"ขอรหัสใหม่\"",
        too_many: "กรอกผิดหลายครั้งเกินไป กรุณากด \"ขอรหัสใหม่\"" }[r.error];
      return { fieldErrors: { code: msg }, values: { code } };
    }
    next = r.isNewUser ? "/welcome" : "/me";
  } catch (e) { logErr("verifyCode", e); return { error: NET_ERR, values: { code } }; }
  redirect(next);
}

export async function saveNameAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const name = val(fd, "name");
  if (name.length < 2 || name.length > 60) return { fieldErrors: { name: "กรุณากรอกชื่อ 2–60 ตัวอักษร" }, values: { name } };
  try { await asUser(s.authUserId, (c) => c.query("update public.persons set display_name = $1 where id = app.current_person_id()", [name])); }
  catch (e) { logErr("saveName", e); return { error: NET_ERR, values: { name } }; }
  redirect("/me");
}

export async function signOutAction() { await signOut(); redirect("/"); }

const REL = ["abbot", "assistant_abbot", "monk_secretary", "waiyawatchakon", "temple_committee", "temple_staff"];
const errCode = (e: unknown) => (e as { code?: string }).code;

export async function registerTempleAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const v = Object.fromEntries(["name_th", "province", "address_th", "phone", "relationship", "registry_number", "evidence"]
    .map((k) => [k, val(fd, k)])) as Record<string, string>;
  const fe: Record<string, string> = {};
  if (v.name_th.length < 2) fe.name_th = "กรุณากรอกชื่อวัดตามทะเบียนวัด เช่น วัดพระศรีมหาธาตุ";
  if (v.province.length < 2) fe.province = "กรุณากรอกจังหวัด เช่น นนทบุรี";
  if (v.phone && !/^[0-9+\-\s]{6,20}$/.test(v.phone)) fe.phone = "เบอร์โทรใช้ได้เฉพาะตัวเลข ตัวอย่าง: 02 123 4567";
  if (!REL.includes(v.relationship)) fe.relationship = "กรุณาเลือกว่าคุณเกี่ยวข้องกับวัดอย่างไร";
  if (v.evidence.length < 10) fe.evidence = "กรุณาอธิบายหลักฐาน อย่างน้อย 10 ตัวอักษร เช่น หนังสือมอบหมายจากเจ้าอาวาส ลงวันที่ ...";
  if (Object.keys(fe).length) return { fieldErrors: fe, values: v };
  let id: string;
  try {
    id = await asUser(s.authUserId, async (c) => (await c.query<{ id: string }>(
      "select app.register_temple($1, $2, $3, $4, null, $5, $6, $7) as id",
      [v.name_th, v.province, v.address_th, v.phone, v.relationship, v.registry_number, v.evidence])).rows[0].id);
  } catch (e) {
    logErr("registerTemple", e);
    if (errCode(e) === "54000") return { error: "คุณมีใบสมัครที่รอตรวจอยู่ 3 วัดแล้ว กรุณารอผู้ดูแลระบบตรวจก่อน", values: v };
    return { error: NET_ERR, values: v };
  }
  revalidatePath("/me");
  redirect(`/me/temples/${id}?registered=1`);
}

export async function setListedAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const templeId = val(fd, "temple_id"), listed = fd.get("listed") === "1";
  try { await asUser(s.authUserId, (c) => c.query("select app.set_temple_listed($1, $2)", [templeId, listed])); }
  catch (e) { logErr("setListed", e); return { error: errCode(e) === "42501" ? "คุณไม่มีสิทธิ์ตั้งค่านี้" : NET_ERR }; }
  return { ok: listed ? "เปิดให้คนทั่วไปค้นหาแล้ว (จะเห็นได้เมื่อวัดผ่านการตรวจสอบครบ)" : "ปิดการค้นหาแล้ว" };
}

export async function recordFieldAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const v = Object.fromEntries(["temple_id", "field_key", "value", "source_type", "source_url", "source_document", "source_date", "evidence", "back"]
    .map((k) => [k, val(fd, k)])) as Record<string, string>;
  const fe: Record<string, string> = {};
  const parsed = parseFieldInput(v.field_key, v.value);
  if (parsed === null) fe.value = v.field_key === "temple.geo"
    ? "กรุณากรอกพิกัดเป็น ละติจูด, ลองจิจูด ในประเทศไทย ตัวอย่าง: 13.7563, 100.5018" : "กรุณากรอกข้อมูล (ไม่เกิน 2,000 ตัวอักษร)";
  const st = SOURCE_TYPES.find((t) => t.value === v.source_type);
  if (!st) fe.source_type = "กรุณาเลือกแหล่งที่มาของข้อมูล";
  if (st && v.source_type !== "temple_admin_entry" && !v.source_url && !v.source_document)
    fe.source_url = "กรุณาใส่ลิงก์ หรือชื่อเอกสารที่ใช้อ้างอิง เพื่อให้ตรวจย้อนกลับได้";
  if (v.source_url && !/^https?:\/\/\S+$/.test(v.source_url)) fe.source_url = "ลิงก์ต้องขึ้นต้นด้วย https:// ตัวอย่าง: https://www.example.or.th";
  if (v.source_date && !/^\d{4}-\d{2}-\d{2}$/.test(v.source_date)) fe.source_date = "กรุณาเลือกวันที่จากปฏิทิน";
  if (Object.keys(fe).length) return { fieldErrors: fe, values: v };
  try {
    await asUser(s.authUserId, (c) => c.query(
      "select app.record_field_value($1, $2, $3::jsonb, $4, $5, $6, $7, $8::date, $9, false)",
      [v.temple_id, v.field_key, JSON.stringify(parsed), v.source_type, st!.label, v.source_url || null, v.source_document || null,
       v.source_date || null, v.evidence || null]));
  } catch (e) {
    logErr("recordField", e);
    return { error: errCode(e) === "42501" ? "คุณไม่มีสิทธิ์บันทึกข้อมูลของวัดนี้" : NET_ERR, values: v };
  }
  return { ok: DONE_TH[st!.tier === 3 ? "recorded_tier3" : "recorded"] };
}

const OPS: Record<string, { sql: string; to?: string; ok: string; needsReason?: boolean }> = {
  confirm: { sql: "advance", to: "TEMPLE_CONFIRMED", ok: "ยืนยันข้อมูลเรียบร้อยแล้ว" },
  send: { sql: "advance", to: "WAITING_TEMPLE_CONFIRMATION", ok: "ส่งให้วัดยืนยันแล้ว" },
  verify_source: { sql: "advance", to: "SOURCE_VERIFIED", ok: "บันทึกว่าตรวจหลักฐานแล้ว" },
  cross_check: { sql: "advance", to: "CROSS_CHECKED", ok: "บันทึกว่าตรวจเทียบหลายแหล่งแล้ว" },
  reject: { sql: "advance", to: "REJECTED", ok: "บันทึกว่าข้อมูลนี้ไม่ถูกต้องแล้ว", needsReason: true },
  outdated: { sql: "advance", to: "OUTDATED", ok: "บันทึกว่าข้อมูลนี้เก่าแล้ว", needsReason: true },
  reconfirm: { sql: "reconfirm", ok: "ยืนยันซ้ำเรียบร้อยแล้ว นับอายุการตรวจสอบใหม่" },
  resolve: { sql: "resolve", ok: "เลือกข้อมูลนี้แล้ว ข้อมูลอื่นถูกยกเลิก กรุณากดยืนยันอีกครั้ง", needsReason: true },
};

export async function fieldOpAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const opKey = val(fd, "op"), op = OPS[opKey], id = val(fd, "value_id"), reason = val(fd, "reason"), back = val(fd, "back");
  let firstApproval = false;
  if (!op) return { error: "คำสั่งไม่ถูกต้อง" };
  if (op.needsReason && reason.length < 3) return { fieldErrors: { reason: "กรุณาบอกเหตุผล เช่น เบอร์นี้ยกเลิกแล้ว" }, values: { reason } };
  try {
    firstApproval = await asUser(s.authUserId, async (c) => {
      if (op.sql === "advance") await c.query("select app.advance_field_value($1, $2, $3)", [id, op.to, reason || null]);
      else if (op.sql === "reconfirm") await c.query("select app.reconfirm_field_value($1)", [id]);
      else await c.query("select app.resolve_conflict($1, $2)", [id, reason]);
      if (opKey !== "confirm") return false;
      return (await c.query<{ st: string }>("select status as st from public.temple_field_values where id = $1", [id])).rows[0]?.st === "WAITING_TEMPLE_CONFIRMATION";
    });
  } catch (e) {
    logErr("fieldOp", e);
    const m = (e as Error).message ?? "";
    const msg = m.includes("different person") ? "การยืนยันขั้นที่ 2 ต้องเป็นคนละคนกับขั้นที่ 1"
      : m.includes("must be the abbot") ? "ข้อมูลนี้ต้องให้เจ้าอาวาสยืนยันเป็นขั้นที่ 2"
      : m.includes("only the temple") ? "ข้อมูลนี้ต้องให้วัดเป็นผู้ยืนยันเอง"
      : m.includes("AI-assisted") ? "ข้อมูลที่ AI ช่วยหา ยืนยันไม่ได้ กรุณาบันทึกใหม่จากแหล่งข้อมูลจริง"
      : m.includes("not allowed") && m.includes("transition") ? "ยังทำขั้นนี้ไม่ได้ ต้องผ่านขั้นก่อนหน้าก่อน"
      : errCode(e) === "42501" ? "คุณไม่มีสิทธิ์ทำรายการนี้" : NET_ERR;
    return { error: msg, values: { reason } };
  }
  return { ok: DONE_TH[firstApproval ? "first_approval" : opKey] };
}

export async function reviewTempleAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const id = val(fd, "temple_id"), decision = val(fd, "decision"), note = val(fd, "note");
  if (decision === "rejected" && note.length < 3) return { fieldErrors: { note: "กรุณาบอกเหตุผลที่ไม่อนุมัติ เพื่อให้ผู้สมัครแก้ไขได้" }, values: { note } };
  try { await asUser(s.authUserId, (c) => c.query("select app.review_temple($1, $2, $3)", [id, decision, note])); }
  catch (e) {
    logErr("reviewTemple", e);
    const code = (e as { code?: string }).code;
    if (code === "42501") return { error: "คุณไม่มีสิทธิ์อนุมัติวัด" };
    if (code === "P0002") return { error: "วัดนี้ถูกตรวจสอบไปแล้ว" };
    if (code === "55000") return { error: "ยังอนุมัติไม่ได้: ต้องบันทึกหลักฐานจากทะเบียนวัด (สำนักงานพระพุทธศาสนาแห่งชาติ) และกด \"ตรวจหลักฐานแล้ว\" ก่อน" };
    return { error: NET_ERR, values: { note } };
  }
  revalidatePath("/admin");
  redirect(`/admin?done=${decision}`);
}
