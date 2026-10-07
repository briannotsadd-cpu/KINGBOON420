import "server-only";
import { Pool } from "pg";
import type { ParkingRow } from "./parking";

// Server-side only. Every visitor query runs as the database role `anon`, so the database (not this code)
// decides what a visitor may see: only public.listed_temples() and public.temple_parking().
let pool: Pool | null = null;
function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return pool;
}

async function asAnon<T>(sql: string, params: unknown[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("set local role anon");
    const res = await client.query(sql, params);
    await client.query("commit");
    return res.rows as T[];
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export interface TempleListItem { slug: string; name_th: string; name_en: string | null }

export const listTemples = () => asAnon<TempleListItem>("select * from public.listed_temples()", []);
export const templeParking = (slug: string) => asAnon<ParkingRow>("select * from public.temple_parking($1)", [slug]);
