// E2E: community points, rewards, staff points tools, Command Center. FICTIONAL data in a throwaway DB (reset by e2e/run.sh). Phone viewport.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { clickNav, grantRole, seedVerifiedTemple, sql, waitText } from "./seed.mjs";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome });
let ipN = 40;
const page = async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH", extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${ipN++}` } });
  const p = await c.newPage(); p.on("pageerror", (e) => console.error("PAGEERROR:", p.url(), e.message.slice(0, 120))); return p;
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
const pid = (email) => sql(`select pe.id from public.persons pe join authx.users u on u.id = pe.auth_user_id where u.email = '${email}'`);
const balance = (person) => Number(sql(`select coalesce(sum(amount), 0) from public.boon_point_transactions where person_id = '${person}'`));

const T = seedVerifiedTemple("test-temple", "วัดทดสอบระบบ");
const U = {
  abbot: ["abbot@example.com", "เจ้าอาวาส ทดสอบ", "abbot", "bhikkhu"],
  fm: ["facility@example.com", "ผู้ดูแลอาคาร ทดสอบ", "facility_manager", "none"],
  off: ["office@example.com", "เจ้าหน้าที่สำนักงาน ทดสอบ", "office_staff", "none"],
  cm: ["member@example.com", "สมาชิกชุมชน ทดสอบ", "community_member", "none"],
  vol: ["volunteer@example.com", "อาสาสมัคร ทดสอบ", "volunteer", "none"],
  monk: ["monk@example.com", "พระภิกษุ ทดสอบ", "bhikkhu", "bhikkhu"],
};
const P = {}, ID = {};
for (const [k, [email, name, role, mk]] of Object.entries(U)) {
  P[k] = await page(); await login(P[k], email, name);
  ID[k] = grantRole(email, T, role, { monastic: mk });
}
const url = (path) => `${BASE}/temple/${T}/${path}`;

// ---------- 1 manual award by facility_manager (points.award_community D) ----------
const fm = P.fm;
await fm.goto(url("points/manage"));
let t = await text(fm);
ok(t.includes("มอบแต้มให้สมาชิก") && t.includes("ไม่ใช่การซื้อหรือแลกบุญ"), "award page for D holder, with the not-a-purchase copy");
const names = await fm.$$eval("#person_id option", (o) => o.map((x) => x.textContent));
ok(names.includes(U.cm[1]) && !names.includes(U.monk[1]) && names.some((n) => n.includes("(ตัวคุณเอง)")), "picker lists lay members (self marked), no monastics");
await shot(fm, "p-01-award-form");
await noOverflow(fm, "award page");

// refused: amount > 50 (input kept), no reason, self-award
await fm.selectOption("#person_id", { label: U.cm[1] }); await fm.fill("#amount", "51"); await fm.fill("#reason", "ช่วยจัดสถานที่งานบุญ (ข้อมูลทดสอบ)");
await fm.click("[data-testid=award-form] button[type=submit]");
await fm.waitForSelector("#amount-err");
t = await text(fm);
ok(t.includes("ตัวเลข 1–50"), "amount over 50 refused in Thai");
ok((await fm.inputValue("#amount")) === "51" && (await fm.inputValue("#reason")).includes("ช่วยจัดสถานที่") && (await fm.inputValue("#person_id")) === ID.cm, "input (incl. select) kept after error");
await fm.fill("#amount", "20"); await fm.fill("#reason", "");
await fm.click("[data-testid=award-form] button[type=submit]");
await fm.waitForSelector("#reason-err");
ok(true, "empty reason refused");
await fm.fill("#reason", "ช่วยจัดสถานที่งานบุญ (ข้อมูลทดสอบ)");
await fm.selectOption("#person_id", { label: `${U.fm[1]} (ตัวคุณเอง)` });
await fm.click("[data-testid=award-form] button[type=submit]");
await waitText(fm, "มอบแต้มให้ตัวเองไม่ได้");
ok(balance(ID.fm) === 0, "self-award refused by the database, nothing written");
await shot(fm, "p-02-award-refused");

