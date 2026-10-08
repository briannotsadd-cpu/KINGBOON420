"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import {
  awardError, decideError, parseAward, parseReward, redeemError, reviewError, saveRewardError, REDEEM_OK,
} from "@/lib/points";

// Every write goes through a DB function that decides authority (RLS + SECURITY DEFINER checks). Nothing here guesses roles.
export type PointsState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string };
const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const raw = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const UUID = /^[0-9a-f-]{36}$/;
const BAD: PointsState = { error: "คำสั่งไม่ถูกต้อง กรุณาโหลดหน้านี้ใหม่" };
const pgc = (e: unknown) => e as { code?: string; message?: string };

async function session() { const s = await getSession(); if (!s) redirect("/login"); return s; }

/** Manual award (points.award_community D). The request id comes from the page so a retry of the SAME form is idempotent (ledger key award:<id>). */
export async function awardPointsAction(_: PointsState, fd: FormData): Promise<PointsState> {
  const s = await session();
  const temple = val(fd, "temple_id"), request = val(fd, "request");
  const values = { person_id: val(fd, "person_id"), amount: val(fd, "amount"), reason: raw(fd, "reason") };
  if (!UUID.test(temple) || !UUID.test(request)) return BAD;
  const p = parseAward(values);
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  try {
    await asUser(s.authUserId, (c) => c.query("select app.award_points($1, $2, $3, $4, $5)", [temple, p.value.person, p.value.amount, p.value.reason, request]));
  } catch (e) { console.error("[action:awardPoints]", e); return { error: awardError(pgc(e)), values }; }
  return { ok: `มอบ ${p.value.amount} แต้มแล้ว ผู้รับจะเห็นเหตุผล "${p.value.reason}" ในประวัติแต้มของเขา`, values: {} };
}

export async function reviewHoldAction(_: PointsState, fd: FormData): Promise<PointsState> {
  const s = await session();
  const temple = val(fd, "temple_id"), hold = val(fd, "hold_id"), decision = val(fd, "decision");
  if (!UUID.test(temple) || !UUID.test(hold) || !["accept", "reject"].includes(decision)) return BAD;
  try {
    await asUser(s.authUserId, (c) => c.query("select app.review_hold($1, $2, $3)", [temple, hold, decision === "accept"]));
  } catch (e) { console.error("[action:reviewHold]", e); return { error: reviewError(pgc(e)) }; }
  return { ok: decision === "accept" ? "อนุมัติแล้ว แต้มถูกบันทึกให้ผู้รับ" : "ไม่อนุมัติแล้ว แต้มที่พักไว้จะไม่ถูกบันทึก" };
}

/** Redeem. A FRESH request uuid per submit (redeem is not idempotent in the database: a reused id would create a redemption without a charge). */
export async function redeemRewardAction(_: PointsState, fd: FormData): Promise<PointsState> {
  const s = await session();
  const temple = val(fd, "temple_id"), reward = val(fd, "reward_id");
  if (!UUID.test(temple) || !UUID.test(reward)) return BAD;
  try {
    await asUser(s.authUserId, (c) => c.query("select app.redeem_reward($1, $2, $3)", [temple, reward, randomUUID()]));
  } catch (e) { console.error("[action:redeemReward]", e); return { error: redeemError(pgc(e)) }; }
  return { ok: REDEEM_OK };
}

/** fulfil (reward.manage T) or cancel (the owner, or reward.manage T). Cancel refunds the points and returns the item to stock. */
export async function decideRedemptionAction(_: PointsState, fd: FormData): Promise<PointsState> {
  const s = await session();
  const temple = val(fd, "temple_id"), rid = val(fd, "redemption_id"), op = val(fd, "op");
  if (!UUID.test(temple) || !UUID.test(rid) || !["fulfil", "cancel"].includes(op)) return BAD;
  try {
    await asUser(s.authUserId, (c) => c.query("select app.decide_redemption($1, $2, $3)", [temple, rid, op]));
  } catch (e) { console.error("[action:decideRedemption]", e); return { error: decideError(pgc(e)) }; }
  return { ok: op === "fulfil" ? "บันทึกว่ามอบของแล้ว" : "ยกเลิกแล้ว คืนแต้มให้ผู้ขอรับเรียบร้อย" };
}

export async function saveRewardAction(_: PointsState, fd: FormData): Promise<PointsState> {
  const s = await session();
  const temple = val(fd, "temple_id"), id = val(fd, "reward_id");
  const values = { name: raw(fd, "name"), description: raw(fd, "description"), cost: val(fd, "cost"), stock: val(fd, "stock"), limit: val(fd, "limit"),
    active: fd.get("active") ? "1" : "0" };
  if (!UUID.test(temple) || (id && !UUID.test(id))) return BAD;
  const p = parseReward({ ...values, active: values.active === "1" });
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  const v = p.value;
  try {
    await asUser(s.authUserId, (c) => c.query("select app.save_reward($1, $2::uuid, $3, $4, $5, $6, $7, $8)",
      [temple, id || null, v.name, v.description, v.cost, v.stock, v.limit, v.active]));
  } catch (e) { console.error("[action:saveReward]", e); return { error: saveRewardError(pgc(e)), values }; }
  return id ? { ok: `บันทึก "${v.name}" แล้ว`, values } : { ok: `เพิ่ม "${v.name}" แล้ว ผู้ร่วมกิจกรรมจะเห็นในหน้าของที่ระลึก`, values: {} };
}
