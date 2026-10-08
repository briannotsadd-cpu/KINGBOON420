"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { progressTask } from "@/components/events/task-progress";
import {
  TASK_ACTIONS, TRANSITIONS, UUID_RE, dbErrorMessage, okMessage, parseEventForm, parseReason, parseTargetForm, parseTaskForm, type Op, type Transition,
} from "@/lib/events";

export type EventState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; ok?: string };

// Every action only validates input shape and then calls ONE database function as the signed-in user.
// Who may do what (manage / approve / volunteer approval / verifier != assignee) is decided by the database; its refusal is shown in Thai.
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const code = (e: unknown) => (e as { code?: string }).code;
const msg = (e: unknown) => String((e as { message?: string }).message ?? "");
const BAD = "คำสั่งไม่ถูกต้อง กรุณาโหลดหน้านี้ใหม่";
const formValues = (fd: FormData): Record<string, string> => {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !["temple_id", "event_id", "op", "act", "target_id", "participant_id", "assignment_id"].includes(k)) o[k] = v;
  return o;
};

export async function saveEventAction(_: EventState, fd: FormData): Promise<EventState> {
  const s = await getSession(); if (!s) redirect("/login");
  const temple = str(fd, "temple_id"), event = str(fd, "event_id");
  const values = formValues(fd);
  if (!UUID_RE.test(temple) || (event && !UUID_RE.test(event))) return { error: BAD, values };
  const p = parseEventForm(values);
  if (!p.ok) return { fieldErrors: p.fieldErrors, values };
  const v = p.value;
  let id: string;
  try {
    id = (await asUser(s.authUserId, (c) => c.query<{ id: string }>(
      "select app.save_event($1::uuid, $2::uuid, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8, $9, $10::uuid, $11::int) as id",
      [temple, event || null, v.kind, v.title, v.description || null, v.startsIso, v.endsIso, v.venue || null, v.visibility, v.lead, v.expected]))).rows[0].id;
  } catch (e) {
    console.error("[action:saveEvent]", e);
    return { error: dbErrorMessage("task", code(e), msg(e)), values };
  }
  redirect(`/temple/${temple}/events/${id}`);
}

/** All other event operations. op = plan | approve | start | close | cancel | target | participant | decide | signup | withdraw | task | progress. */
export async function eventOpAction(_: EventState, fd: FormData): Promise<EventState> {
  const s = await getSession(); if (!s) redirect("/login");
  const temple = str(fd, "temple_id"), event = str(fd, "event_id"), op = str(fd, "op") as Op;
  const act = str(fd, "act");
  const values = formValues(fd);
  if (!UUID_RE.test(temple) || !UUID_RE.test(event)) return { error: BAD };
  const run = async (sql: string, args: unknown[]): Promise<EventState> => {
    try {
      await asUser(s.authUserId, (c) => c.query(sql, args));
      return { ok: okMessage(op, act) };
    } catch (e) {
      console.error(`[action:event:${op}]`, e);
      return { error: dbErrorMessage(op, code(e), msg(e), act), values };
    }
  };

  if ((TRANSITIONS as readonly string[]).includes(op)) {
    let reason: string | null = null;
    if (op === "cancel") {
      const r = parseReason(str(fd, "reason"));
      if (!r.ok) return { fieldErrors: r.fieldErrors, values };
      reason = r.value;
    }
    return run("select app.event_transition($1::uuid, $2::uuid, $3, $4)", [temple, event, op as Transition, reason]);
  }
  switch (op) {
    case "target": {
      const p = parseTargetForm(values);
      if (!p.ok) return { fieldErrors: p.fieldErrors, values };
      const v = p.value;
      return run("select app.save_staffing_target($1::uuid, $2::uuid, $3, $4, $5::int, $6::int, $7::boolean)", [temple, event, v.category, v.label, v.required, v.min, v.hard]);
    }
    case "participant": {
      const target = str(fd, "target_id"), person = str(fd, "person_id");
      if (!UUID_RE.test(target)) return { error: BAD };
      if (!UUID_RE.test(person)) return { fieldErrors: { person_id: "กรุณาเลือกคนที่จะเพิ่ม" }, values };
      return run("select app.add_event_participant($1::uuid, $2::uuid, $3::uuid)", [temple, target, person]);
    }
    case "decide": {
      const part = str(fd, "participant_id");
      if (!UUID_RE.test(part) || !["accept", "decline"].includes(act)) return { error: BAD };
      return run("select app.decide_participant($1::uuid, $2::uuid, $3::boolean)", [temple, part, act === "accept"]);
    }
    case "signup": {
      const target = str(fd, "target_id");
      if (!UUID_RE.test(target)) return { error: BAD };
      return run("select app.volunteer_signup($1::uuid, $2::uuid)", [temple, target]);
    }
    case "withdraw": {
      const part = str(fd, "participant_id");
      if (!UUID_RE.test(part)) return { error: BAD };
      return run("select app.withdraw_participation($1::uuid, $2::uuid)", [temple, part]);
    }
    case "task": {
      const p = parseTaskForm(values);
      if (!p.ok) return { fieldErrors: p.fieldErrors, values };
      const v = p.value;
      return run("select app.add_event_task($1::uuid, $2::uuid, $3, $4::int, $5::boolean, $6::timestamptz, $7::uuid)", [temple, event, v.title, v.weight, v.gate, v.dueIso, v.assignee]);
    }
    case "progress": {
      const a = str(fd, "assignment_id");
      if (!UUID_RE.test(a) || !(TASK_ACTIONS as readonly string[]).includes(act)) return { error: BAD };
      try {
        const saved = await progressTask(s.authUserId, temple, event, a, act);
        return saved ? { ok: okMessage(op, act) } : { error: "งานเปลี่ยนสถานะแล้ว หรือคุณไม่มีสิทธิ์ กรุณาโหลดข้อมูลใหม่ก่อนทำต่อ" };
      } catch (e) {
        console.error("[action:event:progress]", e);
        return { error: dbErrorMessage(op, code(e), msg(e), act) };
      }
    }
    default: return { error: BAD };
  }
}
