// E2E: visitor opens the app, picks a temple, sees parking. Needs the server on BASE (default :3000) and the
// local dev DB (supabase/dev/local-db.sh). Usage: node e2e/parking.e2e.mjs <chrome-path> <screenshot-dir>
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";

const [chromePath, shots = "."] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const psql = (sql) => execSync(`psql -h localhost -p 54322 -U postgres -d boon -Atqc "${sql}"`).toString().trim();
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };

const browser = await chromium.launch({ executablePath: chromePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "th-TH" });

await page.goto(BASE + "/");
const home = await page.textContent("main");
assert(home.includes("วัดตัวอย่าง เอ"), "home lists listed temple demo-a");
assert(!home.includes("วัดตัวอย่าง บี"), "home does NOT list unlisted demo-b");
await page.screenshot({ path: `${shots}/01-select-temple.png`, fullPage: true });

await page.click("text=วัดตัวอย่าง เอ");
await page.waitForURL("**/t/demo-a");
let lot = await page.textContent('[data-testid="lot-P1"]');
assert(lot.includes("ไม่ทราบสถานะตอนนี้") && !lot.includes("ว่างประมาณ"), "no fresh report => Unknown, no number");
assert(!(await page.textContent("main")).includes("ลานจอดเจ้าหน้าที่"), "staff-only lot hidden from visitors");
await page.screenshot({ path: `${shots}/02-parking-unknown.png`, fullPage: true });

const staff = psql("select id from persons where display_name = 'seed_parking_staff'");
psql(`insert into parking_status_reports(temple_id, lot_id, status, free_spaces, reported_by) values ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-0000000000e1','FILLING',5,'${staff}')`);
await page.reload();
lot = await page.textContent('[data-testid="lot-P1"]');
assert(lot.includes("ใกล้เต็ม") && lot.includes("ว่างประมาณ 5 คัน") && lot.includes("อัปเดตล่าสุด"), "fresh report shown: ใกล้เต็ม, 5 free, time");
await page.screenshot({ path: `${shots}/03-parking-filling.png`, fullPage: true });

const r = await page.goto(BASE + "/t/demo-b");
assert(r.status() === 404 && (await page.textContent("main")).includes("ไม่พบวัดนี้"), "unlisted temple URL => 404, nothing leaked");
await browser.close();
console.log("E2E PASSED");
