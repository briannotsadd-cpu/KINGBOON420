"use server";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import {
  isCallPermission, isDecision, isPostVis, isReportKind, isReportReason, isUuid, isVis, isAdultByYear, LIMITS, mapDbError,
  parseBirthYear, parseList, validateBody,
} from "@/lib/community";
import { loadFeed, type PostView } from "./data";

export type CState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string };
export type ActResult = { ok?: string; error?: string };

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const raw = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const dbCode = (e: unknown) => (e as { code?: string }).code;
const fail = (where: string, e: unknown): { error: string } => { console.error(`[community:${where}]`, e); return { error: mapDbError(dbCode(e)) }; };
const BAD_ID = { error: "ไม่พบรายการนี้ กรุณาโหลดหน้านี้ใหม่แล้วลองอีกครั้ง" };

async function session() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
/** Run one DB call as the signed-in user and map the outcome to a result. */
async function run(where: string, okMsg: string, fn: (c: PoolClient) => Promise<unknown>): Promise<ActResult> {
  const s = await session();
  try { await asUser(s.authUserId, fn); } catch (e) { return fail(where, e); }
  return { ok: okMsg };
}

// ---- posts & comments --------------------------------------------------------------------------------------
export async function createPostAction(_: CState, fd: FormData): Promise<CState> {
  const body = raw(fd, "body"), visibility = val(fd, "visibility") || "public";
  const values = { body, visibility };
  const e = validateBody(body, LIMITS.post, "ข้อความโพสต์");
  if (e) return { fieldErrors: { body: e }, values };
  if (!isPostVis(visibility)) return { fieldErrors: { visibility: "กรุณาเลือกว่าใครเห็นโพสต์นี้ได้" }, values };
  const r = await run("createPost", "โพสต์เรียบร้อยแล้ว", (c) => c.query("select app.create_post($1, $2)", [body.trim(), visibility]));
  return r.error ? { error: r.error, values } : { ok: r.ok };
}

export async function loadMoreAction(before: string): Promise<{ posts: PostView[]; more: boolean } | { error: string }> {
  const s = await session();
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(before)) return BAD_ID;
  try { const posts = await loadFeed(s.authUserId, before); return { posts, more: posts.length >= 30 }; }
  catch (e) { return fail("loadMore", e); }
}

export async function deletePostAction(id: string): Promise<ActResult> {
  if (!isUuid(id)) return BAD_ID;
  return run("deletePost", "ลบโพสต์แล้ว", (c) => c.query("select app.delete_own_post($1)", [id]));
}

export async function commentAction(_: CState, fd: FormData): Promise<CState> {
  const body = raw(fd, "body"), post = val(fd, "post");
  const e = validateBody(body, LIMITS.comment, "ความคิดเห็น");
  if (e) return { fieldErrors: { body: e }, values: { body } };
  if (!isUuid(post)) return { error: BAD_ID.error, values: { body } };
  const r = await run("comment", "ส่งความคิดเห็นแล้ว", (c) => c.query("select app.comment_post($1, $2)", [post, body.trim()]));
  return r.error ? { error: r.error, values: { body } } : { ok: r.ok };
}

// ---- people actions (identical menu everywhere) ---------------------------------------------------------------------
export async function setMuteAction(person: string, muted: boolean): Promise<ActResult> {
  if (!isUuid(person)) return BAD_ID;
  return run("mute", muted ? "ปิดเสียงแล้ว คุณจะไม่เห็นโพสต์ของคนนี้ในฟีด" : "เลิกปิดเสียงแล้ว",
    (c) => c.query("select app.set_mute($1, $2)", [person, muted]));
}
export async function blockAction(person: string): Promise<ActResult> {
  if (!isUuid(person)) return BAD_ID;
  return run("block", "บล็อกแล้ว คนนี้จะไม่เห็นและติดต่อคุณไม่ได้ ดูรายชื่อและยกเลิกได้ที่ “การเชื่อมต่อ”",
    (c) => c.query("select app.block_person($1)", [person]));
}
export async function unblockAction(person: string): Promise<ActResult> {
  if (!isUuid(person)) return BAD_ID;
  return run("unblock", "ยกเลิกการบล็อกแล้ว", (c) => c.query("select app.unblock_person($1)", [person]));
}

export async function reportAction(_: CState, fd: FormData): Promise<CState> {
  const kind = val(fd, "kind"), target = val(fd, "target"), reason = val(fd, "reason"), note = val(fd, "note");
  const values = { reason, note };
  if (!isReportReason(reason)) return { fieldErrors: { reason: "กรุณาเลือกเหตุผลที่รายงาน" }, values };
  if (note.length > LIMITS.note) return { fieldErrors: { note: `รายละเอียดยาวเกินไป (ไม่เกิน ${LIMITS.note} ตัวอักษร)` }, values };
  if (!isReportKind(kind) || !isUuid(target)) return { error: BAD_ID.error, values };
  const r = await run("report", "ส่งรายงานแล้ว ผู้ดูแลจะตรวจสอบ ขอบคุณที่ช่วยดูแลชุมชน",
    (c) => c.query("select app.report_content($1, $2, $3, $4)", [kind, target, reason, note || null]));
  return r.error ? { error: r.error, values } : { ok: r.ok };
}