await fm.selectOption("#person_id", { label: U.cm[1] });
await fm.click("[data-testid=award-form] button[type=submit]");
await waitText(fm, "มอบ 20 แต้มแล้ว");
ok(balance(ID.cm) === 20 && sql(`select txn_type from public.boon_point_transactions where person_id = '${ID.cm}'`) === "MANUAL_AWARD", "20 points written as MANUAL_AWARD");

// member sees +20 with the reason
const cm = P.cm;
await cm.goto(url("points"));
t = await text(cm);
ok(t.includes("20 แต้ม") && t.includes("+20") && t.includes("มอบโดยเจ้าหน้าที่") && t.includes("ช่วยจัดสถานที่งานบุญ"), "member sees +20, the type label and the reason");
ok(t.includes("ไม่ใช่การซื้อหรือแลกบุญ") && !/อันดับ(ที่)?\s*\d|เหลือน้อย|ด่วน/.test(t), "not-a-purchase copy; no ranking/pressure copy");
await shot(cm, "p-03-my-points");
await noOverflow(cm, "my points");

// ---------- 2 office_staff creates a reward (cost 15, stock 1, limit 1) ----------
const off = P.off;
await off.goto(url("rewards/manage"));
await text(off);
await off.fill("#new-name", ""); await off.click("[data-testid=reward-new] button[type=submit]");
await off.waitForSelector("#new-name-err");
ok(true, "empty reward form refused");
await off.fill("#new-name", "สมุดจดบันทึกทดสอบ"); await off.fill("#new-description", "ของขอบคุณผู้ร่วมกิจกรรม (ข้อมูลทดสอบ)");
await off.fill("#new-cost", "15"); await off.fill("#new-stock", "1"); await off.fill("#new-limit", "1");
await off.click("[data-testid=reward-new] button[type=submit]");
await waitText(off, "เพิ่ม \"สมุดจดบันทึกทดสอบ\" แล้ว");
ok(sql(`select cost || '/' || stock || '/' || per_person_limit || '/' || active from public.reward_catalog where name_th = 'สมุดจดบันทึกทดสอบ'`) === "15/1/1/true", "reward saved: cost 15, stock 1, limit 1, active");
await shot(off, "p-04-rewards-manage");
await noOverflow(off, "rewards manage");
// a member without reward.manage sees an explanation
await cm.goto(url("rewards/manage"));
ok((await text(cm)).includes("สำหรับเจ้าหน้าที่ที่ได้รับมอบหมาย"), "member cannot manage rewards (explanation)");

// ---------- 3 member redeems; a stale second tab is refused ----------
await cm.goto(url("rewards"));
t = await text(cm);
ok(t.includes("สมุดจดบันทึกทดสอบ") && t.includes("15 แต้ม") && t.includes("ขอรับได้คนละ 1 ชิ้น") && !t.includes("เหลือน้อย"), "catalogue shows the reward, cost, limit; no scarcity copy");
const stale = await cm.context().newPage();
await stale.goto(url("rewards")); await text(stale);
await shot(cm, "p-05-rewards");
await cm.click("[data-testid='reward-สมุดจดบันทึกทดสอบ'] button[type=submit]");
await waitText(cm, "ขอรับของที่ระลึกแล้ว");
ok(balance(ID.cm) === 5, "balance 20 -> 5 after redeeming 15");
await cm.waitForFunction(() => document.querySelector("[data-testid=balance]")?.textContent?.includes("5 แต้ม"));
await cm.goto(url("points"));
t = await text(cm);
ok(t.includes("−15") && t.includes("แลกของที่ระลึก") && t.includes("ของที่ระลึกจากการร่วมกิจกรรม: สมุดจดบันทึกทดสอบ"), "history explains the −15 redemption");
await stale.click("[data-testid='reward-สมุดจดบันทึกทดสอบ'] button[type=submit]");
await waitText(stale, "ของชิ้นนี้หมดแล้ว");
ok(balance(ID.cm) === 5 && sql("select count(*) from public.reward_redemptions") === "1", "second redeem refused (out of stock), nothing charged");
await shot(stale, "p-06-redeem-refused");

