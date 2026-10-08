import "server-only";
import type { PoolClient } from "pg";
import { asAnon, asUser } from "@/lib/db";

// Every read here runs as the signed-in user (RLS decides what exists). Nothing is filtered in application code
// except presentation: what a person may not see is simply not returned by the database.

export interface Access { name_th: string | null; manage: boolean; approve: boolean; volApprove: boolean; verify: boolean }
export const eventAccess = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<Access>(
    `select (select name_th from public.temples where id = $1::uuid) as name_th,
            app.has_permission($1::uuid, 'event.manage') as manage,
            app.has_permission($1::uuid, 'event.approve', 'T') as approve,
            (app.has_permission($1::uuid, 'event.volunteer_approve') or app.has_permission($1::uuid, 'event.manage')) as "volApprove",
            (app.has_permission($1::uuid, 'event.manage') or app.has_permission($1::uuid, 'quest.verify', 'D')) as verify`, [templeId])).rows[0]);

export interface EventListRow { id: string; title: string; kind: string; status: string; starts_at: Date; ends_at: Date; venue_text: string | null;
  visibility: string; readiness: unknown }
export const listEvents = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<EventListRow>(
    `select e.id, e.title, e.kind, e.status, e.starts_at, e.ends_at, e.venue_text, e.visibility,
            app.event_readiness(e.temple_id, e.id) as readiness
       from public.events e where e.temple_id = $1 order by e.starts_at limit 300`, [templeId])).rows);

export interface EventRow extends EventListRow { description: string | null; lead_person_id: string | null; lead_name: string | null;
  expected_attendance: number | null; cancel_reason: string | null }
export interface TargetRow { id: string; category: string; label: string; required: number; min_required: number; hard_gate: boolean }
export interface ParticipantRow { id: string; target_id: string; person_id: string; status: string; display_name: string | null }
export interface TaskRow { id: string; title: string; status: string; weight: number; is_gate: boolean; due_at: Date | null; assignment_id: string | null;
  assignment_status: string | null; assignee_person_id: string | null; assignee_name: string | null }
export interface MemberRow { person_id: string; display_name: string; monastic_kind: string }

export interface EventDetail { event: EventRow; targets: TargetRow[]; participants: ParticipantRow[]; tasks: TaskRow[]; members: MemberRow[] }

/** One consistent snapshot. members (everyone the user may see via RLS) are only needed by people who manage the event. */
export const eventDetail = (authUserId: string, templeId: string, eventId: string, wantMembers: boolean) =>
  asUser(authUserId, async (c): Promise<EventDetail | null> => {
    const event = (await c.query<EventRow>(
      `select e.id, e.title, e.kind, e.status, e.starts_at, e.ends_at, e.venue_text, e.visibility, e.description, e.lead_person_id,
              (select p.display_name from public.persons p where p.id = e.lead_person_id) as lead_name,
              e.expected_attendance, e.cancel_reason, app.event_readiness(e.temple_id, e.id) as readiness
         from public.events e where e.temple_id = $1 and e.id = $2`, [templeId, eventId])).rows[0];
    if (!event) return null;
    const targets = (await c.query<TargetRow>(
      `select id, category, label, required, min_required, hard_gate from public.event_staffing_targets
        where temple_id = $1 and event_id = $2 order by category, label, id`, [templeId, eventId])).rows;
    const participants = (await c.query<ParticipantRow>(
      `select p.id, p.target_id, p.person_id, p.status, pe.display_name from public.event_participants p
         left join public.persons pe on pe.id = p.person_id
        where p.temple_id = $1 and p.event_id = $2 and p.status <> 'CANCELLED' order by p.created_at`, [templeId, eventId])).rows;
    const tasks = (await c.query<TaskRow>(
      `select q.id, q.title, q.status, q.weight::int as weight, q.is_gate, q.due_at, a.id as assignment_id, a.status as assignment_status,
              a.assignee_person_id, pe.display_name as assignee_name
         from public.quests q
         left join lateral (select x.* from public.quest_assignments x where x.temple_id = q.temple_id and x.quest_id = q.id
                             and x.status <> 'CANCELLED' order by x.updated_at desc limit 1) a on true
         left join public.persons pe on pe.id = a.assignee_person_id
        where q.temple_id = $1 and q.event_id = $2 and q.status <> 'CANCELLED' order by q.due_at nulls last, q.created_at`, [templeId, eventId])).rows;
    const members = wantMembers ? await visibleMembers(c, templeId) : [];
    return { event, targets, participants, tasks, members };
  });

async function visibleMembers(c: PoolClient, templeId: string): Promise<MemberRow[]> {
  return (await c.query<MemberRow>(
    `select m.person_id, pe.display_name, m.monastic_kind from public.memberships m join public.persons pe on pe.id = m.person_id
      where m.temple_id = $1 and m.status = 'active' order by pe.display_name, m.person_id limit 500`, [templeId])).rows;
}
/** Active members the user may see (RLS: needs member.view). Used for the lead-person select on the form pages. */
export const listMembers = (authUserId: string, templeId: string) => asUser(authUserId, (c) => visibleMembers(c, templeId));

export interface PublicEvent { id: string; title: string; kind: string; starts_at: Date; ends_at: Date; venue_text: string | null; volunteers_needed: number }
export const publicEvents = (slug: string) =>
  asAnon(async (c) => (await c.query<PublicEvent>("select * from public.temple_public_events($1)", [slug])).rows);

export interface EventForEdit { id: string; kind: string; title: string; description: string | null; starts_at: Date; ends_at: Date; venue_text: string | null;
  visibility: string; lead_person_id: string | null; expected_attendance: number | null; status: string }
export const eventForEdit = (authUserId: string, templeId: string, eventId: string) =>
  asUser(authUserId, async (c) => (await c.query<EventForEdit>(
    `select id, kind, title, description, starts_at, ends_at, venue_text, visibility, lead_person_id, expected_attendance, status
       from public.events where temple_id = $1 and id = $2`, [templeId, eventId])).rows[0] ?? null);
