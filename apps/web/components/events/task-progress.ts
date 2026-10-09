import "server-only";
import { asUser } from "@/lib/db";

/** Recheck membership, event/assignment binding and expected state at the mutation boundary.
 *  RLS filters both joined tables; the existing DB function still enforces actor/verifier and logs the transition. */
export async function progressTask(user: string, temple: string, event: string, assignment: string, action: string) {
  const expected = action === "start" ? "ASSIGNED" : action === "submit" ? "IN_PROGRESS" :
    ["verify", "reject"].includes(action) ? "SUBMITTED" : null;
  if (!expected) throw new Error("Invalid task action");
  return asUser(user, async c => {
    const result = await c.query(`select app.event_task_progress($1::uuid, $2::uuid, $3)
      where app.is_member($1::uuid) and exists (
        select 1 from public.quest_assignments a join public.quests q on q.temple_id = a.temple_id and q.id = a.quest_id
        where a.temple_id = $1 and a.id = $2 and q.event_id = $4::uuid and q.status = 'OPEN' and a.status = $5
      )`, [temple, assignment, action, event, expected]);
    return result.rowCount === 1;
  });
}
