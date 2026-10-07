import "server-only";
import { asUser } from "@/lib/db";
import type { BoardRow, SuggestRow } from "@/lib/monastic";

export const UUID = /^[0-9a-f-]{36}$/;

export interface Access {
  name_th: string | null; is_member: boolean; is_monastic: boolean;
  can_avail: boolean;       // availability.view at T or C (the two scopes app.availability_coarse accepts)
  can_inv_view: boolean; can_inv_manage: boolean;
}
/** Which links/pages the signed-in user can use in this temple — answered by the DB's own permission functions. */
export const monasticAccess = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<Access>(
    `select (select name_th from public.temples where id = $1) as name_th,
            app.is_member($1) as is_member,
            app.is_monastic($1, app.current_person_id()) as is_monastic,
            (app.has_permission($1, 'availability.view', 'T') or app.has_scope_letter($1, 'availability.view', 'C')) as can_avail,
            app.has_permission($1, 'invitation.view') as can_inv_view,
            app.has_permission($1, 'invitation.manage', 'T') as can_inv_manage`, [templeId])).rows[0]);

export interface MyAvail { state: string; location: string; reason: string | null; until_at: Date | null }
export interface DayItem {
  item_kind: "schedule" | "quest"; ref_id: string; title: string; starts_at: Date; ends_at: Date | null; status: string;
  detail: { kind?: string; leg?: string | null; venue?: string | null; source?: string; invitation_id?: string | null; monk_response?: string | null;
    quest_type?: string; overdue?: boolean; waiting_verifier?: boolean; event_id?: string | null };
}
export interface ManualRow { id: string; state: string; valid_until: Date; reason_code: string | null; set_by_kind: string; person_id: string }

export const myDay = (authUserId: string, templeId: string, ymd: string) =>
  asUser(authUserId, async (c) => ({
    avail: (await c.query<MyAvail>("select * from app.my_availability($1)", [templeId])).rows[0] ?? null,
    items: (await c.query<DayItem>("select * from app.my_day($1, $2::date)", [templeId, ymd])).rows,
    manual: (await c.query<ManualRow>(
      `select id, state, valid_until, reason_code, set_by_kind, person_id from public.availability_manual
        where temple_id = $1 and person_id = app.current_person_id() and set_by_kind = 'SELF' and truncated_at is null and valid_until > now()
        order by created_at desc`, [templeId])).rows,
  }));

export interface Practice { practice_days_this_month: string; practice_days_total: string; current_run: number | null; activity_score: string }
export const myPractice = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<Practice>("select * from app.my_practice($1)", [templeId])).rows[0] ?? null);

const denied = (e: unknown) => (e as { code?: string }).code === "42501";
export type BoardResult = { kind: "board"; rows: BoardRow[]; manual: ManualRow[] } | { kind: "denied" };
/** Each attempt runs in its own transaction: a 42501 aborts the transaction it happened in. */
export async function loadBoard(authUserId: string, templeId: string): Promise<BoardResult> {
  try {
    return await asUser(authUserId, async (c) => ({
      kind: "board" as const,
      rows: (await c.query<BoardRow>("select * from app.availability_board($1)", [templeId])).rows,
      manual: (await c.query<ManualRow>(
        `select id, state, valid_until, reason_code, set_by_kind, person_id from public.availability_manual
          where temple_id = $1 and state = 'UNAVAILABLE' and truncated_at is null and valid_until > now() order by valid_until`, [templeId])).rows,
    }));
  } catch (e) { if (denied(e)) return { kind: "denied" }; throw e; }
}
export interface CoarseRow { person_id: string; display_name: string; coarse: string }
export async function loadCoarse(authUserId: string, templeId: string): Promise<CoarseRow[] | null> {
  try {
    return await asUser(authUserId, async (c) => (await c.query<CoarseRow>("select * from app.availability_coarse($1)", [templeId])).rows);
  } catch (e) { if (denied(e)) return null; throw e; }
}

export interface InvRow {
  id: string; version: number; status: string; host_name: string; host_phone: string | null; host_relation: string | null; rite_type_id: string;
  rite_name: string | null; requires_lead: boolean | null; venue_text: string; starts_at: Date; duration_min: number; monks_required: number;
  transport: string; travel_out_min: number | null; travel_back_min: number | null; received_via: string; note: string | null;
  decline_reason: string | null; cancel_reason: string | null; confirmed_at: Date | null;
}
const INV_COLS = `i.id, i.version, i.status, i.host_name, i.host_phone, i.host_relation, i.rite_type_id, r.name_th as rite_name, r.requires_lead,
  i.venue_text, i.starts_at, i.duration_min, i.monks_required, i.transport, i.travel_out_min, i.travel_back_min, i.received_via, i.note,
  i.decline_reason, i.cancel_reason, i.confirmed_at`;
export const listInvitations = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<InvRow>(
    `select ${INV_COLS} from public.invitations i left join public.rite_types r on r.temple_id = i.temple_id and r.id = i.rite_type_id
      where i.temple_id = $1 order by i.starts_at limit 300`, [templeId])).rows);

export interface TeamRow { person_id: string; name: string | null; role: string; monk_response: string }
export const invitationDetail = (authUserId: string, templeId: string, invId: string) =>
  asUser(authUserId, async (c) => {
    const inv = (await c.query<InvRow>(
      `select ${INV_COLS} from public.invitations i left join public.rite_types r on r.temple_id = i.temple_id and r.id = i.rite_type_id
        where i.temple_id = $1 and i.id = $2`, [templeId, invId])).rows[0] ?? null;
    if (!inv) return null;
    const team = (await c.query<TeamRow>(
      `select t.person_id, p.display_name as name, t.role, t.monk_response from public.invitation_team t
         left join public.persons p on p.id = t.person_id where t.temple_id = $1 and t.invitation_id = $2
        order by (t.role = 'LEAD') desc, p.display_name`, [templeId, invId])).rows;
    const perms = (await c.query<{ manage: boolean; confirm: boolean }>(
      "select app.has_permission($1, 'invitation.manage', 'T') as manage, app.has_permission($1, 'invitation.confirm', 'T') as confirm", [templeId])).rows[0];
    return { inv, team, canManage: perms.manage, me: (await c.query<{ id: string }>("select app.current_person_id() as id")).rows[0].id };
  });

/** sma-v1 lists. The numeric score is deliberately NOT selected: it is audit-only and never shown. */
export const suggestTeam = (authUserId: string, templeId: string, invId: string) =>
  asUser(authUserId, async (c) => (await c.query<SuggestRow>(
    "select person_id, display_name, list, violations, warnings from app.suggest_team($1, $2)", [templeId, invId])).rows);

export interface RiteType { id: string; name_th: string; default_duration_min: number; requires_lead: boolean }
export const riteTypes = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<RiteType>(
    "select id, name_th, default_duration_min, requires_lead from public.rite_types where temple_id = $1 order by name_th", [templeId])).rows);
