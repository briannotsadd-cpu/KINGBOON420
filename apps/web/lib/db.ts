import "server-only";
import { Pool, type PoolClient } from "pg";
import type { ParkingRow } from "./parking";

// Server-side only. Visitor queries run as DB role `anon`; signed-in queries run as `authenticated` with the
// user's id in request.jwt.claims (same model as Supabase Auth), so RLS in the database decides what is visible.
let pool: Pool | null = null;
function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  return pool;
}

async function inTx<T>(setup: (c: PoolClient) => Promise<void>, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await setup(client);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export const asAnon = <T>(fn: (c: PoolClient) => Promise<T>) =>
  inTx(async (c) => { await c.query("set local role anon"); }, fn);

export const asUser = <T>(authUserId: string, fn: (c: PoolClient) => Promise<T>) =>
  inTx(async (c) => {
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: authUserId })]);
    await c.query("set local role authenticated");
  }, fn);

/** Owner connection — only for the authx login tables. Never use for app data. */
export const asServer = <T>(fn: (c: PoolClient) => Promise<T>) => inTx(async () => {}, fn);

export interface TempleListItem { slug: string; name_th: string; province: string | null }
export interface PublicField { field_key: string; label_th: string; category: string; value: unknown; verified_at: Date;
  verification_expires_at: Date | null; source_tier: number; source_name: string }

export const listTemples = (q?: string) =>
  asAnon(async (c) => (await c.query<TempleListItem>("select * from public.listed_temples($1)", [q ?? null])).rows);
/** Only verified temples exist for the public. Returns null when the temple is not public. */
export const templePublic = (slug: string) =>
  asAnon(async (c) => {
    const ok = (await c.query("select 1 from public.temple_profile($1)", [slug])).rowCount;
    if (!ok) return null;
    return (await c.query<PublicField>("select * from public.temple_public_fields($1)", [slug])).rows;
  });
export const templeParking = (slug: string) =>
  asAnon(async (c) => (await c.query<ParkingRow>("select * from public.temple_parking($1)", [slug])).rows);

export interface FieldRow { id: string; field_key: string; label_th: string; category: string; risk: string; sort: number;
  value: unknown; status: string; effective_status: string; status_reason: string | null; verified_at: Date | null;
  verification_expires_at: Date | null; first_approved_by: string | null; source_type: string; source_tier: number;
  source_name: string; source_url: string | null; source_document: string | null; source_date: Date | null;
  evidence: string | null; is_ai_assisted: boolean; retrieved_at: Date; created_at: Date }
export interface CatalogRow { field_key: string; label_th: string; category: string; risk: string; required_for_publish: boolean;
  official_source_expected: boolean; expiry_days: number | null; sort: number }

/** Every candidate value of a temple with its source (RLS: temple admins and platform admins only). */
export const templeFieldRows = (authUserId: string, templeId: string) => asUser(authUserId, async (c) => ({
  catalog: (await c.query<CatalogRow>("select * from public.data_field_catalog order by sort")).rows,
  rows: (await c.query<FieldRow>(
    `select v.id, v.field_key, c.label_th, c.category, c.risk, c.sort, v.value, v.status,
            app.effective_status(v.status, v.verification_expires_at) as effective_status, v.status_reason, v.verified_at,
            v.verification_expires_at, v.first_approved_by, d.source_type, d.tier as source_tier, d.source_name, d.source_url,
            d.source_document, d.source_date, d.evidence, d.is_ai_assisted, d.retrieved_at, v.created_at
       from public.temple_field_values v join public.data_sources d on d.temple_id = v.temple_id and d.id = v.source_id
       join public.data_field_catalog c on c.field_key = v.field_key
      where v.temple_id = $1 order by c.sort, v.created_at`, [templeId])).rows,
  readiness: (await c.query<{ check_key: string; label_th: string; passed: boolean; detail: string }>(
    "select * from app.temple_readiness($1)", [templeId])).rows,
}));