// ---------- 4 member cancels -> refund ----------
await cm.goto(url("rewards"));
await text(cm);
ok((await cm.textContent("[data-testid=mine]")).includes("รอรับของ"), "my requests: waiting");
await cm.click("[data-testid=mine-row] button:has-text('ยกเลิกคำขอ')");
await waitText(cm, "คืนแต้มให้ผู้ขอรับเรียบร้อย");
ok(balance(ID.cm) === 20 && sql("select status from public.reward_redemptions") === "CANCELLED" && sql("select stock from public.reward_catalog") === "1", "cancel -> CANCELLED, 15 points refunded, stock returned");
await cm.goto(url("points"));
t = await text(cm);
ok(t.includes("+15") && t.includes("คืนแต้ม") && t.includes("−15"), "history shows the refund next to the redemption");

// ---------- 5 office_staff fulfils a new request ----------
await cm.goto(url("rewards")); await text(cm);
await cm.click("[data-testid='reward-สมุดจดบันทึกทดสอบ'] button[type=submit]");
await waitText(cm, "ขอรับของที่ระลึกแล้ว");
await off.goto(url("rewards/manage"));
t = await text(off);
ok((await off.textContent("[data-testid=requested]")).includes(U.cm[1]), "staff sees the request with the requester's name");
await shot(off, "p-07-requested");
await off.click("[data-testid=requested-row] button:has-text('มอบแล้ว')");
await waitText(off, "บันทึกว่ามอบของแล้ว");
ok(sql("select status from public.reward_redemptions order by created_at desc limit 1") === "FULFILLED", "fulfil -> FULFILLED; message stays after the row leaves the list");
await cm.goto(url("rewards"));
ok((await text(cm)).includes("รับของแล้ว"), "member sees the redemption as received");

// ---------- 6 monk: explanation only, cannot redeem ----------
const monk = P.monk;
await monk.goto(url("points"));
t = await text(monk);
ok(t.includes("แต้มกิจวัตร") && t.includes("แยกต่างหาก") && !t.includes("แต้มคงเหลือ"), "monk sees an explanation about แต้มกิจวัตร, no balance");
ok(await monk.locator(`a[href='/temple/${T}/practice']`).count() === 1, "explanation links to the practice page");
await shot(monk, "p-08-monk");
await monk.goto(url("rewards"));
ok((await text(monk)).includes("พระและสามเณรไม่ร่วมระบบนี้") && await monk.locator("button[type=submit]").count() === 0, "monk sees no redeem button");
const monkUid = sql("select id from authx.users where email = 'monk@example.com'");
const monkRedeem = (() => { try {
  sql(`begin; select set_config('request.jwt.claims', '{"sub":"${monkUid}"}', true); set local role authenticated;
       select app.redeem_reward('${T}', (select id from public.reward_catalog limit 1), gen_random_uuid()); commit;`); return "allowed"; }
  catch (e) { return String(e.stderr ?? e.message).includes("FORBIDDEN_MONASTIC_OR_NOT_MEMBER") ? "refused" : "other:" + String(e.stderr ?? e.message).slice(0, 200); } })();
ok(monkRedeem === "refused", `database refuses a monk's redeem (${monkRedeem})`);

// ---------- 7 lay volunteer: own balance only ----------
await P.vol.goto(url("points"));
t = await text(P.vol);
ok(t.includes("0 แต้ม") && t.includes("ยังไม่มีประวัติแต้ม") && !t.includes(U.cm[1]), "volunteer sees own empty history only");

