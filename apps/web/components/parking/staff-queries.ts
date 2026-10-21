import "server-only";
import { asUser } from "@/lib/db";

export interface ParkingAccess {
  name_th: string | null; slug: string | null; is_member: boolean; parking_declared: string | null;
  can_report: boolean; can_manage: boolean; can_confirm: boolean; public_ok: boolean;
}
/** Answered by the database's own permission functions; the write functions check again. */
export const parkingAccess = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<ParkingAccess>(
    `select t.name_th, t.slug, app.is_member($1) as is_member, case when app.is_member($1) then t.parking_declared end as parking_declared,
            app.has_permission($1, 'parking.report', 'T') as can_report,
            app.has_permission($1, 'parking.manage', 'T') as can_manage,
            app.has_permission($1, 'temple.settings', 'T') as can_confirm,
            (t.is_listed and t.status = 'approved' and app.is_verified_temple(t.id)) as public_ok
       from (select $1::uuid as id) x left join public.temples t on t.id = x.id`, [templeId])).rows[0]);

export interface StaffLot {
  id: string; code: string; name_th: string; capacity: number | null; accessible_spaces: number | null; vehicle_types: string[];
  fee_note_th: string | null; hours_note_th: string | null; is_public: boolean; active: boolean; stale_after_minutes: number;
  verification_status: string; status: "AVAILABLE" | "FILLING" | "FULL" | "CLOSED" | "UNKNOWN"; free_spaces: number | null;
  note_th: string | null; reported_at: Date | null; reported_by_me: boolean | null;
}
/** app.parking_staff_lots runs as the viewer (RLS: members of this temple only). */
export const staffLots = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<StaffLot>("select * from app.parking_staff_lots($1)", [templeId])).rows);
