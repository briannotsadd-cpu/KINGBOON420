#!/usr/bin/env node
// Import a hand-captured official registry record as SOURCE_FOUND candidates (never confirmed, never public).
// Usage: node scripts/import-registry.mjs <record.json> --as <platform-admin-email> [--apply]
// Without --apply it only validates and prints what would be written. Requires DATABASE_URL.
import { readFileSync } from "node:fs";
import pg from "pg";
import { validateRegistryRecord } from "../lib/registry-import.mjs";

const [file, ...rest] = process.argv.slice(2);
const as = rest[rest.indexOf("--as") + 1];
const apply = rest.includes("--apply");
if (!file || !rest.includes("--as") || !as) { console.error("usage: import-registry.mjs <record.json> --as <admin-email> [--apply]"); process.exit(2); }

const v = validateRegistryRecord(JSON.parse(readFileSync(file, "utf8")));
if (!v.ok) { console.error("ไม่ผ่านการตรวจ:\n- " + v.errors.join("\n- ")); process.exit(1); }
const rec = JSON.parse(readFileSync(file, "utf8"));
console.log(`ตรวจผ่าน: ${v.rows.length} ช่อง จาก ${v.source.source_type} (${v.source.source_url})`);
if (!apply) { for (const r of v.rows) console.log(`  [dry-run] ${r.field_key} = ${r.value}`); process.exit(0); }

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  const u = await c.query("select id from authx.users where email = lower($1)", [as]);
  if (!u.rowCount) throw new Error("ไม่พบผู้ใช้ " + as);
  await c.query("begin");
  await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: u.rows[0].id })]);
  await c.query("set local role authenticated");
  if (!(await c.query("select app.is_platform_admin() as a")).rows[0].a) throw new Error(as + " ไม่ใช่ผู้ดูแลระบบ");
  for (const r of v.rows) {
    const s = v.source;
    const out = await c.query("select app.record_field_value($1,$2,$3,$4,$5,$6,null,$7,$8,false) as id",
      [rec.temple_id, r.field_key, JSON.stringify(r.value), s.source_type, s.source_name, s.source_url, s.source_date, s.evidence]);
    const st = await c.query("select status from public.temple_field_values where id = $1", [out.rows[0].id]);
    console.log(`  ${r.field_key} → ${st.rows[0].status} (${out.rows[0].id})`);
  }
  await c.query("commit");
  console.log("นำเข้าแล้ว — สถานะ SOURCE_FOUND: ผู้ดูแลระบบต้องตรวจหลักฐาน และวัดต้องยืนยันก่อนขึ้นหน้าสาธารณะ");
} catch (e) { await c.query("rollback").catch(() => {}); console.error("ล้มเหลว:", e.message); process.exitCode = 1; }
finally { await c.end(); }
