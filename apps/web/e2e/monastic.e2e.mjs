// E2E: monk features (My Day, practice, availability board, invitations). FICTIONAL data in a throwaway DB (reset by e2e/run.sh). Phone viewport.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { clickNav, grantRole, seedVerifiedTemple, sql, waitText } from "./seed.mjs";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome });
let ipN = 10;
const page = async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH", extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${ipN++}` } });
  const p = await c.newPage(); p.on("pageerror", (e) => console.error("PAGEERROR:", e.message.slice(0, 300))); return p;
};
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return p.textContent("main"); };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
async function login(p, email, name) {
  await p.goto(BASE + "/login");
  await p.fill("#email", email); await clickNav(p, "button[type=submit]", "**/login/code**");
  await p.fill("#code", codeFor(email)); await clickNav(p, "button[type=submit]", /\/(welcome|me)$/);
  if (p.url().endsWith("/welcome")) { await p.fill("#name", name); await clickNav(p, "button[type=submit]", "**/me"); }
}
const noOverflow = async (p, m) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${m}: no horizontal scroll at phone width`);
const bkk = (d) => new Date(d.getTime() + 7 * 3600e3).toISOString();
const ymd = (d) => bkk(d).slice(0, 10);
const hm = (d) => bkk(d).slice(11, 16);
const pid = (email) => sql(`select pe.id from public.persons pe join authx.users u on u.id = pe.auth_user_id where u.email = '${email}'`);
const waitIncludes = (p, sel, s, timeout = 20000) => p.waitForFunction(([q, t]) => document.querySelector(q)?.textContent?.includes(t), [sel, s], { timeout });

const T = seedVerifiedTemple("test-temple", "วัดทดสอบระบบ");
const U = {
  abbot: ["abbot@example.com", "เจ้าอาวาส ทดสอบ", "abbot", "bhikkhu"],
  sec: ["secretary@example.com", "พระเลขา ทดสอบ", "monk_secretary", "bhikkhu"],
  dep: ["deputy@example.com", "พระรอง ทดสอบ", "deputy_abbot", "bhikkhu"],
  monk: ["monk1@example.com", "พระภิกษุ ก ทดสอบ", "bhikkhu", "bhikkhu"],
  monk2: ["monk2@example.com", "พระภิกษุ ข ทดสอบ", "bhikkhu", "bhikkhu"],
  lay: ["lay@example.com", "โยมทั่วไป ทดสอบ", "community_member", "none"],
};
const P = {};
for (const [k, [email, name, role, mk]] of Object.entries(U)) {
  P[k] = await page(); await login(P[k], email, name);
  grantRole(email, T, role, { monastic: mk });
}
const name = (k) => U[k][1];
const id = (k) => pid(U[k][0]);
const now = new Date();

// ---------- hub: only the links a person can use ----------
await P.lay.goto(`${BASE}/temple/${T}/monastic`);
let t = await text(P.lay);
ok(t.includes("ยังไม่มีเมนูในส่วนนี้") && (await P.lay.locator("[data-testid^=hub-]").count()) === 0, "lay member: hub shows an explanation and no links");
await P.monk.goto(`${BASE}/temple/${T}/monastic`);
await text(P.monk);
ok((await P.monk.locator("[data-testid^=hub-]").count()) === 4, "bhikkhu: hub shows 4 links (day, practice, availability, invitations)");
await shot(P.monk, "m-01-hub");
await noOverflow(P.monk, "hub");

// lay: every page explains instead of showing monk data
for (const [path, needle] of [["day", "ตารางประจำวันของพระ"], ["practice", "กิจวัตรส่วนตัวของพระ"], ["availability", "ยังไม่มีสิทธิ์นี้"], ["invitations", "ยังไม่มีสิทธิ์นี้"]]) {
  await P.lay.goto(`${BASE}/temple/${T}/${path}`);
  ok((await text(P.lay)).includes(needle), `lay member: /${path} shows an explanation`);
}
await shot(P.lay, "m-02-lay-explained");

// ---------- seed quests for monk1 (setup the quest feature does not cover here) ----------
const secId = id("sec"), monkId = id("monk");
function seedQuest(title, { status, points = 0, due = null }) {
  const q = sql(`insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, points, due_at)
    values ('${T}', 'monastic_daily', '${title}', '${secId}', 'OPEN', 'none', ${points}, ${due ? `'${due}'` : "null"}) returning id`).split("\n")[0];
  const a = sql(`insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values ('${T}', '${q}', '${monkId}') returning id`).split("\n")[0];
  const path = { ASSIGNED: [], SUBMITTED: ["IN_PROGRESS", "SUBMITTED"], COMPLETED: ["IN_PROGRESS", "SUBMITTED", "COMPLETED"] }[status];
  for (const st of path) sql(`update public.quest_assignments set status = '${st}' where id = '${a}'`);
}
seedQuest("ตรวจเครื่องบริขาร (ทดสอบ)", { status: "COMPLETED", points: 10 });
seedQuest("ทำความสะอาดกุฏิ (ทดสอบ) เลยกำหนด", { status: "ASSIGNED", due: new Date(Date.now() - 3600e3).toISOString() });
seedQuest("เตรียมสวดมนต์ (ทดสอบ) ส่งแล้ว", { status: "SUBMITTED" });

// ---------- My Day: monk1 ----------
await P.monk.goto(`${BASE}/temple/${T}/day`);
t = await text(P.monk);
ok(t.includes("ภารกิจ") && t.includes("เลยกำหนดแล้ว") && t.includes("รอตรวจรับ"), "My Day: quest rows show เลยกำหนดแล้ว and รอตรวจรับ");
ok(!t.includes("วันนี้ยังไม่มีกิจที่กำหนด"), "My Day: not shown as empty when there are tasks");
ok(t.includes("ไม่ทราบ") && t.includes("ยังไม่มีเช็คอิน"), "My Day: honest status ไม่ทราบ when nothing is set");
ok((await P.monk.inputValue("#valid_until")) === `${ymd(now)}T23:59`, "valid_until is prefilled to the end of today (Asia/Bangkok)");
await shot(P.monk, "m-03-day-monk");
await noOverflow(P.monk, "My Day");
// valid_until required
await P.monk.fill("#valid_until", "");
await P.monk.click("button:has-text('บันทึกสถานะ')");
await waitText(P.monk, "กรุณาระบุว่าสถานะนี้ใช้ถึงเมื่อไร");
ok(sql(`select count(*) from public.availability_manual where temple_id = '${T}'`) === "0", "empty valid_until refused, nothing stored");
ok(await P.monk.isChecked("input[name=state][value=AVAILABLE]"), "chosen state kept after the error");
await P.monk.fill("#valid_until", `${ymd(now)}T23:59`);
await P.monk.click("button:has-text('บันทึกสถานะ')");
await waitText(P.monk, "บันทึกสถานะแล้ว");
await waitIncludes(P.monk, "[data-testid=my-state]", "ว่างรับกิจ");
ok(sql(`select state || ':' || set_by_kind from public.availability_manual where person_id = '${monkId}'`) === "AVAILABLE:SELF", "own availability stored (SELF)");
await P.monk.click("button:has-text('เช็คอินเข้าวัด')");
await waitText(P.monk, "เช็คอินเข้าวัดแล้ว");
ok(sql(`select count(*) from public.checkins where person_id = '${monkId}'`) === "1", "check-in stored");
// the clear button for the status he set himself
await waitText(P.monk, "ยกเลิกสถานะที่ตั้งไว้");
// load failure is an error, never "no tasks"
await P.monk.goto(`${BASE}/temple/${T}/day?d=0000-01-01`);
t = await text(P.monk);
ok(t.includes("ดึงข้อมูลไม่ได้") && !t.includes("วันนี้ยังไม่มีกิจที่กำหนด"), "load failure shows an error, not an empty day");

// ---------- My Day: empty state + prev/next ----------
await P.dep.goto(`${BASE}/temple/${T}/day`);
t = await text(P.dep);
ok(t.includes("วันนี้ยังไม่มีกิจที่กำหนด"), "empty day: วันนี้ยังไม่มีกิจที่กำหนด");
await clickNav(P.dep, "a:has-text('วันถัดไป')", /day\?d=\d{4}-\d{2}-\d{2}$/, { retry: true });
ok(new URL(P.dep.url()).searchParams.get("d") === ymd(new Date(now.getTime() + 86400e3)), "next-day link goes to tomorrow (Bangkok)");
await clickNav(P.dep, "a:has-text('วันก่อน')", /day\?d=/, { retry: true });
await shot(P.dep, "m-04-day-empty");
// deputy sets AVAILABLE until now+20h (edited value, within 24h); UNAVAILABLE reveals the reason select
await P.dep.goto(`${BASE}/temple/${T}/day`);
await text(P.dep);
await P.dep.check("input[name=state][value=UNAVAILABLE]");
ok(await P.dep.isVisible("#reason"), "choosing ไม่ว่าง reveals the reason select");
await P.dep.check("input[name=state][value=AVAILABLE]");
ok(!(await P.dep.isVisible("#reason").catch(() => false)), "reason select hidden for other states");
const until20 = new Date(Date.now() + 20 * 3600e3);
await P.dep.fill("#valid_until", `${ymd(until20)}T${hm(until20)}`);
await P.dep.click("button:has-text('บันทึกสถานะ')");
await waitText(P.dep, "บันทึกสถานะแล้ว");
ok(sql(`select count(*) from public.availability_manual where person_id = '${id("dep")}' and state = 'AVAILABLE'`) === "1", "deputy availability stored");

// ---------- availability board (secretary) ----------
await P.sec.goto(`${BASE}/temple/${T}/availability`);
t = await text(P.sec);
ok((await P.sec.locator("[data-testid=counters]").count()) === 1 && t.includes("พระและสามเณร 5 รูป"), "secretary sees the full board with counters");
ok((await P.sec.textContent("[data-testid=count-UNKNOWN] b")) === "3" && (await P.sec.textContent("[data-testid=count-AVAILABLE] b")) === "2", "counters per state: UNKNOWN 3, AVAILABLE 2");
await P.sec.fill("#end_date", "");
await P.sec.selectOption("#person_id", id("monk"));
await P.sec.click("button:has-text('ตั้งว่า ไม่ว่าง')");
await waitText(P.sec, "กรุณาระบุวันสุดท้ายที่ไม่ว่าง");
ok((await P.sec.inputValue("#person_id")) === id("monk"), "monk selection kept after the error");
const end3 = ymd(new Date(Date.now() + 3 * 86400e3));
await P.sec.fill("#end_date", end3);
await P.sec.selectOption("#reason", "SICK");
await P.sec.click("button:has-text('ตั้งว่า ไม่ว่าง')");
await waitText(P.sec, "ตั้งสถานะ ไม่ว่าง แล้ว");
await waitIncludes(P.sec, `[data-testid="board-${name("monk")}"]`, "อาพาธ");
t = await P.sec.textContent(`[data-testid="board-${name("monk")}"]`);
ok(t.includes("ไม่ว่าง") && t.includes("อาพาธ"), "board shows the monk as ไม่ว่าง with the reason (secretary)");
ok(sql(`select set_by_kind || ':' || reason_code from public.availability_manual where person_id = '${monkId}' and state = 'UNAVAILABLE'`) === "ADMIN:SICK", "UNAVAILABLE stored as ADMIN/SICK");
await shot(P.sec, "m-05-board-secretary");
await noOverflow(P.sec, "availability board");
// end date more than 120 days is refused before it reaches the DB
await P.sec.selectOption("#person_id", id("monk2"));
await P.sec.fill("#end_date", ymd(new Date(Date.now() + 130 * 86400e3)));
await P.sec.click("button:has-text('ตั้งว่า ไม่ว่าง')");
await waitText(P.sec, "ตั้งได้ไม่เกิน 120 วัน");
// clear and set again
await P.sec.locator(`[data-testid="board-${name("monk")}"] button:has-text('ยกเลิกการตั้ง')`).click();
await waitText(P.sec, "ยกเลิกการตั้งสถานะแล้ว");
await waitIncludes(P.sec, `[data-testid="board-${name("monk")}"]`, "ว่างรับกิจ");
ok(true, "clear: the monk is back to his own AVAILABLE");
await P.sec.selectOption("#person_id", id("monk"));
await P.sec.fill("#end_date", end3);
await P.sec.selectOption("#reason", "SICK");
await P.sec.click("button:has-text('ตั้งว่า ไม่ว่าง')");
await waitIncludes(P.sec, `[data-testid="board-${name("monk")}"]`, "อาพาธ");
ok(true, "set again after clear");

// monk1 sees his own state (with reason, his own data) and the coarse list only
await P.monk.goto(`${BASE}/temple/${T}/day`);
await waitIncludes(P.monk, "[data-testid=my-state]", "ไม่ว่าง");
ok((await P.monk.textContent("[data-testid=my-status]")).includes("อาพาธ"), "monk sees his own reason on My Day");
await P.monk.goto(`${BASE}/temple/${T}/availability`);
t = await text(P.monk);
ok((await P.monk.locator("[data-testid=coarse]").count()) === 1 && (await P.monk.locator("[data-testid=counters]").count()) === 0, "bhikkhu sees the coarse list, not the board");
ok(!t.includes("อาพาธ") && !/ถึง \d/.test(t) && t.includes("ว่าง") && t.includes("ไม่ทราบ"), "coarse list: only ว่าง / ไม่ว่าง / ไม่ทราบ, no reason, no times");
ok((await P.monk.locator(`[data-testid="coarse-${name("monk")}"]`).textContent()).includes("ไม่ว่าง"), "coarse: the sick monk shows plain ไม่ว่าง");
ok((await P.monk.locator("button[type=submit]").count()) === 0, "coarse view has no actions");
await shot(P.monk, "m-06-coarse");

// ---------- invitations: intake (secretary) ----------
const start = new Date(Math.ceil((Date.now() + 4 * 3600e3) / 300e3) * 300e3);
async function fillInvitation(p, o) {
  await p.fill("#host_name", o.host); await p.fill("#host_phone", o.phone ?? ""); await p.fill("#venue", o.venue);
  await p.fill("#date", ymd(o.start)); await p.fill("#time", hm(o.start)); await p.selectOption("#duration", "60");
  await p.fill("#monks", o.monks); await p.fill("#travel_out", o.out ?? ""); await p.fill("#travel_back", o.back ?? "");
}
await P.sec.goto(`${BASE}/temple/${T}/invitations`);
t = await text(P.sec);
ok(t.includes("ยังไม่มีกิจนิมนต์"), "invitations: empty state");
await clickNav(P.sec, "[data-testid=new-invitation]", "**/invitations/new", { retry: true });
await text(P.sec);
ok(await P.sec.isVisible("#rite_name"), "no rite types yet: the add form is open");
await P.sec.click("button:has-text('เพิ่มประเภทพิธี')");
await waitText(P.sec, "ชื่อประเภทพิธี");
await P.sec.waitForSelector("#rite_name-err");
await P.sec.fill("#rite_name", "สวดมนต์เย็น (ทดสอบ)");
await P.sec.click("button:has-text('เพิ่มประเภทพิธี')");
await waitText(P.sec, "เลือกได้ในช่องประเภทพิธี");
await P.sec.waitForSelector("#rite option:has-text('สวดมนต์เย็น')", { state: "attached" });
await P.sec.selectOption("#rite", { label: "สวดมนต์เย็น (ทดสอบ)" });
await fillInvitation(P.sec, { host: "เจ้าภาพทดสอบ หนึ่ง", phone: "081 234 5678", venue: "บ้านสมมติ หมู่ 1 (ข้อมูลทดสอบ)", start, monks: "0", out: "30", back: "30" });
t = await text(P.sec);
ok(t.includes("ไม่ทราบให้เว้นว่าง ระบบจะไม่เดา"), "intake form: travel hint present");
await shot(P.sec, "m-07-intake-form");
await noOverflow(P.sec, "intake form");
await P.sec.click("button:has-text('บันทึกกิจนิมนต์')");
await P.sec.waitForSelector("#monks-err");
ok((await P.sec.inputValue("#host_name")) === "เจ้าภาพทดสอบ หนึ่ง" && (await P.sec.inputValue("#venue")).includes("บ้านสมมติ") && (await P.sec.inputValue("#rite")) !== "", "input kept after validation error");
await P.sec.fill("#monks", "2");
await P.sec.click("button:has-text('บันทึกกิจนิมนต์')");
await P.sec.waitForURL(/invitations\/[0-9a-f-]{36}$/);
const invUrl = P.sec.url(), invId = invUrl.split("/").at(-1);
t = await text(P.sec);
ok(t.includes("รับเรื่องใหม่") && t.includes("081 234 5678") && t.includes("เจ้าภาพทดสอบ หนึ่ง"), "intake saved; secretary sees host and phone");
await shot(P.sec, "m-08-invitation-received");

// stale version: two tabs
const tab2 = await P.sec.context().newPage();
await tab2.goto(invUrl); await tab2.waitForSelector("button[name=op][value=start_review]");
await P.sec.click("button[name=op][value=start_review]");
await waitText(P.sec, "เริ่มพิจารณากิจนิมนต์แล้ว");
await P.sec.waitForSelector("[data-testid=suggestions]");
await tab2.click("button[name=op][value=start_review]");
await waitText(tab2, "มีคนแก้ไขกิจนิมนต์นี้ไปแล้ว กรุณาโหลดหน้านี้ใหม่");
ok(sql(`select status || version from public.invitations where id = '${invId}'`) === "REVIEWING2", "stale tab changed nothing (still REVIEWING, version 2)");
await shot(tab2, "m-09-stale");
await tab2.click("a:has-text('โหลดหน้านี้ใหม่')");
await tab2.waitForSelector("[data-testid=suggestions]");
ok(true, "reload link brings the stale tab up to date");
await tab2.close();

// suggestion lists
await P.sec.goto(invUrl);
await P.sec.waitForSelector("[data-testid=suggestions]");
const sug = await P.sec.textContent("[data-testid=suggestions]");
const inList = async (list, k) => (await P.sec.textContent(`[data-testid=list-${list}]`)).includes(name(k));
ok(await inList("suggested", "dep") && !(await inList("suggested", "abbot")), "แนะนำ: the monk who opted in");
ok(await inList("needs", "abbot") && await inList("needs", "monk2") && (await P.sec.textContent("[data-testid=list-needs]")).includes("ยังไม่ได้แจ้งว่าว่างรับกิจ"), "ต้องถามก่อน: no availability signal, with warning");
ok(await inList("excluded", "monk") && (await P.sec.textContent("[data-testid=list-excluded]")).includes("ตั้งสถานะไม่ว่าง"), "ไม่ว่าง/ขัดข้อง: the sick monk with a Thai violation label");
ok(!/\d+[.,]\d+/.test(sug) && !/คะแนน|score/i.test(sug), "no numeric score or decimal number anywhere in the suggestion section");
ok((await P.sec.locator("input[name=team]").count()) === 4 && (await P.sec.locator(`input[name=team][value="${id("monk")}"]`).count()) === 0, "team picker: only suggested + needs_confirmation (4), excluded monk not selectable");
await shot(P.sec, "m-10-suggestions");
await noOverflow(P.sec, "invitation (reviewing)");
// wrong size -> specific message, selection kept
await P.sec.check(`input[name=team][value="${id("dep")}"]`);
await P.sec.click("button[name=op][value=propose_team]");
await waitText(P.sec, "จำนวนพระที่เลือกไม่ตรงกับจำนวนที่เจ้าภาพขอ");
ok(await P.sec.isChecked(`input[name=team][value="${id("dep")}"]`), "selection kept after TEAM_SIZE_MISMATCH");
await P.sec.check(`input[name=team][value="${id("abbot")}"]`);
await P.sec.click("button[name=op][value=propose_team]");
await waitText(P.sec, "เสนอทีมพระแล้ว");
await waitIncludes(P.sec, "[data-testid=inv-status]", "รอเจ้าอาวาสยืนยัน");
t = await P.sec.textContent("[data-testid=inv-team]");
ok(t.includes(name("dep")) && t.includes(name("abbot")), "team shown after proposing");

// secretary cannot confirm (delegation only)
await P.sec.waitForSelector("[data-testid=warnings]");
ok((await P.sec.textContent("[data-testid=warnings]")).includes("ยังไม่ได้แจ้งว่าว่างรับกิจ"), "confirm form lists the warning");
await P.sec.check("input[name=ack]");
await P.sec.click("button[name=op][value=confirm]");
await waitText(P.sec, "ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายยืนยัน");
ok(sql(`select status from public.invitations where id = '${invId}'`) === "TEAM_PROPOSED", "secretary's confirm refused by the DB");
await shot(P.sec, "m-11-confirm-refused");

// abbot confirms: warning must be acknowledged
await P.abbot.goto(invUrl);
await P.abbot.waitForSelector("[data-testid=warnings]");
await P.abbot.click("button[name=op][value=confirm]");
await waitText(P.abbot, "มีคำเตือนที่ต้องรับทราบก่อนยืนยัน");
ok(sql(`select status from public.invitations where id = '${invId}'`) === "TEAM_PROPOSED", "without รับทราบคำเตือน nothing is confirmed");
await shot(P.abbot, "m-12-ack-required");
await P.abbot.check("input[name=ack]");
await P.abbot.click("button[name=op][value=confirm]");
await waitText(P.abbot, "ยืนยันกิจนิมนต์แล้ว");
await waitIncludes(P.abbot, "[data-testid=inv-status]", "ยืนยันแล้ว");
ok(sql(`select count(*) from public.schedule_entries where source_id = '${invId}' and status = 'CONFIRMED'`) === "6", "confirm wrote travel+invitation rows for both monks (6)");
await shot(P.abbot, "m-13-confirmed");

// ---------- My Day of a team monk ----------
const dday = ymd(start);
await P.dep.goto(`${BASE}/temple/${T}/day?d=${dday}`);
t = await text(P.dep);
const order = await P.dep.$$eval("[data-testid^=row-]", (els) => els.map((e) => e.getAttribute("data-testid")));
ok(JSON.stringify(order.filter((x) => x !== "row-quest")) === JSON.stringify(["row-travel-OUT", "row-invitation", "row-travel-BACK"]), `My Day: travel out, invitation, travel back in time order (${order.join(",")})`);
ok(t.includes("กิจนิมนต์") && t.includes("เดินทางไป") && t.includes("เดินทางกลับ") && t.includes("สวดมนต์เย็น"), "My Day: invitation + travel rows in Thai");
ok(t.includes("แจ้งติดขัดจะส่งถึงเลขาฯ ไม่ได้ยกเลิกกิจนิมนต์"), "My Day: แจ้งติดขัด copy says it does not cancel");
await shot(P.dep, "m-14-day-invitation");
await noOverflow(P.dep, "My Day with invitation");
await P.dep.click("button[name=response][value=ACKNOWLEDGED]");
await waitText(P.dep, "บันทึกแล้ว: รับทราบกิจนิมนต์");
ok(sql(`select monk_response from public.invitation_team where invitation_id = '${invId}' and person_id = '${id("dep")}'`) === "ACKNOWLEDGED", "monk acknowledged -> ACKNOWLEDGED");
// the other monk reports a problem: goes to the secretary, nothing is cancelled
await P.abbot.goto(`${BASE}/temple/${T}/day?d=${dday}`);
await P.abbot.click("button[name=response][value=RELEASE_REQUESTED]");
await waitText(P.abbot, "ส่งเรื่องแจ้งติดขัดถึงเลขาฯ แล้ว");
ok(sql(`select status from public.invitations where id = '${invId}'`) === "CONFIRMED", "แจ้งติดขัด did not cancel the invitation");
await P.sec.goto(invUrl);
await P.sec.waitForSelector("[data-testid=inv-team]");
t = await P.sec.textContent("[data-testid=inv-team]");
ok(t.includes("แจ้งติดขัด") && t.includes("รับทราบแล้ว"), "secretary sees both responses on the team list");
// a monk who is not on the team cannot read the invitation (host data)
await P.monk2.goto(invUrl);
t = await text(P.monk2);
ok(t.includes("ไม่พบกิจนิมนต์นี้") && !t.includes("เจ้าภาพทดสอบ") && !t.includes("081 234 5678"), "monk not on the team: no host name or phone");
await P.monk2.goto(`${BASE}/temple/${T}/invitations`);
ok((await text(P.monk2)).includes("ยังไม่มีกิจนิมนต์"), "monk not on the team: his list is empty");

// ---------- abbot cancels ----------
await P.abbot.goto(invUrl);
await P.abbot.waitForSelector("summary:has-text('ยกเลิกกิจนิมนต์นี้')");
await P.abbot.click("summary:has-text('ยกเลิกกิจนิมนต์นี้')");
await P.abbot.click("button[name=op][value=cancel]");
await P.abbot.waitForSelector("#cancel_reason-err");
ok((await P.abbot.textContent("#cancel_reason-err")).includes("กรุณาพิมพ์เหตุผลที่ยกเลิก"), "cancel without a reason refused (Thai message)");
await P.abbot.fill("#cancel_reason", "เจ้าภาพขอเลื่อนวัน (ข้อมูลทดสอบ)");
await P.abbot.click("button[name=op][value=cancel]");
await waitText(P.abbot, "ยกเลิกกิจนิมนต์แล้ว");
await waitIncludes(P.abbot, "[data-testid=inv-status]", "ยกเลิก");
ok(sql(`select count(*) from public.schedule_entries where source_id = '${invId}' and status = 'CANCELLED'`) === "6", "cancel cancelled all 6 calendar rows");
await shot(P.abbot, "m-15-cancelled");
await P.dep.goto(`${BASE}/temple/${T}/day?d=${dday}`);
t = await text(P.dep);
ok(t.includes("วันนี้ยังไม่มีกิจที่กำหนด") && (await P.dep.locator("[data-testid^=row-]").count()) === 0, "monk's My Day no longer shows the cancelled invitation");

// ---------- decline path ----------
await P.sec.goto(`${BASE}/temple/${T}/invitations/new`);
await text(P.sec);
await P.sec.waitForSelector("#rite option:has-text('สวดมนต์เย็น')", { state: "attached" });
await P.sec.selectOption("#rite", { label: "สวดมนต์เย็น (ทดสอบ)" });
await fillInvitation(P.sec, { host: "เจ้าภาพทดสอบ สอง", venue: "ศาลาสมมติ (ข้อมูลทดสอบ)", start: new Date(start.getTime() + 2 * 86400e3), monks: "3" });
await P.sec.click("button:has-text('บันทึกกิจนิมนต์')");
await P.sec.waitForURL(/invitations\/[0-9a-f-]{36}$/);
const inv2Url = P.sec.url(), inv2 = inv2Url.split("/").at(-1);
t = await text(P.sec);
ok(t.includes("ไม่ทราบ") && t.includes("เวลาเดินทาง"), "unknown travel time is shown as ไม่ทราบ (never guessed)");
await P.sec.click("summary:has-text('ไม่รับกิจนิมนต์นี้')");
await P.sec.selectOption("#reason_code", "NOT_ENOUGH_MONKS");
await P.sec.click("button[name=op][value=decline]");
await waitText(P.sec, "ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายยืนยัน");
ok(sql(`select status from public.invitations where id = '${inv2}'`) === "RECEIVED", "secretary cannot decline either (human confirm)");
await P.abbot.goto(inv2Url);
await P.abbot.waitForSelector("summary:has-text('ไม่รับกิจนิมนต์นี้')");
await P.abbot.click("summary:has-text('ไม่รับกิจนิมนต์นี้')");
await P.abbot.click("button[name=op][value=decline]");
await P.abbot.waitForSelector("#reason_code-err");
await P.abbot.selectOption("#reason_code", "NOT_ENOUGH_MONKS");
await P.abbot.click("button[name=op][value=decline]");
await waitText(P.abbot, "บันทึกการปฏิเสธกิจนิมนต์แล้ว");
await waitIncludes(P.abbot, "[data-testid=inv-details]", "พระไม่พอ");
ok(sql(`select status || ':' || decline_reason from public.invitations where id = '${inv2}'`) === "DECLINED:NOT_ENOUGH_MONKS", "decline with reason code stored");
await shot(P.abbot, "m-16-declined");
await P.sec.goto(`${BASE}/temple/${T}/invitations`);
await text(P.sec);
ok((await P.sec.locator("[data-testid=group-CANCELLED]").count()) === 1 && (await P.sec.locator("[data-testid=group-DECLINED]").count()) === 1, "list groups invitations by status (ยกเลิก, ปฏิเสธ)");
await shot(P.sec, "m-17-invitations-list");
await noOverflow(P.sec, "invitations list");

// ---------- practice: own data only ----------
await P.monk.goto(`${BASE}/temple/${T}/practice`);
t = await text(P.monk);
ok((await P.monk.textContent("[data-testid=score]")).trim() === "10" && t.includes("แต้มกิจวัตร") && t.includes("ตัวชี้วัดความก้าวหน้าส่วนตัว แลกไม่ได้"), "practice: own score 10 labelled แต้มกิจวัตร + 'แลกไม่ได้' note");
ok((await P.monk.textContent("[data-testid=days-month]")).trim() === "1" && (await P.monk.locator("[data-testid=days-run]").count()) === 0, "practice: 1 day this month; no run shown below 2");
ok(!/อันดับ(?!ใด)|ขาดตอน|streak|เสียแต้ม|ติดลบ/i.test(t.replace("ไม่มีการจัดอันดับ", "")), "practice: no ranking, no 'broken streak', no loss wording");
await shot(P.monk, "m-18-practice");
await noOverflow(P.monk, "practice");
for (const k of ["monk2", "sec", "abbot"]) {
  await P[k].goto(`${BASE}/temple/${T}/practice`);
  await text(P[k]);
  ok((await P[k].textContent("[data-testid=score]")).trim() === "0", `practice: ${k} sees only his own score (0), not the other monk's 10`);
}

console.log("MONASTIC E2E PASSED");
await browser.close();