// ---- connections --------------------------------------------------------------------------------------------------------
export async function requestConnectionAction(person: string): Promise<ActResult> {
  if (!isUuid(person)) return BAD_ID;
  return run("requestConnection", "ส่งคำขอเชื่อมต่อแล้ว รออีกฝ่ายตอบรับ", (c) => c.query("select app.request_connection($1)", [person]));
}
export async function respondConnectionAction(person: string, accept: boolean): Promise<ActResult> {
  if (!isUuid(person)) return BAD_ID;
  return run("respondConnection", accept ? "ยอมรับแล้ว ตอนนี้คุณเชื่อมต่อกันแล้ว" : "ปฏิเสธคำขอแล้ว",
    (c) => c.query("select app.respond_connection($1, $2)", [person, accept]));
}
export async function removeConnectionAction(person: string): Promise<ActResult> {
  if (!isUuid(person)) return BAD_ID;
  return run("removeConnection", "ยกเลิกการเชื่อมต่อแล้ว", (c) => c.query("select app.remove_connection($1)", [person]));
}

// ---- profile -----------------------------------------------------------------------------------------------------------------
export async function saveProfileAction(_: CState, fd: FormData): Promise<CState> {
  const s = await session();
  const v: Record<string, string> = {};
  for (const k of ["display_name", "birth_year", "bio", "skills", "interests", "bio_vis", "skills_vis", "interests_vis", "call_permission"]) v[k] = raw(fd, k);
  v.discoverable = fd.get("discoverable") ? "on" : "";
  const fe: Record<string, string> = {};
  const name = v.display_name.trim();
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) fe.display_name = `กรุณากรอกชื่อที่ให้คนอื่นเห็น ${LIMITS.nameMin}–${LIMITS.nameMax} ตัวอักษร`;
  if (v.bio.trim().length > LIMITS.bio) fe.bio = `แนะนำตัวยาวเกินไป (ไม่เกิน ${LIMITS.bio} ตัวอักษร ตอนนี้ ${v.bio.trim().length})`;
  const skills = parseList(v.skills); if (skills.error) fe.skills = skills.error;
  const interests = parseList(v.interests); if (interests.error) fe.interests = interests.error;
  for (const k of ["bio_vis", "skills_vis", "interests_vis"]) if (!isVis(v[k])) fe[k] = "กรุณาเลือกว่าใครเห็นข้อมูลนี้ได้";
  if (!isCallPermission(v.call_permission)) fe.call_permission = "กรุณาเลือกว่าใครโทรหาคุณได้";

  try {
    const existing = await asUser(s.authUserId, async (c) => (await c.query<{ birth_year: number }>("select birth_year from public.community_profiles")).rows[0]);
    let birth: number | undefined = existing?.birth_year; // the DB ignores any later change; we never even send a different one
    if (!existing) {
      const b = parseBirthYear(v.birth_year, new Date().getFullYear());
      if (b.error) fe.birth_year = b.error;
      else if (!isAdultByYear(b.year!, new Date().getFullYear()))
        fe.birth_year = "ผู้มีอายุต่ำกว่า 20 ปียังใช้ชุมชนไม่ได้ จึงยังบันทึกโปรไฟล์ไม่ได้ ถ้าพิมพ์ปีเกิดผิด กรุณาแก้ไขแล้วกดบันทึกอีกครั้ง";
      else birth = b.year as number;
    }
    if (Object.keys(fe).length) return { fieldErrors: fe, values: v };
    await asUser(s.authUserId, (c) => c.query("select app.save_community_profile($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [name, birth, v.bio.trim() || null, skills.items, interests.items, v.bio_vis, v.skills_vis, v.interests_vis, v.discoverable === "on", v.call_permission]));
  } catch (e) { return { ...fail("saveProfile", e), values: v }; }
  return { ok: "บันทึกโปรไฟล์แล้ว", values: v };
}

// ---- moderation (platform admin; the DB enforces it too) --------------------------------------------------------------------------
export async function decideReportAction(_: CState, fd: FormData): Promise<CState> {
  const report = val(fd, "report"), decision = val(fd, "decision"), reason = val(fd, "reason");
  const values = { decision, reason };
  const s = await session();
  if (!s.isPlatformAdmin) return { error: "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น", values };
  if (!isDecision(decision)) return { fieldErrors: { decision: "กรุณาเลือกคำตัดสิน" }, values };
  if (!reason) return { fieldErrors: { reason: "กรุณาพิมพ์เหตุผลของคำตัดสิน (จำเป็น) เพื่อใช้ตรวจสอบย้อนหลัง" }, values };
  if (reason.length > LIMITS.decisionReason) return { fieldErrors: { reason: `เหตุผลยาวเกินไป (ไม่เกิน ${LIMITS.decisionReason} ตัวอักษร)` }, values };
  if (!isUuid(report)) return { error: BAD_ID.error, values };
  const r = await run("decideReport", "บันทึกคำตัดสินแล้ว", (c) => c.query("select app.decide_report($1, $2, $3)", [report, decision, reason]));
  return r.error ? { error: r.error, values } : { ok: r.ok, values };
}
export async function liftSuspensionAction(person: string): Promise<ActResult> {
  const s = await session();
  if (!s.isPlatformAdmin) return { error: "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น" };
  if (!isUuid(person)) return BAD_ID;
  return run("liftSuspension", "ยกเลิกการระงับแล้ว", (c) => c.query("select app.lift_suspension($1)", [person]));
}