// ---------- 8 held points review ----------
// SETUP (sql, the quest UI is out of scope): a lay quest + completed assignment, then a HELD row as the verifier-concentration rule would create.
const q = sql(`insert into public.quests(temple_id, quest_type, title, created_by, status, verification_policy, points) values ('${T}', 'volunteer', 'อาสาเก็บขยะทดสอบ', '${ID.abbot}', 'OPEN', 'staff_verification', 10) returning id`).split("\n")[0];
const qa = sql(`insert into public.quest_assignments(temple_id, quest_id, assignee_person_id) values ('${T}', '${q}', '${ID.vol}') returning id`).split("\n")[0];
sql(`insert into public.point_holds(temple_id, person_id, assignment_id, amount, signal) values ('${T}', '${ID.vol}', '${qa}', 10, 'VERIFIER_CONCENTRATION')`);
await P.vol.goto(url("points"));
t = await text(P.vol);
ok(t.includes("รอตรวจ") && !t.includes("VERIFIER") && t.includes("0 แต้ม"), "volunteer sees held points as รอตรวจ (not counted, signal not shown)");
await shot(P.vol, "p-09-held-member");
await fm.goto(url("points/manage"));
t = await text(fm);
ok(t.includes("ผู้ตรวจคนเดียวตรวจงานของคนนี้เกือบทั้งหมด จึงพักแต้มไว้ให้คนอื่นตรวจ") && t.includes(U.vol[1]), "reviewer sees the signal explained in Thai and the person");
console.log(t.includes("อาสาเก็บขยะทดสอบ") ? "note - quest title visible to reviewer" : "note - quest title NOT visible to facility_manager (RLS)", "|", t.replace(/\s+/g, " ").slice(0, 300));
await shot(fm, "p-10-holds");
await fm.click("[data-testid=hold-row] button:has-text('อนุมัติ')");
await waitText(fm, "อนุมัติแล้ว แต้มถูกบันทึกให้ผู้รับ");
ok(balance(ID.vol) === 10 && sql("select status from public.point_holds") === "ACCEPTED", "approve -> ACCEPTED and 10 points written");
await P.vol.goto(url("points"));
ok((await text(P.vol)).includes("สะสมจากกิจกรรม"), "volunteer sees the EARN row");

// ---------- 9 Command Center ----------
// SETUP (sql): two overlapping confirmed entries for the monk tomorrow, and a planning event for the checklist.
sql(`insert into public.schedule_entries(temple_id, kind, title, person_id, starts_at, ends_at, created_by, venue_kind) values
  ('${T}', 'duty', 'เวรทดสอบ', '${ID.monk}', now() + interval '1 day', now() + interval '1 day 2 hours', '${ID.abbot}', 'IN_TEMPLE'),
  ('${T}', 'ceremony', 'พิธีทดสอบ', '${ID.monk}', now() + interval '1 day 1 hour', now() + interval '1 day 3 hours', '${ID.abbot}', 'IN_TEMPLE')`);
