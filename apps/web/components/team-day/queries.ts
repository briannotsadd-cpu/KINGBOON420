import "server-only";
import { asUser } from "@/lib/db";
import { dayBounds, type DayTask } from "@/lib/team-day";
import type { DayItem } from "@/components/monastic/queries";

const COLUMNS = `q.id, q.title, q.description, q.due_at, a.id as assignment_id,
  coalesce(a.status, 'UNASSIGNED') as status, a.reason, q.event_id,
  e.title as event_title, e.venue_text as venue, b.name_th as building_name,
  p.display_name as assignee_name`;
const JOINS = `left join public.events e on e.temple_id = q.temple_id and e.id = q.event_id
  left join public.buildings b on b.temple_id = q.temple_id and b.id = q.building_id
  left join public.persons p on p.id = a.assignee_person_id`;

/** All reads use the authenticated role + RLS. The team queue additionally requires assignment visibility
 *  for each department before interpreting a missing assignment as genuinely unassigned. */
export const teamDay = (userId: string, templeId: string, day: string) => asUser(userId, async (c) => {
  const { start, end } = dayBounds(day);
  const own = (await c.query<DayTask>(`select ${COLUMNS}
    from public.quests q join public.quest_assignments a on a.temple_id = q.temple_id and a.quest_id = q.id
    ${JOINS}
    where q.temple_id = $1 and a.assignee_person_id = app.current_person_id()
      and q.status not in ('DRAFT','CANCELLED') and a.status <> 'CANCELLED'
      and ((a.status = 'COMPLETED' and a.updated_at >= $2 and a.updated_at < $3)
        or (a.status <> 'COMPLETED' and (q.due_at is null or q.due_at < $3)))
    order by q.due_at nulls last, a.id limit 101`, [templeId, start, end])).rows;
  const team = (await c.query<DayTask>(`select ${COLUMNS}
    from public.quests q
    left join public.quest_assignments a on a.temple_id = q.temple_id and a.quest_id = q.id and a.status <> 'CANCELLED'
    ${JOINS}
    where q.temple_id = $1 and q.status = 'OPEN' and (q.due_at is null or q.due_at < $2)
      and (app.in_scope(q.temple_id, 'quest.assign', null, q.department_id)
        or app.in_scope(q.temple_id, 'quest.verify', null, q.department_id))
      and (a.id is null or a.status in ('BLOCKED','SUBMITTED'))
      and (a.assignee_person_id is null or a.assignee_person_id <> app.current_person_id())
    order by q.due_at nulls last, q.id, a.id limit 101`, [templeId, end])).rows;
  const schedule = (await c.query<DayItem>(
    "select * from app.my_day($1, $2::date) where item_kind = 'schedule'", [templeId, day])).rows;
  return { own: own.slice(0, 100), team: team.slice(0, 100), schedule,
    ownLimited: own.length > 100, teamLimited: team.length > 100 };
});
export type TeamDayData = Awaited<ReturnType<typeof teamDay>>;
