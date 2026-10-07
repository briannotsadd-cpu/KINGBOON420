import "server-only";
import { asServer, asUser } from "@/lib/db";

/**
 * GAP (needs a SQL function, we may not change migrations): temples RLS shows a temple only to its members, and
 * app.join_temple_community / the sender's "my messages" need the temple id / name of a PUBLIC temple.
 * These two lookups are the only asServer use in the contact feature. They return nothing but the id/name of a temple
 * that the caller already proved public (templePublic) or that already appears in the caller's own RLS-filtered threads.
 */
export const publicTempleId = (slug: string) =>
  asServer(async (c) => (await c.query<{ id: string }>("select id from public.temples where slug = $1", [slug])).rows[0]?.id ?? null);
export const templeNames = (ids: string[]) =>
  ids.length === 0 ? Promise.resolve(new Map<string, string>()) :
  asServer(async (c) => new Map((await c.query<{ id: string; name_th: string }>(
    "select id, name_th from public.temples where id = any($1::uuid[])", [ids])).rows.map((r) => [r.id, r.name_th])));

export const isFollowing = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query(
    "select 1 from public.memberships where temple_id = $1 and person_id = app.current_person_id() and status = 'active'", [templeId])).rowCount! > 0);

export interface MyThread { id: string; temple_id: string; ref_code: string; topic: string; message: string; status: string;
  reply: string | null; replied_at: Date | null; replied_by_name: string | null; created_at: Date }
export const myThreads = (authUserId: string) =>
  asUser(authUserId, async (c) => (await c.query<MyThread>(
    `select t.id, t.temple_id, t.ref_code, t.topic, t.message, t.status, t.reply, t.replied_at, t.created_at,
            (select p.display_name from public.persons p where p.id = t.replied_by) as replied_by_name
       from public.temple_contact_threads t where t.sender_person_id = app.current_person_id() order by t.created_at desc limit 100`)).rows);

export interface InboxThread { id: string; ref_code: string; topic: string; message: string; status: string; sender_name: string | null;
  sender_phone: string | null; has_account: boolean; reply: string | null; replied_at: Date | null; replied_by_name: string | null;
  assigned_name: string | null; created_at: Date }
export const inboxAccess = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<{ name_th: string | null; allowed: boolean }>(
    `select (select name_th from public.temples where id = $1) as name_th, app.has_permission($1, 'contact_inbox.manage', 'T') as allowed`,
    [templeId])).rows[0]);
export const inboxThreads = (authUserId: string, templeId: string) =>
  asUser(authUserId, async (c) => (await c.query<InboxThread>(
    `select t.id, t.ref_code, t.topic, t.message, t.status, t.sender_name, t.sender_phone, (t.sender_person_id is not null) as has_account,
            t.reply, t.replied_at, t.created_at,
            (select p.display_name from public.persons p where p.id = t.replied_by) as replied_by_name,
            (select p.display_name from public.persons p where p.id = t.assigned_to) as assigned_name
       from public.temple_contact_threads t where t.temple_id = $1 order by t.created_at desc limit 200`, [templeId])).rows);

/** Temples where the signed-in user may run the contact inbox (temples are visible to their members only). */
export const inboxTemples = (authUserId: string) =>
  asUser(authUserId, async (c) => (await c.query<{ id: string; name_th: string }>(
    "select id, name_th from public.temples where app.has_permission(id, 'contact_inbox.manage', 'T') order by name_th")).rows);
