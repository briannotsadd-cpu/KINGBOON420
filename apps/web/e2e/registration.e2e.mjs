// E2E: claim → temple confirms own data → admin needs verified official evidence → conflict → verified temple → public.
// All values are FICTIONAL TEST DATA in a throwaway DB (reset before/after by e2e/run.sh), sources on .invalid domains.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome });
const ctx = async () => { const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH" });
  c.on("page", (pg) => pg.on("pageerror", (e) => console.error("PAGEERROR:", e.message.slice(0, 300))));
  return c; };
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return p.textContent("main"); };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
const field = (p, key) => p.locator(`article[id="${key}"]`);
async function login(page, email, name) {
  await page.goto(BASE + "/login");
  await page.fill("#email", email); await page.click("button[type=submit]");
  await page.waitForURL("**/login/code**");
  await page.fill("#code", codeFor(email)); await page.click("button[type=submit]");
  await page.waitForURL(/\/(welcome|me)$/);
  if (page.url().endsWith("/welcome")) { await page.fill("#name", name); await page.click("button[type=submit]"); await page.waitForURL("**/me"); }
}
async function clickIn(loc, label, expect) {
  await loc.locator(`button:has-text("${label}")`).first().click();
  try { await loc.page().waitForSelector(`text=${expect}`, { timeout: 15000 }); }
  catch (e) { console.error("HOME-WHILE-STUCK:", execSync(`curl -s -m 10 -o /dev/null -w '%{http_code} %{time_total}s' ${BASE}/`).toString()); console.error("CONNS:", execSync(`psql -h localhost -p 54322 -U postgres -d ${process.env.E2E_DB ?? 'boon'} -Atc "select count(*)||' conns, '||count(*) filter (where state like 'idle in%')||' idle-in-tx' from pg_stat_activity where datname='${process.env.E2E_DB ?? 'boon'}'"`).toString()); console.error("DBSTATE:", execSync(`psql -h localhost -p 54322 -U postgres -d ${process.env.E2E_DB ?? 'boon'} -Atc "select field_key||'='||status from temple_field_values order by created_at; select state||' | '||wait_event_type||' | '||left(query,90) from pg_stat_activity where datname='${process.env.E2E_DB ?? 'boon'}' and pid<>pg_backend_pid()"`).toString()); console.error("URL:", loc.page().url()); console.error("FIELD:", (await loc.textContent()).slice(0, 600)); throw e; }
}

// 1 empty + honest
let p = await (await ctx()).newPage();
await p.goto(BASE + "/");
ok((await text(p)).includes("ยังไม่มีวัดในระบบ"), "empty app: no sample data");
await shot(p, "v-01-home-empty");

// 2 claim with evidence
await login(p, "applicant@example.com", "ผู้ทดสอบ ผู้ดูแล");
await p.click("text=ลงทะเบียนวัดใหม่"); await p.waitForURL("**/me/temples/new");
await p.fill("#name_th", "วัดทดสอบระบบ"); await p.click("button[type=submit]"); await p.waitForSelector("#evidence-err");
ok((await text(p)).includes("กรุณาเลือกว่าคุณเกี่ยวข้องกับวัดอย่างไร") && (await p.inputValue("#name_th")) === "วัดทดสอบระบบ", "claim needs relationship + evidence; input kept");
await shot(p, "v-02-claim-errors");
await p.fill("#province", "จังหวัดทดสอบ"); await p.fill("#address_th", "ที่อยู่ทดสอบ 1"); await p.fill("#phone", "02 000 0001");
await p.selectOption("#relationship", "temple_staff"); await p.fill("#evidence", "ข้อมูลทดสอบอัตโนมัติ ไม่ใช่วัดจริง");
await p.click("button[type=submit]"); await p.waitForURL(/\/me\/temples\/[0-9a-f-]{36}\?registered=1/);
const templeUrl = p.url().split("?")[0];
let t = await text(p);
ok(t.includes("ส่งใบสมัครเรียบร้อยแล้ว") && t.includes("ยังไม่ผ่าน"), "claim sent; readiness shows unmet checks");
await shot(p, "v-03-temple-readiness");

// 3 temple confirms its own entries (name, province, address) — still not public
await p.click("a.btn-primary:has-text('ตรวจสอบข้อมูลวัด')"); await p.waitForURL(/\/verify$/);
for (const k of ["temple.name_th", "temple.province", "temple.address"]) await clickIn(field(p, k), "✓ ยืนยันว่าถูกต้อง", "ยืนยันข้อมูลเรียบร้อยแล้ว");
ok((await field(p, "temple.name_th").textContent()).includes("ยืนยันโดยวัด"), "temple confirmed its own required fields");
await shot(p, "v-04-verify-checklist");
// conflict: a second phone from the temple website disagrees with the claim phone
const ph = field(p, "temple.office_phone");
await ph.locator("summary:has-text('แก้ไข')").click();
await ph.locator('[id="temple.office_phone-value"]').fill("02 000 0002");
await ph.locator('[id="temple.office_phone-source_type"]').selectOption("temple_website");
await ph.locator('[id="temple.office_phone-source_url"]').fill("https://temple.example.invalid/contact");
await ph.locator("button:has-text('บันทึกข้อมูลพร้อมแหล่งที่มา')").click();
await p.waitForSelector("text=บันทึกข้อมูลพร้อมแหล่งที่มาแล้ว");
await p.reload();
ok((await field(p, "temple.office_phone").textContent()).includes("ข้อมูลขัดกัน"), "disagreeing sources => CONFLICT shown, nothing auto-picked");
await shot(p, "v-05-conflict");
await p.goto(BASE + "/"); ok((await text(p)).includes("ยังไม่มีวัดในระบบ"), "still not public (no official evidence, not approved)");

