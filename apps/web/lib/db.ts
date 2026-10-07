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

export interface TempleListItem { slug: string; name_th: string; name_en: string | null; province: string | null }
export interface TempleProfile { slug: string; name_th: string; province: string | null; address_th: string | null; phone: string | null; description_th: string | null }

export const listTemples = (q?: string) =>
  asAnon(async (c) => (await c.query<TempleListItem>("select * from public.listed_temples($1)", [q ?? null])).rows);
export const templeProfile = (slug: string) =>
  asAnon(async (c) => (await c.query<TempleProfile>("select * from public.temple_profile($1)", [slug])).rows[0] ?? null);
export const templeParking = (slug: string) =>
  asAnon(async (c) => (await c.query<ParkingRow>("select * from public.temple_parking($1)", [slug])).rows);
