// E2E round 1: empty app → login with email code → register temple → admin approves → public sees it → DB down.
// Needs: server on BASE with PLATFORM_ADMIN_EMAILS=admin@example.com, server log at LOG, fresh dev DB.
// Usage: node e2e/registration.e2e.mjs <chrome> <shots-dir> <server-log>
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => { const m = [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))]; return m.at(-1)?.[1]; };
const browser = await chromium.launch({ executablePath: chrome });
const ctx = () => browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH" });
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return p.textContent("main"); };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });

async function login(page, email, name) {
  await page.goto(BASE + "/login");
  await page.fill("#email", email); await page.click("button[type=submit]");
  await page.waitForURL("**/login/code**");
  await page.fill("#code", codeFor(email)); await page.click("button[type=submit]");
  await page.waitForURL(/\/(welcome|me)$/);
  if (page.url().endsWith("/welcome")) { await page.fill("#name", name); await page.click("button[type=submit]"); await page.waitForURL("**/me"); }
}

// 1 empty app is honest
let p = await (await ctx()).newPage();
await p.goto(BASE + "/");
const home0 = await text(p); if (!home0.includes("ยังไม่มีวัดในระบบ")) console.error("PAGE:", home0.slice(0, 400));
ok(home0.includes("ยังไม่มีวัดในระบบ"), "empty app says there are no temples yet (no sample data)");
await shot(p, "r1-01-home-empty");

// 2 bad email keeps the value and explains
await p.goto(BASE + "/login");
await p.fill("#email", "somchai@gmail"); await p.click("button[type=submit]");
await p.waitForSelector("#email-err");
ok((await p.inputValue("#email")) === "somchai@gmail" && (await text(p)).includes("อีเมลไม่ถูกต้อง"), "invalid email: inline error, value kept");
await shot(p, "r1-02-login-error");

// 3 applicant: wrong code, then right code, name, register
await p.fill("#email", "applicant@example.com"); await p.click("button[type=submit]");
await p.waitForURL("**/login/code**");
ok((await text(p)).includes("ยังไม่ได้ส่งอีเมลจริง"), "code page says plainly that no real email was sent (mail not configured)");
await shot(p, "r1-03-code-page");
await p.fill("#code", "000000"); await p.click("button[type=submit]");
await p.waitForSelector("#code-err");
ok((await text(p)).includes("รหัสไม่ถูกต้อง"), "wrong code rejected with clear message");
await p.fill("#code", codeFor("applicant@example.com")); await p.click("button[type=submit]");
await p.waitForURL("**/welcome");
await p.fill("#name", "ส"); await p.click("button[type=submit]"); await p.waitForSelector("#name-err");
ok(true, "too-short name rejected inline");
await p.fill("#name", "สมชาย ผู้ดูแล"); await p.click("button[type=submit]"); await p.waitForURL("**/me");
ok((await text(p)).includes("คุณยังไม่มีวัดในระบบ"), "my page empty state");
await shot(p, "r1-04-me-empty");
await p.click("text=ลงทะเบียนวัดใหม่"); await p.waitForURL("**/me/temples/new");
await p.fill("#phone", "abc"); await p.click("button[type=submit]");
await p.waitForSelector("#name_th-err");
ok((await p.inputValue("#phone")) === "abc" && (await text(p)).includes("กรุณากรอกจังหวัด"), "required fields + bad phone flagged, input kept");
await shot(p, "r1-05-register-errors");
await p.fill("#name_th", "วัดทดสอบระบบ"); await p.fill("#province", "นนทบุรี"); await p.fill("#phone", "02 123 4567");
await p.fill("#address_th", "1 ถนนทดสอบ"); await p.click("button[type=submit]");
await p.waitForURL(/\/me\/temples\/[0-9a-f-]{36}/);
ok((await text(p)).includes("ส่งใบสมัครเรียบร้อยแล้ว") && (await text(p)).includes("รออนุมัติ"), "application sent, status pending");
await p.check("input[name=is_listed]"); await p.click("button[type=submit]");
await p.waitForSelector("text=บันทึกข้อมูลวัดเรียบร้อยแล้ว");
ok(true, "profile saved with real confirmation");
await shot(p, "r1-06-temple-pending");
await p.goto(BASE + "/");
ok((await text(p)).includes("ยังไม่มีวัดในระบบ"), "pending temple is NOT public even though listing is on");
await p.goto(BASE + "/me"); await p.click("text=ออกจากระบบ"); await p.waitForURL(BASE + "/");

// 4 admin approves with confirmation page
p = await (await ctx()).newPage();
await login(p, "admin@example.com", "ผู้ดูแลระบบ");
await p.click("text=ตรวจสอบวัดที่รออนุมัติ"); await p.waitForURL("**/admin");
const adm = await text(p); if (!adm.includes("วัดทดสอบระบบ")) console.error("PAGE:", adm.slice(0, 500));
ok(adm.includes("วัดทดสอบระบบ"), "admin sees pending application");
await shot(p, "r1-07-admin-pending");
await p.click("a:has-text('อนุมัติ') >> nth=0"); await p.waitForURL("**/review/**/approved");
ok((await text(p)).includes("ยืนยันการอนุมัติ"), "confirmation page before irreversible action");
await shot(p, "r1-08-admin-confirm");
await p.click("button[type=submit]"); await p.waitForURL(/\/admin\?done=approved$/);
ok((await text(p)).includes("อนุมัติวัดเรียบร้อยแล้ว") && (await text(p)).includes("ไม่มีวัดที่รออนุมัติ"), "approved; queue empty");

// 5 public visitor finds it
p = await (await ctx()).newPage();
await p.goto(BASE + "/?q=" + encodeURIComponent("นนทบุรี"));
ok((await text(p)).includes("วัดทดสอบระบบ"), "visitor finds approved temple by province");
await shot(p, "r1-09-search-result");
await p.click("text=วัดทดสอบระบบ"); await p.waitForURL("**/t/**");
const tp = await text(p);
ok(tp.includes("โทร 02 123 4567") && tp.includes("วัดยังไม่ได้ให้ข้อมูลที่จอดรถ"), "temple page shows real profile and honest parking state");
await shot(p, "r1-10-temple-public");

// 6 database down → honest error, no fake content
execSync("bash ../../supabase/dev/local-db.sh stop", { stdio: "ignore" });
await p.goto(BASE + "/");
ok((await text(p)).includes("ตอนนี้ดึงข้อมูลวัดไม่ได้"), "DB down: clear error message");
await shot(p, "r1-11-db-down");
execSync("bash ../../supabase/dev/local-db.sh start", { stdio: "ignore" });
await browser.close();
console.log("E2E ROUND 1 PASSED");
