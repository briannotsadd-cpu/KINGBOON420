// E2E: double verification of a CRITICAL field (donation account) and verification expiry, through the browser.
// FICTIONAL data only (throwaway DB). The only direct SQL besides setup is the "time passes" step for expiry, which moves
// verification_expires_at into the past (labelled below) — the app has no clock control.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { clickNav, grantRole, seedVerifiedTemple, sql, waitText } from "./seed.mjs";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome });
const newPage = async () => { const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH" });
  const p = await c.newPage(); p.on("pageerror", (e) => console.error("PAGEERROR:", e.message.slice(0, 300))); return p; };
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return p.textContent("main"); };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
const field = (p, key) => p.locator(`article[id="${key}"]`);
async function login(p, email, name) {
  await p.goto(BASE + "/login");
  await p.fill("#email", email); await clickNav(p, "button[type=submit]", "**/login/code**");
  await p.fill("#code", codeFor(email)); await clickNav(p, "button[type=submit]", /\/(welcome|me)$/);
  if (p.url().endsWith("/welcome")) { await p.fill("#name", name); await clickNav(p, "button[type=submit]", "**/me"); }
}
async function op(p, key, label, expect) {
  await field(p, key).locator(`button:has-text("${label}")`).first().click();
  await waitText(p, expect);
}

const SLUG = "critical-test";
const T = seedVerifiedTemple(SLUG, "วัดทดสอบระบบ");
const KEY = "temple.donation_account";
const ACCOUNT = "บัญชีทดสอบ 000-0-00000-0 (ข้อมูลสมมติ)";

const adm = await newPage(); await login(adm, "templeadmin@example.com", "ผู้ดูแลวัด ทดสอบ");
grantRole("templeadmin@example.com", T, "temple_admin");
const abb = await newPage(); await login(abb, "abbot@example.com", "เจ้าอาวาส ทดสอบ");
grantRole("abbot@example.com", T, "abbot", { monastic: "bhikkhu" });

// 1 temple admin records the donation account (temple's own entry) and gives the FIRST approval
await adm.goto(`${BASE}/me/temples/${T}/verify`);
const f = field(adm, KEY);
ok((await f.textContent()).includes("ต้องยืนยันเป็นพิเศษ"), "donation account is marked as needing special confirmation");
await f.locator("summary:has-text('เพิ่มข้อมูล')").click();
await f.locator(`[id="${KEY}-value"]`).fill(ACCOUNT);
await f.locator(`[id="${KEY}-source_type"]`).selectOption("temple_admin_entry");
await f.locator("button:has-text('บันทึกข้อมูลพร้อมแหล่งที่มา')").click();
await waitText(adm, "บันทึกข้อมูลพร้อมแหล่งที่มาแล้ว");
await adm.reload();
await op(adm, KEY, "อนุมัติขั้นที่ 1", "อนุมัติขั้นที่ 1 แล้ว รอเจ้าอาวาสยืนยันขั้นที่ 2");
ok(sql(`select status || '|' || (first_approved_by is not null) from public.temple_field_values where temple_id = '${T}' and field_key = '${KEY}'`) === "WAITING_TEMPLE_CONFIRMATION|true",
   "after approval 1: still waiting, first approver recorded");
await shot(adm, "v-10-critical-first-approval");

// 2 the SAME person cannot give the second approval
await adm.reload();
await field(adm, KEY).locator('button:has-text("เจ้าอาวาสยืนยัน (ขั้นที่ 2)")').first().click();
await field(adm, KEY).locator(".notice-error, [role=alert]").first().waitFor();
ok(sql(`select status from public.temple_field_values where temple_id = '${T}' and field_key = '${KEY}'`) === "WAITING_TEMPLE_CONFIRMATION", "same person refused as second approver");
await shot(adm, "v-11-critical-same-person-refused");

// 3 public page does not show the account yet
const v = await newPage();
await v.goto(`${BASE}/t/${SLUG}`);
ok(!(await text(v)).includes("000-0-00000-0"), "unconfirmed donation account is not public");

// 4 abbot gives the second approval => TEMPLE_CONFIRMED => public with source line
await abb.goto(`${BASE}/me/temples/${T}/verify`);
await op(abb, KEY, "เจ้าอาวาสยืนยัน (ขั้นที่ 2)", "ยืนยันข้อมูลเรียบร้อยแล้ว");
ok(sql(`select status from public.temple_field_values where temple_id = '${T}' and field_key = '${KEY}'`) === "TEMPLE_CONFIRMED", "abbot's second approval confirms");
await shot(abb, "v-12-critical-confirmed");
await v.goto(`${BASE}/t/${SLUG}`);
let t = await text(v);
ok(t.includes("000-0-00000-0") && t.includes("ยืนยันโดยวัด"), "confirmed donation account public with 'ยืนยันโดยวัด'");

// 5 expiry. SETUP (time passing): move the expiry date into the past — the only way to test without waiting 365 days.
sql(`update public.temple_field_values set verification_expires_at = now() - interval '1 day' where temple_id = '${T}' and field_key = '${KEY}'`);
await v.goto(`${BASE}/t/${SLUG}`);
ok(!(await text(v)).includes("000-0-00000-0"), "expired donation account disappears from the public page");
await shot(v, "v-13-expired-hidden");
await adm.goto(`${BASE}/me/temples/${T}/verify`);
ok((await field(adm, KEY).textContent()).includes("หมดอายุการตรวจสอบ ต้องตรวจซ้ำ"), "temple sees 'expired, re-check needed'");
await shot(adm, "v-14-expired-checklist");
// re-confirmation of a critical field also needs two people (migration 0013): step 1 temple admin, step 2 the abbot
await op(adm, KEY, "ยืนยันซ้ำ ขั้นที่ 1", "ยืนยันซ้ำขั้นที่ 1 แล้ว รอเจ้าอาวาสยืนยันขั้นที่ 2");
await v.goto(`${BASE}/t/${SLUG}`);
ok(!(await text(v)).includes("000-0-00000-0"), "after step 1 the account is still hidden");
await adm.reload();
await field(adm, KEY).locator('button:has-text("เจ้าอาวาสยืนยันซ้ำ (ขั้นที่ 2)")').first().click();
await field(adm, KEY).locator(".notice-error, [role=alert]").first().waitFor();
ok((await field(adm, KEY).textContent()).includes("คนละคน"), "same person cannot complete the re-confirmation");
await abb.goto(`${BASE}/me/temples/${T}/verify`);
await op(abb, KEY, "เจ้าอาวาสยืนยันซ้ำ (ขั้นที่ 2)", "ยืนยันซ้ำเรียบร้อยแล้ว");
ok(sql(`select status || '|' || (verification_expires_at > now()) from public.temple_field_values where temple_id = '${T}' and field_key = '${KEY}'`) === "TEMPLE_CONFIRMED|true", "abbot completes re-confirmation: fresh expiry");
await v.goto(`${BASE}/t/${SLUG}`);
ok((await text(v)).includes("000-0-00000-0"), "re-confirmed account public again");
await shot(v, "v-15-reconfirmed-public");
await browser.close();
console.log("E2E CRITICAL + EXPIRY PASSED");