sql(`insert into public.events(temple_id, kind, title, starts_at, ends_at, status, created_by) values ('${T}', 'community', 'งานบุญทดสอบ', now() + interval '3 days', now() + interval '3 days 3 hours', 'PLANNING', '${ID.abbot}')`);
const ab = P.abbot;
await ab.goto(url("command"));
t = await text(ab);
ok(t.includes("ข้อมูล ณ"), "shows the as-of time");
ok(t.includes("สรุปอัตโนมัติจากข้อมูลในระบบ") && t.includes("สร้างจากการนับข้อมูลตามกฎ ไม่ได้ใช้ AI เขียน และไม่ได้ตัดสินแทนคน"), "daily summary titled and labelled as rule-based");
ok(await ab.locator("[data-testid=panel-monastic]").count() === 1, "abbot (command_center T) sees the monastic panel");
const maint = ab.locator("[data-testid=tile-maintenance]");
ok((await maint.getAttribute("data-unknown")) === "1" && (await maint.textContent()).includes("ไม่ทราบ") && (await maint.textContent()).includes("เหตุผล:") && !/^0/.test((await maint.textContent()).trim()), "maintenance renders ไม่ทราบ with the database reason, not 0");
const leave = await ab.locator("[data-testid=tile-staff-leave]").textContent();
ok(leave.includes("ไม่ทราบ") && leave.includes("ยังไม่มีในระบบ"), "staff leave renders ไม่ทราบ with the database reason");
ok(await ab.locator("[data-testid=conflict-row]").count() >= 1 && (await ab.textContent("[data-testid=conflicts]")).includes("ตารางซ้อนกัน") && (await ab.textContent("[data-testid=conflicts]")).includes("ระบบไม่ได้แก้ตารางให้เอง"), "seeded double booking appears as a suggestion (nothing auto-changed)");
ok((await ab.textContent("[data-testid=event-checklist]")).includes("มีผู้รับผิดชอบงาน") && (await ab.locator("[data-testid=event-checklist] li[data-done='0']").count()) > 0, "event checklist for the next manageable event shows unmet items");
ok(!/อันดับที่|อันดับ\s*\d|Top|ผู้นำ|ดีเด่น/.test(t) && t.includes("ไม่มีการจัดอันดับ"), "states there is no ranking; no ranking wording");
for (const href of ["availability", "invitations"]) ok(await ab.locator(`a[href='/temple/${T}/${href}']`).count() === 1, `link to ${href}`);
await shot(ab, "cc-01-abbot");
await noOverflow(ab, "command center");
// the score of a person never appears: the page has no per-person points
ok(!t.includes(U.cm[1]) , "no member names on the command page");

const fm2 = P.fm;
await fm2.goto(url("command"));
t = await text(fm2);
ok(await fm2.locator("[data-testid=panel-monastic]").count() === 0 && await fm2.locator("[data-testid=panel-quests]").count() === 1, "facility_manager (D) sees no monastic panel but the other panels");
ok(t.includes("สรุปอัตโนมัติจากข้อมูลในระบบ"), "facility_manager sees the daily summary");
await shot(fm2, "cc-02-facility-manager");

await cm.goto(url("command"));
t = await text(cm);
ok(t.includes("สำหรับเจ้าอาวาส") && await cm.locator("[data-testid=panel-quests]").count() === 0, "community member sees only an explanation");
await shot(cm, "cc-03-member");

// ---------- temple menu (/temple/<id>) shows only what each role may use; reached from /me ----------
const menuOf = async (p) => { await p.goto(`${BASE}/me`); await p.click(`[data-testid="menu-link-${T}"]`); await p.waitForURL(`**/temple/${T}`);
  return p.$$eval("[data-testid^=menu-]", (els) => els.map((e) => e.getAttribute("data-testid").replace("menu-", "")).sort().join(",")); };
let m = await menuOf(ab);
ok(["command", "monastic", "inbox", "events", "map"].every((k) => m.split(",").includes(k)) && !m.split(",").includes("points") && !m.split(",").includes("rewards"), `abbot (monastic) menu: command, monk menu, inbox; no personal points/rewards: ${m}`);
m = await menuOf(cm);
ok(m === "events,map,points,rewards", `community member menu (no staff tools, no command): ${m}`);
await shot(cm, "h-01-menu-member");
m = await menuOf(monk);
ok(!m.includes("points") && !m.includes("rewards") && m.includes("monastic"), `monk menu has no community points/rewards: ${m}`);
m = await menuOf(fm);
ok(m.includes("points-manage") && m.includes("command") && !m.includes("monastic"), `facility_manager menu: ${m}`);
await noOverflow(fm, "temple menu");

console.log("ALL POINTS E2E CHECKS PASSED");
await browser.close();
