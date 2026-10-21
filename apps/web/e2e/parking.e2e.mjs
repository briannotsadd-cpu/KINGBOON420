// E2E: staff parking screens - add lots, confirm before public, gate report, public view, reconfirm after edit.
// FICTIONAL data in a throwaway DB. Phone viewport.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { clickNav, grantRole, seedVerifiedTemple, sql, waitText } from "./seed.mjs";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome });
const page = async (ip) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH", extraHTTPHeaders: { "x-forwarded-for": ip } });
  const p = await c.newPage(); p.on("pageerror", (e) => console.error("PAGEERROR:", e.message.slice(0, 300))); return p;
};
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return (await p.textContent("main")) ?? ""; };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
async function login(p, email, name) {
  await p.goto(BASE + "/login");
  await p.fill("#email", email); await clickNav(p, "button[type=submit]", "**/login/code**");
  await p.fill("#code", codeFor(email)); await clickNav(p, "button[type=submit]", /\/(welcome|me)$/);
  if (p.url().endsWith("/welcome")) { await p.fill("#name", name); await clickNav(p, "button[type=submit]", "**/me"); }
}
const noOverflow = async (p, m) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${m}: no horizontal scroll at phone width`);
const status = (p, code) => p.getAttribute(`[data-testid=board-${code}]`, "data-status");

const SLUG = "parking-test";
const T = seedVerifiedTemple(SLUG, "วัดทดสอบระบบ");
const fm = await page("198.51.100.21"); await login(fm, "facility@example.com", "ผู้ดูแลสถานที่ทดสอบ");
grantRole("facility@example.com", T, "facility_manager");
const ab = await page("198.51.100.22"); await login(ab, "abbot@example.com", "เจ้าอาวาสทดสอบ");
grantRole("abbot@example.com", T, "abbot", { monastic: "bhikkhu" });
const tp = await page("198.51.100.23"); await login(tp, "traffic@example.com", "เจ้าหน้าที่จราจรทดสอบ");
grantRole("traffic@example.com", T, "traffic_staff");
const cm = await page("198.51.100.24"); await login(cm, "member@example.com", "สมาชิกทดสอบ");
grantRole("member@example.com", T, "community_member");
const pub = await page("198.51.100.25");

// 1 community member: explanation, no form, no manage
await cm.goto(`${BASE}/temple/${T}/parking`);
let t = await text(cm);
ok(t.includes("หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับมอบหมายดูแลลานจอดรถเท่านั้น") && (await cm.locator("form").count()) === 0, "community member: staff page explains and shows no form");
await cm.goto(`${BASE}/temple/${T}/parking/manage`);
ok((await text(cm)).includes("หน้านี้สำหรับผู้ดูแลสถานที่") && (await cm.locator("form").count()) === 0, "community member: manage page explains and shows no form");

// 2 facility manager: empty state leads to the first lot
await fm.goto(`${BASE}/temple/${T}`);
ok((await fm.locator("[data-testid=menu-parking]").count()) === 1, "facility manager: temple menu has ลานจอดรถ");
await clickNav(fm, "[data-testid=menu-parking]", `**/temple/${T}/parking`, { retry: true });
ok((await text(fm)).includes("ยังไม่มีลานจอดที่เปิดใช้งาน"), "empty state: ยังไม่มีลานจอดที่เปิดใช้งาน");
await shot(fm, "pk-01-staff-empty");
await clickNav(fm, "a:has-text('เพิ่มลานจอดแรก')", `**/temple/${T}/parking/manage`, { retry: true });
await fm.waitForSelector("[data-testid=form-lot-add]");

// 3 invalid input keeps what was typed
await fm.fill("#code", "ลาน 1"); await fm.fill("#name_th", "ลานจอดหน้าวัด"); await fm.fill("#capacity", "40"); await fm.fill("#accessible", "50");
await fm.click("[data-testid=form-lot-add] button[type=submit]");
await fm.waitForSelector("#code-err");
t = await text(fm);
ok(t.includes("รหัสลานใช้ตัวพิมพ์ใหญ่") && t.includes("ช่องจอดผู้พิการต้องไม่เกินความจุ") && (await fm.inputValue("#name_th")) === "ลานจอดหน้าวัด",
  "invalid code and accessible > capacity -> Thai errors, input kept");
await shot(fm, "pk-02-manage-errors");

// 4 add P1 (public) and P2 (staff only)
await fm.fill("#code", "p1"); await fm.fill("#accessible", "2"); await fm.fill("#fee", "ฟรี"); await fm.fill("#hours", "06:00–18:00");
await fm.check("[data-testid=form-lot-add] input[value=motorcycle]");
await fm.click("[data-testid=form-lot-add] button[type=submit]");
await waitText(fm, "เพิ่มลาน P1 แล้ว");
ok((await fm.inputValue("#code")) === "", "after adding, the form is empty for the next lot");
await fm.fill("#code", "P2"); await fm.fill("#name_th", "ลานจอดเจ้าหน้าที่"); await fm.fill("#capacity", "10");
await fm.uncheck("[data-testid=form-lot-add] input[name=is_public]");
await fm.click("[data-testid=form-lot-add] button[type=submit]");
await waitText(fm, "เพิ่มลาน P2 แล้ว");
await fm.waitForSelector("[data-testid=lot-row-P2]");
t = await text(fm);
ok((await fm.textContent("[data-testid=lot-row-P1]")).includes("รอวัดยืนยัน") && (await fm.textContent("[data-testid=lot-row-P2]")).includes("เฉพาะเจ้าหน้าที่"),
  "P1 waits for the temple, P2 is staff-only");
ok(t.includes("ให้เจ้าอาวาสหรือผู้ดูแลวัดเป็นผู้ยืนยัน") && (await fm.locator("button:has-text('ยืนยันข้อมูล')").count()) === 0, "facility manager cannot confirm: no confirm button, says who can");
await noOverflow(fm, "manage page");
await shot(fm, "pk-03-manage-added");

// 5 the public does not see an unconfirmed lot
await pub.goto(`${BASE}/t/${SLUG}/parking`);
t = await text(pub);
ok(t.includes("วัดยังไม่ได้ยืนยันข้อมูลที่จอดรถ") && !t.includes("ลานจอดหน้าวัด"), "public: unconfirmed lot hidden");

// 6 the abbot confirms P1
await ab.goto(`${BASE}/temple/${T}/parking/manage`);
await ab.click("[data-testid=lot-row-P1] button:has-text('ยืนยันข้อมูล P1')");
await waitText(ab, "ยืนยันข้อมูลลานจอดแล้ว");
ok((await ab.textContent("[data-testid=lot-row-P1]")).includes("วัดยืนยันแล้ว") && (await ab.locator("[data-testid=lot-row-P2] form").count()) === 0,
  "abbot confirmed P1; a staff-only lot has nothing to confirm");
await shot(ab, "pk-04-confirmed");
await pub.goto(`${BASE}/t/${SLUG}/parking`);
t = await text(pub);
ok(t.includes("ลานจอดหน้าวัด") && t.includes("ไม่ทราบสถานะตอนนี้") && !t.includes("ลานจอดเจ้าหน้าที่"), "public: confirmed P1 shown as unknown, staff lot hidden");

// 7 traffic staff reports from the gate
await tp.goto(`${BASE}/temple/${T}`);
await clickNav(tp, "[data-testid=menu-parking]", `**/temple/${T}/parking`, { retry: true });
await tp.waitForSelector("[data-testid=form-report]");
ok((await tp.locator("a:has-text('จัดการลานจอด')").count()) === 0, "traffic staff: no manage link");
await tp.click("[data-testid=form-report] button[type=submit]");
await waitText(tp, "กรุณาเลือกสถานะของลานจอดก่อนส่ง");
ok(true, "sending without a status -> Thai error");
await tp.click("[data-testid=status-FILLING]");
await tp.click("[data-testid=form-report] summary");
await tp.fill("#free", "50");
await tp.click("[data-testid=form-report] button[type=submit]");
await waitText(tp, "ลานนี้จุได้ 40 คัน");
ok((await tp.inputValue("#free")) === "50" && await tp.isChecked("[data-testid=status-FILLING] input"), "count above capacity refused, status and count kept");
await tp.fill("#free", "5"); await tp.fill("#note", "ทางเข้าฝั่งตะวันออกปิด ใช้ประตู 2");
await shot(tp, "pk-05-report-filled");
await tp.click("[data-testid=form-report] button[type=submit]");
await waitText(tp, "ส่งสถานะ ลานจอดหน้าวัด แล้ว");
await tp.waitForFunction(() => document.querySelector("[data-testid=board-P1]")?.getAttribute("data-status") === "FILLING");
t = await text(tp);
ok(t.includes("รายงานเมื่อสักครู่ (โดยคุณ)") && t.includes("ทางเข้าฝั่งตะวันออกปิด"), "board shows FILLING, who/when and the note");
ok(!(await tp.isChecked("[data-testid=status-FILLING] input")), "after sending, the status choice is cleared for the next report");
await noOverflow(tp, "staff parking page");
await shot(tp, "pk-06-board");

// 8 report the staff lot via its card link
await clickNav(tp, "[data-testid=board-P2] a:has-text('รายงานลาน P2')", /parking\?lot=/, { retry: true });
await tp.waitForFunction(() => document.querySelector("[data-testid=pick-P2] input")?.checked);
await tp.click("[data-testid=status-FULL]");
await tp.click("[data-testid=form-report] button[type=submit]");
await waitText(tp, "ส่งสถานะ ลานจอดเจ้าหน้าที่ แล้ว");
await tp.waitForFunction(() => document.querySelector("[data-testid=board-P2]")?.getAttribute("data-status") === "FULL");
ok(await status(tp, "P1") === "FILLING", "card link preselects P2; FULL recorded, P1 unchanged");

// 9 the public sees the fresh report
await pub.goto(`${BASE}/t/${SLUG}/parking`);
t = await text(pub);
ok(t.includes("ใกล้เต็ม") && t.includes("ว่างประมาณ 5 คัน") && !t.includes("ลานจอดเจ้าหน้าที่"), "public: P1 ใกล้เต็ม, ว่างประมาณ 5 คัน; staff lot still hidden");
await shot(pub, "pk-07-public");

// 10 editing what visitors see needs a new confirmation
const P1 = sql(`select id from public.parking_lots where temple_id = '${T}' and code = 'P1'`);
await fm.goto(`${BASE}/temple/${T}/parking/manage?edit=${P1}`);
await fm.waitForSelector("[data-testid=form-lot-edit]");
ok((await fm.textContent("[data-testid=lot-code-readonly]")) === "P1", "edit form shows the code read-only");
await fm.fill("#name_th", "ลานจอดหน้าวัด (ฝั่งตะวันออก)");
await fm.click("[data-testid=form-lot-edit] button[type=submit]");
await waitText(fm, "ต้องให้วัดยืนยันใหม่");
await fm.waitForFunction(() => document.querySelector("[data-testid=lot-row-P1]")?.textContent.includes("รอวัดยืนยัน"));
await pub.goto(`${BASE}/t/${SLUG}/parking`);
ok((await text(pub)).includes("วัดยังไม่ได้ยืนยันข้อมูลที่จอดรถ"), "public: edited lot hidden until the temple confirms again");
await ab.goto(`${BASE}/temple/${T}/parking/manage`);
await ab.click("[data-testid=lot-row-P1] button:has-text('ยืนยันข้อมูล P1')");
await waitText(ab, "ยืนยันข้อมูลลานจอดแล้ว");
await pub.goto(`${BASE}/t/${SLUG}/parking`);
ok((await text(pub)).includes("ลานจอดหน้าวัด (ฝั่งตะวันออก)"), "public: reconfirmed lot is back with the new name");

// 11 declaration setting
await fm.goto(`${BASE}/temple/${T}/parking/manage`);
await fm.selectOption("#declared", "lots");
await fm.click("[data-testid=form-declared] button[type=submit]");
await waitText(fm, "บันทึกการตั้งค่าที่จอดรถของวัดแล้ว");
ok(sql(`select parking_declared from public.temples where id = '${T}'`) === "lots", "declaration saved through the database function");
ok(Number(sql(`select count(*) from public.audit_logs where temple_id = '${T}' and action like 'parking.%'`)) >= 6, "every parking change is audited");

console.log("ALL PARKING E2E CHECKS PASSED");
await browser.close();
