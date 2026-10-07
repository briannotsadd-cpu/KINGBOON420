"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { chatErrorTh, isUuid, REPORT_REASON_VALUES, validateBody } from "@/lib/chat";
import { startCallErrorTh } from "@/lib/webrtc";

export type ChatFormState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string | string[]> };
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const code = (e: unknown) => (e as { code?: string }).code;
const log = (where: string, e: unknown) => console.error(`[chat:${where}]`, e);

export async function sendMessageAction(conversationId: string, rawBody: string): Promise<ActionResult> {
  const s = await getSession(); if (!s) redirect("/login");
  const v = validateBody(rawBody);
  if (!v.ok) return { ok: false, error: v.error };
  if (!isUuid(conversationId)) return { ok: false, error: "ไม่พบแชทนี้ กรุณากลับไปที่รายการแชท" };
  try {
    const id = await asUser(s.authUserId, async (c) => (await c.query<{ id: string }>("select app.send_message($1, $2) as id", [conversationId, v.body])).rows[0].id);
    return { ok: true, id };
  } catch (e) { log("send", e); return { ok: false, error: chatErrorTh(code(e), "send") }; }
}

export async function reportMessageAction(messageId: string, reason: string, note: string): Promise<ActionResult> {
  const s = await getSession(); if (!s) redirect("/login");
  if (!isUuid(messageId)) return { ok: false, error: "ไม่พบข้อความที่ต้องการรายงาน" };
  if (!REPORT_REASON_VALUES.includes(reason)) return { ok: false, error: "กรุณาเลือกเหตุผลที่รายงาน" };
  if (note.length > 500) return { ok: false, error: "รายละเอียดเพิ่มเติมต้องไม่เกิน 500 ตัวอักษร" };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.report_content('message', $1, $2, $3)", [messageId, reason, note.trim() || null]));
    return { ok: true };
  } catch (e) {
    log("report", e);
    if (code(e) === "23514") return { ok: false, error: "คุณไม่สามารถรายงานข้อความของตัวเองได้" };
    return { ok: false, error: chatErrorTh(code(e), "report") };
  }
}

export async function leaveConversationAction(conversationId: string): Promise<ActionResult> {
  const s = await getSession(); if (!s) redirect("/login");
  if (!isUuid(conversationId)) return { ok: false, error: "ไม่พบแชทนี้" };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.leave_conversation($1)", [conversationId]));
    return { ok: true };
  } catch (e) { log("leave", e); return { ok: false, error: chatErrorTh(code(e), "leave") }; }
}

/** Group creation form (useActionState). Keeps title + selection on error. */
export async function createGroupAction(_: ChatFormState, fd: FormData): Promise<ChatFormState> {
  const s = await getSession(); if (!s) redirect("/login");
  const title = String(fd.get("title") ?? "").trim();
  const members = [...new Set(fd.getAll("member").map(String).filter(isUuid))];
  const values = { title, member: members };
  const fe: Record<string, string> = {};
  if (title.length < 2 || title.length > 60) fe.title = "กรุณาตั้งชื่อกลุ่ม 2-60 ตัวอักษร เช่น ชมรมจิตอาสา";
  if (members.length < 1) fe.member = "กรุณาเลือกอย่างน้อย 1 คนจากรายการ";
  if (members.length > 49) fe.member = "เลือกได้ไม่เกิน 49 คน";
  if (Object.keys(fe).length) return { fieldErrors: fe, values };
  let id: string;
  try {
    id = await asUser(s.authUserId, async (c) => (await c.query<{ id: string }>("select app.create_group($1, $2::uuid[]) as id", [title, members])).rows[0].id);
  } catch (e) { log("createGroup", e); return { error: chatErrorTh(code(e), "group"), values }; }
  redirect(`/chat/${id}`);
}

/** Starts a call from a direct chat. The caller then lands on /call/[id] where the media permission is requested. */
export async function startCallAction(conversationId: string, media: "voice" | "video"): Promise<ActionResult> {
  const s = await getSession(); if (!s) redirect("/login");
  if (!isUuid(conversationId) || (media !== "voice" && media !== "video")) return { ok: false, error: "โทรไม่สำเร็จ กรุณากลับไปที่แชทแล้วลองใหม่" };
  try {
    const id = await asUser(s.authUserId, async (c) => (await c.query<{ id: string }>("select app.start_call($1, $2) as id", [conversationId, media])).rows[0].id);
    return { ok: true, id };
  } catch (e) { log("startCall", e); return { ok: false, error: startCallErrorTh(code(e)) }; }
}