// 4 admin: approval blocked until official evidence is recorded and verified
const a = await (await ctx()).newPage();
await login(a, "admin@example.com", "ผู้ดูแลระบบทดสอบ");
await a.goto(BASE + "/admin");
t = await text(a);
ok(t.includes("ยังอนุมัติไม่ได้") && !(await a.locator("a:has-text('อนุมัติ')").count()) === false || t.includes("ยังอนุมัติไม่ได้"), "approve unavailable without official evidence");
ok((await a.locator("a.btn-primary:has-text('อนุมัติ')").count()) === 0, "no approve button yet");
const evHref = await a.locator("a:has-text('บันทึกหลักฐานทะเบียนวัด')").getAttribute("href");
ok(/^\/admin\/data-verification\/[0-9a-f-]{36}#temple\.name_th$/.test(evHref || ""), "admin card links to the evidence drill-down");
await a.goto(BASE + evHref);
const an = field(a, "temple.name_th");
await an.locator("summary:has-text('บันทึกข้อมูลจากแหล่งทางราชการ')").click();
await an.locator('[id="temple.name_th-value"]').fill("วัดทดสอบระบบ");
await an.locator('[id="temple.name_th-source_url"]').fill("https://registry.example.invalid/test-0001");
await an.locator('[id="temple.name_th-evidence"]').fill("ข้อความทดสอบจากหน้าทะเบียน (fictional)");
await an.locator("button:has-text('บันทึกข้อมูลพร้อมแหล่งที่มา')").click();
await a.waitForSelector("text=บันทึกข้อมูลพร้อมแหล่งที่มาแล้ว");
await a.reload();
await clickIn(field(a, "temple.name_th"), "ตรวจหลักฐานแล้ว ถูกต้อง", "บันทึกว่าตรวจหลักฐานแล้ว");
await shot(a, "v-06-admin-drilldown");
await a.reload();
ok((await text(a)).includes("ประวัติการเปลี่ยนแปลง") && (await a.locator("table.data tbody tr").count()) >= 6, "history table lists every change");
await a.goto(BASE + "/admin");
await a.click("a.btn-primary:has-text('อนุมัติ')"); await a.waitForURL("**/approved");
await a.click("button[type=submit]"); await a.waitForURL(/\/admin\?done=approved$/);
ok((await text(a)).includes("อนุมัติวัดเรียบร้อยแล้ว"), "approved after verified official evidence");
await a.goto(BASE + "/admin/data-verification");
t = await text(a); ok(t.includes("ยังไม่พร้อม"), "overview: temple not ready while a conflict remains");
await shot(a, "v-07-admin-overview");

// 5 temple resolves the conflict, turns on listing => verified temple
await p.goto(templeUrl + "/verify");
const ph2 = field(p, "temple.office_phone");
await ph2.locator('input[name="reason"]').first().fill("สำนักงานวัดแจ้งเบอร์ใหม่ (ทดสอบ)");
await clickIn(ph2, "เลือกข้อมูลนี้", "เลือกข้อมูลนี้แล้ว");
await p.goto(templeUrl);
t = await text(p); ok(!t.includes("ยังไม่ผ่าน") && t.includes("วัดที่ผ่านการตรวจสอบ"), "all readiness checks pass => VERIFIED TEMPLE");
await p.click("button:has-text('เปิดให้คนทั่วไปค้นหา')"); await p.waitForSelector("text=เปิดให้คนทั่วไปค้นหาแล้ว");
await shot(p, "v-08-temple-verified");

// 6 public sees only confirmed data with provenance badge; the unconfirmed phone is not shown
const v = await (await ctx()).newPage();
await v.goto(BASE + "/?q=" + encodeURIComponent("ทดสอบ"));
ok((await text(v)).includes("วัดทดสอบระบบ"), "visitor finds the verified temple");
await v.click("text=วัดทดสอบระบบ"); await v.waitForURL("**/t/**");
t = await text(v);
ok(t.includes("วัดที่ผ่านการตรวจสอบ") && t.includes("✓ ยืนยันโดยวัด") && t.includes("ตรวจสอบล่าสุด") && t.includes("2569"), "public page shows provenance + last-checked date (Buddhist year)");
ok(!t.includes("02 000 0001") && !t.includes("02 000 0002"), "phone not shown: chosen but not yet confirmed by the temple");
await shot(v, "v-09-public-temple");

// 7 database down
// Only THIS suite's database becomes unreachable (other suites may share the cluster): refuse + drop its connections.
const DBN = process.env.E2E_DB ?? "boon";
const pgc = (sql) => execSync(`psql -X -q -h localhost -p 54322 -U postgres -d postgres -c "${sql}"`, { stdio: "ignore" });
pgc(`alter database ${DBN} allow_connections false`); pgc(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${DBN}'`);
await v.goto(BASE + "/"); ok((await text(v)).includes("ตอนนี้ดึงข้อมูลวัดไม่ได้"), "DB down: clear message");
pgc(`alter database ${DBN} allow_connections true`);
await browser.close();
console.log("E2E VERIFICATION PASSED");
