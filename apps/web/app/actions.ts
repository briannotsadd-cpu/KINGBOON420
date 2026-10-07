"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, normalizeEmail, requestLoginCode, signOut, verifyLoginCode } from "@/lib/auth";
import { asUser } from "@/lib/db";

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

const TEMPLE_FIELDS = ["name_th", "province", "address_th", "phone", "description_th"] as const;
function templeForm(fd: FormData) {
  const v = Object.fromEntries(TEMPLE_FIELDS.map((k) => [k, val(fd, k)])) as Record<(typeof TEMPLE_FIELDS)[number], string>;
  const fe: Record<string, string> = {};
  if (v.name_th.length < 2) fe.name_th = "กรุณากรอกชื่อวัด เช่น วัดพระศรีมหาธาตุ";
  if (v.name_th.length > 120) fe.name_th = "ชื่อวัดยาวเกินไป (ไม่เกิน 120 ตัวอักษร)";
  if (v.province.length < 2) fe.province = "กรุณากรอกจังหวัด เช่น นนทบุรี";
  if (v.phone && !/^[0-9+\-\s]{6,20}$/.test(v.phone)) fe.phone = "เบอร์โทรใช้ได้เฉพาะตัวเลข ตัวอย่าง: 02 123 4567";
  if (v.description_th.length > 1000) fe.description_th = "คำอธิบายยาวเกินไป (ไม่เกิน 1,000 ตัวอักษร)";
  return { v, fe };
}

export async function registerTempleAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const { v, fe } = templeForm(fd);
  if (Object.keys(fe).length) return { fieldErrors: fe, values: v };
  let id: string;
  try {
    id = await asUser(s.authUserId, async (c) => (await c.query<{ id: string }>(
      "select app.register_temple($1, $2, $3, $4, $5) as id", [v.name_th, v.province, v.address_th, v.phone, v.description_th])).rows[0].id);
  } catch (e) {
    logErr("registerTemple", e);
    if ((e as { code?: string }).code === "54000")
      return { error: "คุณมีวัดที่รออนุมัติอยู่ 3 วัดแล้ว กรุณารอให้ผู้ดูแลระบบตรวจสอบก่อน", values: v };
    return { error: NET_ERR, values: v };
  }
  revalidatePath("/me");
  redirect(`/me/temples/${id}?registered=1`);
}

export async function updateTempleAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const templeId = val(fd, "temple_id");
  const { v, fe } = templeForm(fd);
  const listed = fd.get("is_listed") === "on";
  const values = { ...v, is_listed: listed ? "on" : "" };
  if (Object.keys(fe).length) return { fieldErrors: fe, values };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.update_temple_profile($1, $2, $3, $4, $5, $6, $7)",
      [templeId, v.name_th, v.province, v.address_th, v.phone, v.description_th, listed]));
  } catch (e) {
    logErr("updateTemple", e);
    if ((e as { code?: string }).code === "42501") return { error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลวัดนี้", values };
    return { error: NET_ERR, values };
  }
  revalidatePath(`/me/temples/${templeId}`);
  return { ok: "บันทึกข้อมูลวัดเรียบร้อยแล้ว", values };
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
    return { error: NET_ERR, values: { note } };
  }
  revalidatePath("/admin");
  redirect(`/admin?done=${decision}`);
}
