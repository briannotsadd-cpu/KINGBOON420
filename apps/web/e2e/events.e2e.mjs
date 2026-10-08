// E2E: Events (Boss Quest). FICTIONAL data in a throwaway DB (reset by e2e/run.sh). Phone viewport.
// Every rule is decided by the database; this spec drives the real UI and checks what the database allowed or refused.
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
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return (await p.textContent("main")).replace(/\s+/g, " "); };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
async function login(p, email, name) {
  await p.goto(BASE + "/login");
  await p.fill("#email", email); await clickNav(p, "button[type=submit]", "**/login/code**");
  await p.fill("#code", codeFor(email)); await clickNav(p, "button[type=submit]", /\/(welcome|me)$/);
  if (p.url().endsWith("/welcome")) { await p.fill("#name", name); await clickNav(p, "button[type=submit]", "**/me"); }
}
// React resets an uncontrolled form right after an action finishes; let that settle before typing again.
const settle = async (p) => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(400); };
const noOverflow = async (p, m) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${m}: no horizontal scroll at phone width`);
const minSizes = async (p, m) => {
  const bad = await p.evaluate(() => [...document.querySelectorAll("main button, main a.btn")].filter((b) => b.getBoundingClientRect().height < 47.5).map((b) => b.textContent.trim().slice(0, 30)));
  ok(bad.length === 0, `${m}: buttons are at least 48px tall${bad.length ? " (too small: " + bad.join(", ") + ")" : ""}`);
};

const SLUG = "test-temple";
const TID = seedVerifiedTemple(SLUG, "วัดทดสอบระบบ");
const H = 3600_000, now = Date.now();
const bkk = (ms, hhmm) => new Date(ms + 7 * H).toISOString().slice(0, 11) + hhmm;   // Bangkok wall-clock "YYYY-MM-DDThh:mm"
const START = bkk(now + 10 * 24 * H, "09:00"), END = bkk(now + 10 * 24 * H, "12:00"), DUE = bkk(now + 9 * 24 * H, "09:00");
const EV_URL = (id) => `${BASE}/temple/${TID}/events/${id}`;
const evId = (p) => p.url().match(/\/events\/([0-9a-f-]{36})/)[1];

// users: email, name, role, options
const U = {
  sec: ["sec@example.com", "เลขา ทดสอบ", "monk_secretary", { monastic: "bhikkhu" }],
  abbot: ["abbot@example.com", "เจ้าอาวาส ทดสอบ", "abbot", { monastic: "bhikkhu" }],
  dep: ["dep@example.com", "รองเจ้าอาวาส ทดสอบ", "deputy_abbot", { monastic: "bhikkhu" }],
  staff: ["staff@example.com", "เจ้าหน้าที่ ทดสอบ", "staff_general", {}],
  fm: ["fm@example.com", "ผู้ดูแลอาคาร ทดสอบ", "facility_manager", {}],
  cm: ["cm1@example.com", "อาสา หนึ่ง", "community_member", {}],
  cm2: ["cm2@example.com", "อาสา สอง", "community_member", {}],
};
const P = {};
let ip = 10;
for (const [k, [email, name]] of Object.entries(U)) { P[k] = await page(`198.51.100.${ip++}`); await login(P[k], email, name); }
for (const [email, , role, opts] of Object.values(U)) grantRole(email, TID, role, opts);
const outsider = await page("198.51.100.99"); await login(outsider, "outsider@example.com", "คนนอก ทดสอบ");
const anon = await page("198.51.100.98");

// 1 community member cannot create; non-member sees nothing
await P.cm.goto(`${BASE}/temple/${TID}/events`);
let t = await text(P.cm);
ok(t.includes("งานและกิจกรรมของวัด") && !t.includes("สร้างงานใหม่") && t.includes("ยังไม่มีงานที่กำลังจะถึง"), "community member: events list without 'create' button");
await P.cm.goto(`${BASE}/temple/${TID}/events/new`);
ok((await text(P.cm)).includes("การสร้างงานทำได้เฉพาะผู้ที่วัดมอบหมาย"), "community member cannot open the create form");
await outsider.goto(`${BASE}/temple/${TID}/events`);
ok((await text(outsider)).includes("สำหรับสมาชิกของวัดเท่านั้น"), "non-member: members-only notice, no data");

// 2 secretary creates a public event; validation keeps input
const sec = P.sec;
await sec.goto(`${BASE}/temple/${TID}/events`);
ok((await text(sec)).includes("สร้างงานใหม่"), "secretary sees 'สร้างงานใหม่'");
await shot(sec, "e-01-list-empty");
await clickNav(sec, "a:has-text('สร้างงานใหม่')", `**/temple/${TID}/events/new`, { retry: true });
await sec.fill("#title", "ก");
await sec.click("button[type=submit]");
await sec.waitForSelector("#title-err");
t = await text(sec);
ok(t.includes("ชื่องานต้องยาว 2 ถึง 120") && t.includes("กรุณาใส่วันและเวลาเริ่มงาน"), "form validation messages in Thai");
await settle(sec);
ok((await sec.inputValue("#title")) === "ก", "title kept after validation error");
await shot(sec, "e-02-form-errors");
await sec.fill("#title", "ทอดกฐินสามัคคี (ทดสอบ)");
await sec.selectOption("#kind", "merit_offering");
await sec.fill("#description", "งานทดสอบระบบ ข้อมูลสมมติ");
await sec.fill("#starts", END); await sec.fill("#ends", START);
await sec.fill("#venue", "ศาลาการเปรียญ (สมมติ)");
await sec.selectOption("#visibility", "public");
await sec.fill("#expected", "300");
await sec.click("button[type=submit]");
await sec.waitForSelector("#ends-err");
await settle(sec);
ok((await text(sec)).includes("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มงาน") && (await sec.inputValue("#venue")) === "ศาลาการเปรียญ (สมมติ)", "end-before-start refused, other input kept");
await sec.fill("#starts", START); await sec.fill("#ends", END);
const leadOpts = await sec.$$eval("#lead option", (o) => o.map((x) => x.textContent));
ok(leadOpts.length === 8 && leadOpts.some((x) => x.startsWith("รองเจ้าอาวาส ทดสอบ")), "lead select lists the members the secretary may see (7 + 'ยังไม่เลือก')");
await noOverflow(sec, "create form");
await sec.click("button[type=submit]");
await sec.waitForURL(/\/events\/[0-9a-f-]{36}$/);
const EV = evId(sec);
await sec.waitForSelector("[data-testid=event-title]");
t = await text(sec);
ok(t.includes("ทอดกฐินสามัคคี (ทดสอบ)") && t.includes("ร่าง") && t.includes("สาธารณะ"), "event created as draft, visibility public");
ok(t.includes("2569") || t.includes("2570"), "dates shown in Thai Buddhist year");
ok(sql(`select starts_at = '${START}:00+07'::timestamptz from public.events where id = '${EV}'`) === "t", "start stored as Asia/Bangkok time");
await shot(sec, "e-03-detail-draft");

// 3 plan refused without a lead -> set lead -> plan
await sec.click("button[name=op][value=plan]");
await waitText(sec, "ต้องเลือกผู้รับผิดชอบงานก่อนวางแผน");
ok(sql(`select status from public.events where id = '${EV}'`) === "DRAFT", "plan refused without lead (still DRAFT)");
await shot(sec, "e-04-plan-refused");
await clickNav(sec, "a:has-text('แก้ไขรายละเอียดงาน')", `**/events/${EV}/edit`, { retry: true });
ok((await sec.inputValue("#title")) === "ทอดกฐินสามัคคี (ทดสอบ)" && (await sec.inputValue("#starts")) === START, "edit form is prefilled (times back in Bangkok time)");
await sec.selectOption("#lead", { label: "เลขา ทดสอบ (พระ)" });
await sec.click("button[type=submit]");
await sec.waitForURL(EV_URL(EV));
await waitText(sec, "เลขา ทดสอบ");
await sec.click("button[name=op][value=plan]");
await waitText(sec, "วางแผนงานแล้ว");
await waitText(sec, "กำลังวางแผน");
ok(sql(`select status from public.events where id = '${EV}'`) === "PLANNING", "plan accepted after lead is set");

// 4 staffing targets, monk, task
const addTarget = async (p, category, label, required) => {
  await p.selectOption("#t-category", category); await p.fill("#t-label", label); await p.fill("#t-required", String(required));
  await p.click("button:has-text('เพิ่มเป้าหมายกำลังคน')"); await waitText(p, "เพิ่มเป้าหมายกำลังคนแล้ว");
  await settle(p);
};
await sec.fill("#t-label", "");
await sec.click("button:has-text('เพิ่มเป้าหมายกำลังคน')");
await sec.waitForSelector("#t-label-err");
await settle(sec);
ok((await text(sec)).includes("จำนวนที่ต้องการต้องเป็นตัวเลข 1 ถึง 500"), "target form validation in Thai");
await addTarget(sec, "volunteer", "อาสาจัดสถานที่", 2);
await sec.waitForSelector("[data-testid='target-อาสาจัดสถานที่']");
await addTarget(sec, "monk", "พระสวดมนต์", 1);
await sec.waitForSelector("[data-testid='target-พระสวดมนต์']");
ok(sql(`select count(*) from public.event_staffing_targets where event_id = '${EV}'`) === "2", "volunteer target (2) + monk target (1) saved");
const monkCard = "[data-testid='target-พระสวดมนต์']";
const monkOpts = await sec.$$eval(`${monkCard} select[name=person_id] option`, (o) => o.map((x) => x.textContent));
ok(monkOpts.some((x) => x.includes("รองเจ้าอาวาส")) && !monkOpts.some((x) => x.includes("เจ้าหน้าที่ ทดสอบ")), "monk target offers monks only");
await sec.selectOption(`${monkCard} select[name=person_id]`, { label: "รองเจ้าอาวาส ทดสอบ" });
await sec.click(`${monkCard} button:has-text('เพิ่มเข้าเป้าหมายนี้')`);
await waitText(sec, "เพิ่มผู้ร่วมงานแล้ว");
await sec.waitForSelector(`${monkCard} :text('ยืนยันแล้ว')`);
ok(sql(`select count(*) from public.event_participants where event_id = '${EV}' and status = 'CONFIRMED'`) === "1", "monk added and confirmed");
const wopts = await sec.$$eval("#k-weight option", (o) => o.map((x) => x.textContent));
ok(wopts.join(",") === "ต่ำ,ปกติ,สูง,สำคัญมาก,วิกฤต", "task weights have Thai labels");
await sec.fill("#k-title", "เตรียมเครื่องเสียง");
await sec.selectOption("#k-weight", "3");
await sec.check("input[name=gate]");
await sec.fill("#k-due", DUE);
await sec.selectOption("#k-assignee", { label: "เจ้าหน้าที่ ทดสอบ" });
await sec.click("button:has-text('เพิ่มงานย่อย')");
await waitText(sec, "เพิ่มงานย่อยแล้ว");
await sec.waitForSelector("[data-testid='task-เตรียมเครื่องเสียง']");
ok(sql(`select is_gate and weight = 3 from public.quests where event_id = '${EV}'`) === "t", "task saved with weight สูง and gate");

// 5 readiness NOT_READY with G-STAFF FAIL (managers see gates)
const gates = (p) => p.$$eval("[data-testid^=gate-]", (els) => Object.fromEntries(els.map((e) => [e.dataset.testid.slice(5), e.dataset.result])));
const stateIs = async (p, s, pct) => {
  await p.waitForSelector(`[data-testid=readiness-state][data-state=${s}]`, { timeout: 20000 });
  if (pct !== undefined) ok((await p.textContent("[data-testid=readiness-percent]")).trim() === `${pct}%`, `readiness ${s} ${pct}%`);
};
await stateIs(sec, "NOT_READY", 24);
let g = await gates(sec);
ok(g["G-STAFF"] === "FAIL" && g["G-OWNER"] === "PASS" && g["G-VENUE"] === "PASS" && g["G-CRIT"] === "PASS" && g["G-CHECK"] === "PASS", "gates: G-STAFF FAIL, others PASS");
t = await text(sec);
ok(t.includes("ยังไม่พร้อม") && t.includes("กำลังคนถึงขั้นต่ำของเป้าหมายบังคับ") && t.includes("ยังขาดอาสาสมัคร: 2 คน"), "readiness panel in Thai with volunteer gap");
ok(await sec.locator("[data-testid=event-checklist]").count() === 1 && (await sec.textContent("[data-testid=event-checklist]")).includes("ไม่ได้ใช้ AI"), "manager sees the rule-based event checklist (labelled: no AI)");
await shot(sec, "e-05-readiness-not-ready");
await noOverflow(sec, "event detail (manager)");
await minSizes(sec, "event detail (manager)");

// 6 approve: secretary refused -> abbot approves
await sec.click("button[name=op][value=approve]");
await waitText(sec, "ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายอนุมัติ");
ok(sql(`select status from public.events where id = '${EV}'`) === "PLANNING", "secretary cannot approve (event.approve is only delegated)");
await shot(sec, "e-06-approve-refused");
const abbot = P.abbot;
await abbot.goto(EV_URL(EV));
await abbot.click("button[name=op][value=approve]");
await waitText(abbot, "อนุมัติงานแล้ว");
ok(sql(`select status from public.events where id = '${EV}'`) === "APPROVED", "abbot approves");

// 7 volunteers sign up; a volunteer sees no approval controls and only state + percent
const cm = P.cm;
await cm.goto(EV_URL(EV));
t = await text(cm);
ok(t.includes("สมัครเป็นอาสา") && !t.includes("ยกเลิกงานนี้") && !t.includes("แก้ไขรายละเอียดงาน") && !t.includes("เพิ่มเป้าหมายกำลังคน"), "volunteer sees sign-up, no management controls");
ok((await cm.$$("[data-testid^=gate-]")).length === 0 && (await cm.$("[data-testid=readiness-state]")) !== null, "community member sees readiness state + percent, no gates");
ok(!t.includes("ยังขาดอาสาสมัคร") && !t.includes("กำลังคนถึงขั้นต่ำ"), "no staffing detail leaked to a volunteer");
ok(await cm.locator("[data-testid=event-checklist]").count() === 0, "community member does not see the staff checklist");
await shot(cm, "e-07-volunteer-view");
await noOverflow(cm, "event detail (volunteer)");
await minSizes(cm, "event detail (volunteer)");
await cm.click("button:has-text('สมัครเป็นอาสา')");
await waitText(cm, "สมัครแล้ว กำลังรอเจ้าหน้าที่อนุมัติ");
await cm.waitForSelector("text=สถานะของคุณ: รออนุมัติ");
ok((await cm.$$("button:has-text('อนุมัติ')")).length === 0 && (await cm.$$("button:has-text('ถอนตัว')")).length === 1, "volunteer has no approve button, can withdraw");
const cm2 = P.cm2;
await cm2.goto(EV_URL(EV));
await cm2.click("button:has-text('สมัครเป็นอาสา')");
await waitText(cm2, "สถานะของคุณ: รออนุมัติ");
ok(sql(`select count(*) from public.event_participants where event_id = '${EV}' and status = 'PENDING'`) === "2", "two volunteers pending");

// facility manager approves both; cannot approve own sign-up; can withdraw
const fm = P.fm;
await fm.goto(EV_URL(EV));
for (const n of ["อาสา หนึ่ง", "อาสา สอง"]) {
  await fm.click(`[data-testid='participant-${n}'] button:has-text('อนุมัติ'):not(:has-text('ไม่'))`);
  await fm.waitForSelector(`[data-testid='participant-${n}'] :text('ยืนยันแล้ว')`);
}
await waitText(fm, "ยืนยันแล้ว 2");
ok(sql(`select count(*) from public.event_participants where event_id = '${EV}' and status = 'CONFIRMED'`) === "3", "facility manager approved both volunteers");
await fm.click("button:has-text('สมัครเป็นอาสา')");   // the sign-up form is replaced by the withdraw form once the page refreshes
await fm.waitForSelector("text=สถานะของคุณ: รออนุมัติ");
await fm.waitForSelector("text=คุณอนุมัติการสมัครของตัวเองไม่ได้");
ok((await fm.$$(`[data-testid='participant-${U.fm[1]}'] button`)).length === 0, "own pending sign-up: no approve buttons (the database refuses it too)");
ok(sql(`select count(*) from public.event_participants p join public.persons pe on pe.id = p.person_id where pe.display_name = '${U.fm[1]}' and p.status = 'PENDING'`) === "1", "facility manager sign-up is pending");
await fm.click("button:has-text('ถอนตัว')");
await waitText(fm, "ถอนตัวแล้ว");
ok(sql(`select count(*) from public.event_participants p join public.persons pe on pe.id = p.person_id where pe.display_name = '${U.fm[1]}' and p.status = 'CANCELLED'`) === "1", "withdraw works");
await shot(fm, "e-08-volunteers-approved");
await sec.reload();
await stateIs(sec, "IN_PROGRESS", 40);
g = await gates(sec);
ok(g["G-STAFF"] === "PASS", "G-STAFF PASS once volunteers are confirmed");

// 8 task: assignee starts + submits; cannot verify; secretary sends back, then verifies
const staff = P.staff;
await staff.goto(EV_URL(EV));
const taskCard = "[data-testid='task-เตรียมเครื่องเสียง']";
await staff.click(`${taskCard} button:has-text('เริ่มทำ')`);
await waitText(staff, "เริ่มงานแล้ว");
await staff.click(`${taskCard} button:has-text('ส่งงาน')`);
await waitText(staff, "ส่งงานแล้ว รอผู้จัดการงานตรวจรับ");
await staff.waitForSelector(`${taskCard} [data-state=SUBMITTED]`);
ok((await staff.$$(`${taskCard} button`)).length === 0, "assignee has no verify button");
ok((await text(staff)).includes("ความพร้อมของงาน") && (await gates(staff))["G-OWNER"] === "PASS", "staff (event.view T) sees the readiness gates");
await shot(staff, "e-09-task-submitted");
await sec.goto(EV_URL(EV));
await sec.click(`${taskCard} button:has-text('ส่งกลับแก้')`);
await waitText(sec, "ส่งกลับให้แก้แล้ว");
await sec.waitForSelector(`${taskCard} [data-state=IN_PROGRESS]`);
await staff.reload();
await staff.click(`${taskCard} button:has-text('ส่งงาน')`);
await staff.waitForSelector(`${taskCard} [data-state=SUBMITTED]`);
await sec.reload();
await sec.click(`${taskCard} button:has-text('ตรวจรับ')`);
await waitText(sec, "ตรวจรับแล้ว");
await stateIs(sec, "READY", 100);
g = await gates(sec);
ok(Object.values(g).length === 5 && Object.values(g).every((x) => x === "PASS"), "all five gates PASS");
await shot(sec, "e-10-ready");
await cm.reload();
await stateIs(cm, "READY", 100);
ok((await cm.$$("[data-testid^=gate-]")).length === 0, "volunteer still sees only state + percent when READY");

// 9 list: grouping and chips
await sec.goto(`${BASE}/temple/${TID}/events`);
t = await text(sec);
ok(t.includes("งานที่กำลังจะถึง (1)") && t.includes("พร้อม 100%") && t.includes("อนุมัติแล้ว") && t.includes("ทอดกฐินสามัคคี (ทดสอบ)"), "list: upcoming group with status + readiness chip");
await shot(sec, "e-11-list");
await noOverflow(sec, "events list");
await minSizes(sec, "events list");

// 10 public page
await anon.goto(`${BASE}/t/${SLUG}`);
await clickNav(anon, "a:has-text('งานและกิจกรรมของวัด')", `**/t/${SLUG}/events`, { retry: true });
t = await text(anon);
ok(t.includes("ทอดกฐินสามัคคี (ทดสอบ)") && t.includes("ต้องการอาสา 0 คน") && t.includes("ศาลาการเปรียญ (สมมติ)"), "public page lists the event with 'ต้องการอาสา 0 คน'");
ok(!/พร้อม|G-|พระสวดมนต์|รองเจ้าอาวาส/.test(t) && t.includes("เข้าสู่ระบบ"), "public page: no readiness, gates or monk details; login hint for visitors");
await shot(anon, "e-12-public");
await noOverflow(anon, "public events");
await cm.goto(`${BASE}/t/${SLUG}/events`);
await clickNav(cm, "a:has-text('ดูรายละเอียดและสมัครเป็นอาสา')", `**/temple/${TID}/events/${EV}`, { retry: true });
ok((await text(cm)).includes("ทอดกฐินสามัคคี (ทดสอบ)"), "signed-in follower opens the event from the public page");
await anon.goto(`${BASE}/t/no-such-temple/events`);
ok((await text(anon)).includes("ไม่พบวัดนี้"), "public events page of an unknown temple is 404");

// 11 internal event: hidden from community members; cancel needs the approver and a reason
await sec.goto(`${BASE}/temple/${TID}/events/new`);
await sec.fill("#title", "ประชุมภายใน (ทดสอบ)");
await sec.fill("#starts", bkk(now + 5 * 24 * H, "13:00")); await sec.fill("#ends", bkk(now + 5 * 24 * H, "14:00"));
await sec.fill("#venue", "กุฏิรับรอง (สมมติ)");
await sec.selectOption("#visibility", "internal");
await sec.selectOption("#lead", { label: "เลขา ทดสอบ (พระ)" });
await sec.click("button[type=submit]");
await sec.waitForURL(/\/events\/[0-9a-f-]{36}$/);
const EV2 = evId(sec);
await sec.waitForSelector("[data-testid=event-title]");
await sec.click("button[name=op][value=plan]"); await waitText(sec, "วางแผนงานแล้ว");
await abbot.goto(EV_URL(EV2));
await abbot.click("button[name=op][value=approve]"); await waitText(abbot, "อนุมัติงานแล้ว");
await cm.goto(`${BASE}/temple/${TID}/events`);
t = await text(cm);
ok(!t.includes("ประชุมภายใน") && t.includes("ทอดกฐินสามัคคี (ทดสอบ)"), "internal event is not listed for a community member");
await cm.goto(EV_URL(EV2));
ok((await text(cm)).includes("ไม่พบงานนี้"), "internal event page: not found for a community member");
await staff.goto(`${BASE}/temple/${TID}/events`);
ok(!(await text(staff)).includes("ประชุมภายใน"), "internal event is not listed for staff without event.manage");
await anon.goto(`${BASE}/t/${SLUG}/events`);
ok(!(await text(anon)).includes("ประชุมภายใน"), "internal event is not on the public page");
await sec.goto(EV_URL(EV2));
await sec.click("summary:has-text('ยกเลิกงานนี้')");
await sec.click("button[name=op][value=cancel]");
await sec.waitForSelector("#reason-err");
await settle(sec);
ok((await text(sec)).includes("กรุณาบอกเหตุผลที่ยกเลิกงาน"), "cancel needs a reason");
await sec.fill("#reason", "ฝนตกหนัก (ทดสอบ)");
await sec.click("button[name=op][value=cancel]");
await waitText(sec, "ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายอนุมัติ");
ok((await sec.inputValue("#reason")) === "ฝนตกหนัก (ทดสอบ)" && sql(`select status from public.events where id = '${EV2}'`) === "APPROVED", "secretary cannot cancel an approved event; reason kept");
await shot(sec, "e-13-cancel-refused");
await abbot.goto(EV_URL(EV2));
await abbot.click("summary:has-text('ยกเลิกงานนี้')");
await abbot.fill("#reason", "ฝนตกหนัก (ทดสอบ)");
await abbot.click("button[name=op][value=cancel]");
await waitText(abbot, "ยกเลิกงานแล้ว");
ok(sql(`select status || '/' || cancel_reason from public.events where id = '${EV2}'`) === "CANCELLED/ฝนตกหนัก (ทดสอบ)", "abbot cancels with a reason");
await sec.goto(`${BASE}/temple/${TID}/events`);
t = await text(sec);
ok(t.includes("งานที่กำลังจะถึง (1)") && t.includes("งานที่ผ่านมาแล้ว/ยกเลิก (1)") && t.includes("ยกเลิก"), "cancelled event moves to the past/cancelled group");

console.log("ALL EVENTS E2E CHECKS PASSED");
await browser.close();
