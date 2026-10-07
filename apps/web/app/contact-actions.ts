"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { asAnon, asUser, templePublic } from "@/lib/db";
import { parseContact, validReply } from "@/lib/contact";
import { ipHash } from "@/lib/contact-ip";
import { isFollowing, publicTempleId } from "@/components/contact/queries";

export type ContactState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string };
const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const raw = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const code = (e: unknown) => (e as { code?: string }).code;
const NET_ERR = "ตอนนี้ส่งข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองกดอีกครั้ง";

function pepper(): string {
  const p = process.env.AUTH_PEPPER;
  if (p && p.length >= 16) return p;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_PEPPER (16+ chars) must be set in production");
  return "dev-only-pepper-not-for-production";
}

export async function submitContactAction(_: ContactState, fd: FormData): Promise<ContactState> {
  const slug = val(fd, "slug");
  const values = { topic: val(fd, "topic"), message: raw(fd, "message"), name: raw(fd, "name"), phone: raw(fd, "phone") };
  const p = parseContact(values);
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  let ref: string;
  try {
    const hash = ipHash((await headers()).get("x-forwarded-for"), pepper());
    const s = await getSession();
    const args = [slug, p.value.topic, p.value.message, p.value.name || null, p.value.phone || null, hash];
    const run = (c: import("pg").PoolClient) => c.query<{ r: string }>("select app.submit_temple_contact($1, $2, $3, $4, $5, $6) as r", args);
    ref = (await (s ? asUser(s.authUserId, run) : asAnon(run))).rows[0].r;
  } catch (e) {
    console.error("[action:submitContact]", e);
    if (code(e) === "54000") return { error: "ส่งหลายครั้งเกินไป กรุณารอ 1 ชั่วโมงแล้วลองใหม่ หรือโทรหาวัดโดยตรง", values };
    if (code(e) === "55000") return { error: "ตอนนี้วัดนี้ยังไม่เปิดรับข้อความทางระบบ กรุณากลับไปหน้าวัด หรือโทรหาวัดโดยตรง", values };
    if (code(e) === "23514") return { error: "ข้อมูลบางส่วนไม่ผ่านการตรวจสอบ กรุณาตรวจสอบข้อความและเบอร์โทรแล้วลองอีกครั้ง", values };
    return { error: NET_ERR, values };
  }
  redirect(`/t/${encodeURIComponent(slug)}/contact/sent?ref=${encodeURIComponent(ref)}`);
}

/** Staff inbox operations: op = assign | reply | close. All authority is in app.contact_update (needs contact_inbox.manage T). */
export async function contactOpAction(_: ContactState, fd: FormData): Promise<ContactState> {
  const s = await getSession(); if (!s) redirect("/login");
  const thread = val(fd, "thread_id"), temple = val(fd, "temple_id"), op = val(fd, "op"), text = raw(fd, "reply");
  const values = { reply: text };
  if (!["assign", "reply", "close"].includes(op) || !/^[0-9a-f-]{36}$/.test(thread) || !/^[0-9a-f-]{36}$/.test(temple)) return { error: "คำสั่งไม่ถูกต้อง กรุณาโหลดหน้านี้ใหม่" };
  if (op === "reply") { const m = validReply(text); if (m) return { fieldErrors: { reply: m }, values }; }
  try {
    await asUser(s.authUserId, (c) => c.query("select app.contact_update($1, $2, $3, $4)", [thread, temple, op, op === "reply" ? text.trim() : null]));
  } catch (e) {
    console.error("[action:contactOp]", e);
    if (code(e) === "42501") return { error: "คุณไม่มีสิทธิ์จัดการกล่องข้อความของวัดนี้", values };
    if (code(e) === "23514") return { error: "เรื่องนี้เปลี่ยนสถานะไปแล้ว (อาจมีเจ้าหน้าที่คนอื่นดำเนินการ) กรุณาโหลดหน้านี้ใหม่", values };
    if (code(e) === "P0002") return { error: "ไม่พบข้อความนี้ กรุณาโหลดหน้านี้ใหม่", values };
    return { error: NET_ERR, values };
  }
  return { ok: { assign: "รับเรื่องแล้ว", reply: "ส่งคำตอบแล้ว ผู้ส่งที่เข้าสู่ระบบจะเห็นคำตอบในหน้าข้อความของฉัน", close: "ปิดเรื่องแล้ว" }[op] };
}

/** op = follow | leave. Uses app.join_temple_community / app.leave_temple_community; the DB's refusal is shown as is. */
export async function followAction(_: ContactState, fd: FormData): Promise<ContactState> {
  const slug = val(fd, "slug"), op = val(fd, "op");
  const s = await getSession(); if (!s) redirect("/login");
  if (op !== "follow" && op !== "leave") return { error: "คำสั่งไม่ถูกต้อง กรุณาโหลดหน้านี้ใหม่" };
  try {
    if (!(await templePublic(slug))) return { error: "วัดนี้ยังไม่เปิดให้ติดตาม เพราะข้อมูลวัดยังตรวจสอบไม่ครบ" };
    const id = await publicTempleId(slug);
    if (!id) return { error: "วัดนี้ยังไม่เปิดให้ติดตาม เพราะข้อมูลวัดยังตรวจสอบไม่ครบ" };
    await asUser(s.authUserId, (c) => c.query(op === "follow" ? "select app.join_temple_community($1)" : "select app.leave_temple_community($1)", [id]));
    const now = await isFollowing(s.authUserId, id);
    if (op === "follow" && !now) return { error: "ติดตามวัดนี้ไม่ได้ในตอนนี้ กรุณาติดต่อเจ้าหน้าที่วัด" };
    return { ok: op === "follow" ? "ติดตามวัดแล้ว" : "เลิกติดตามวัดแล้ว" };
  } catch (e) {
    console.error("[action:follow]", e);
    if (code(e) === "55000" && op === "leave") return { error: "เลิกติดตามเองไม่ได้ เพราะคุณมีบทบาทอื่นในวัดนี้ด้วย (เช่น เจ้าหน้าที่หรือกรรมการ) กรุณาติดต่อผู้ดูแลวัดถ้าต้องการเปลี่ยน" };
    if (code(e) === "55000") return { error: "ติดตามไม่ได้: วัดนี้ยังไม่เปิดให้ติดตาม หรือสมาชิกภาพของคุณในวัดนี้ถูกระงับ กรุณาติดต่อเจ้าหน้าที่วัด" };
    if (code(e) === "42501") return { error: "กรุณาเข้าสู่ระบบก่อนติดตามวัด" };
    return { error: NET_ERR };
  }
}
