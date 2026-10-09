type DatabaseEnv = {
  NODE_ENV?: string;
  KINGBOON_DATABASE_URL?: string;
  KINGBOON_SUPABASE_PROJECT_REF?: string;
  DATABASE_URL?: string;
};

/** KINGBOON has its own credentials. Generic DATABASE_URL is only a local-dev compatibility path.
 *  Remote Supabase URLs must match the explicitly configured KINGBOON project reference.
 *  Errors deliberately omit connection strings and passwords. */
export function kingboonDatabaseUrl(env: DatabaseEnv): string {
  const dedicated = env.KINGBOON_DATABASE_URL?.trim();
  const value = dedicated || (env.NODE_ENV !== "production" ? env.DATABASE_URL?.trim() : undefined);
  if (!value) throw new Error("KINGBOON_DATABASE_URL is not set");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid KINGBOON database configuration"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Invalid KINGBOON database protocol");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!dedicated && !local) throw new Error("Remote DATABASE_URL is not allowed for KINGBOON; configure KINGBOON_DATABASE_URL separately");
  if (!local) {
    const ref = env.KINGBOON_SUPABASE_PROJECT_REF?.trim();
    if (!ref || !/^[a-z0-9]{20}$/.test(ref)) throw new Error("KINGBOON_SUPABASE_PROJECT_REF is required for a remote database");
    const direct = url.hostname === `db.${ref}.supabase.co`;
    let username: string;
    try { username = decodeURIComponent(url.username); } catch { throw new Error("Invalid KINGBOON database configuration"); }
    const pooler = /(?:^|\.)pooler\.supabase\.com$/.test(url.hostname) && username.endsWith(`.${ref}`);
    if (!direct && !pooler) throw new Error("Database URL does not match the KINGBOON Supabase project");
  }
  return value;
}
