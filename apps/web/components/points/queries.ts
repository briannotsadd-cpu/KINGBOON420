import "server-only";
import { asUser } from "@/lib/db";

export const UUID = /^[0-9a-f-]{36}$/;

export interface PAccess {
  name_th: string | null; is_member: boolean; is_monastic: boolean; me: string | null;
  can_award: boolean; can_reward_manage: boolean; can_cc_view: boolean; can_cc_full: boolean;
  can_avail: boolean; can_inv_view: boolean; can_inbox: boolean;
}
/** What the signed-in user may use in this temple, answered by the database's own permission functions. */
export const pointsAccess = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<PAccess>(
    `select (select name_th from public.temples where id = $1) as name_th,
            app.is_member($1) as is_member,
            app.is_monastic($1, app.current_person_id()) as is_monastic,
            app.current_person_id() as me,
            app.has_permission($1, 'points.award_community', 'D') as can_award,
            app.has_permission($1, 'reward.manage', 'T') as can_reward_manage,
            app.has_permission($1, 'command_center.view', 'D') as can_cc_view,
            app.has_permission($1, 'command_center.view', 'T') as can_cc_full,
            (app.has_permission($1, 'availability.view', 'T') or app.has_scope_letter($1, 'availability.view', 'C')) as can_avail,
            app.has_permission($1, 'invitation.view') as can_inv_view,
            app.has_permission($1, 'contact_inbox.manage', 'T') as can_inbox`, [templeId])).rows[0]);

export interface MyPointRow { balance: string; created_at: Date | null; amount: number | null; txn_type: string | null; reason: string | null; source_type: string | null }
export interface HeldRow { id: string; amount: number; created_at: Date }
export const myPointsData = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => ({
    rows: (await c.query<MyPointRow>("select * from app.my_points($1)", [templeId])).rows,
    held: (await c.query<HeldRow>(
      `select id, amount, created_at from public.point_holds
        where temple_id = $1 and person_id = app.current_person_id() and status = 'HELD' order by created_at desc`, [templeId])).rows,
  }));

export interface RewardRow { id: string; name_th: string; description: string | null; cost: number; stock: number; per_person_limit: number | null; active: boolean }
export interface MyRedemption { id: string; status: string; cost: number; created_at: Date; decided_at: Date | null; reward_name: string | null }
export const rewardsData = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => ({
    balance: Number((await c.query<{ b: string }>("select balance as b from app.my_points($1) limit 1", [templeId])).rows[0]?.b ?? 0),
    rewards: (await c.query<RewardRow>(
      `select id, name_th, description, cost, stock, per_person_limit, active from public.reward_catalog
        where temple_id = $1 and active order by cost, name_th`, [templeId])).rows,
    mine: (await c.query<MyRedemption>(
      `select d.id, d.status, d.cost, d.created_at, d.decided_at, r.name_th as reward_name
         from public.reward_redemptions d left join public.reward_catalog r on r.temple_id = d.temple_id and r.id = d.reward_id
        where d.temple_id = $1 and d.person_id = app.current_person_id() order by d.created_at desc limit 100`, [templeId])).rows,
  }));

export interface ManageRedemption { id: string; cost: number; created_at: Date; reward_name: string | null; person_name: string | null }
export const rewardManageData = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => ({
    rewards: (await c.query<RewardRow>(
      `select id, name_th, description, cost, stock, per_person_limit, active from public.reward_catalog where temple_id = $1 order by active desc, cost, name_th`,
      [templeId])).rows,
    requested: (await c.query<ManageRedemption>(
      `select d.id, d.cost, d.created_at, r.name_th as reward_name, p.display_name as person_name
         from public.reward_redemptions d left join public.reward_catalog r on r.temple_id = d.temple_id and r.id = d.reward_id
         left join public.persons p on p.id = d.person_id
        where d.temple_id = $1 and d.status = 'REQUESTED' order by d.created_at`, [templeId])).rows,
  }));

export interface Member { person_id: string; display_name: string }
export interface HoldReview { id: string; person_id: string; person_name: string | null; amount: number; signal: string; created_at: Date; quest_title: string | null }
export const awardData = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => ({
    members: (await c.query<Member>(
      `select m.person_id, p.display_name from public.memberships m join public.persons p on p.id = m.person_id
        where m.temple_id = $1 and m.status = 'active' and m.monastic_kind = 'none' and p.display_name <> '' order by p.display_name`, [templeId])).rows,
    holds: (await c.query<HoldReview>(
      `select h.id, h.person_id, p.display_name as person_name, h.amount, h.signal, h.created_at,
              (select q.title from public.quest_assignments a join public.quests q on q.temple_id = a.temple_id and q.id = a.quest_id
                where a.temple_id = h.temple_id and a.id = h.assignment_id) as quest_title
         from public.point_holds h left join public.persons p on p.id = h.person_id
        where h.temple_id = $1 and h.status = 'HELD' order by h.created_at`, [templeId])).rows,
  }));
