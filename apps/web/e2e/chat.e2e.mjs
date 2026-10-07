// E2E: chat (direct + group, polling, unread, report, access control) and in-app calls (video connect, toggles, hang up, decline,
// call_permission 'nobody'). FICTIONAL data in a throwaway DB. Chromium uses fake camera/microphone devices.
// SETUP (not the feature under test, done with the owner connection because /community/profile is not in this worktree):
//   community_profiles rows (display_name, birth_year) and accepted `connections` rows are inserted via sql().
// The IncomingCallBanner must be mounted in app/layout.tsx for the callee part (the main agent mounts it).
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { grantRole, sql } from "./seed.mjs";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({
  executablePath: chrome,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const newCtx = async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH" });
  await c.grantPermissions(["camera", "microphone"], { origin: BASE });
  c.on("page", (pg) => pg.on("pageerror", (e) => console.error("PAGEERROR:", e.message.slice(0, 300))));
  return c;
};
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
async function login(page, email, name) {
  await page.goto(BASE + "/login");
  await page.fill("#email", email); await page.click("button[type=submit]");
  await page.waitForURL("**/login/code**");
  await page.fill("#code", codeFor(email)); await page.click("button[type=submit]");
  await page.waitForURL(/\/(welcome|me)$/);
  if (page.url().endsWith("/welcome")) { await page.fill("#name", name); await page.click("button[type=submit]"); await page.waitForURL("**/me"); }
}
const mainText = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return p.textContent("main"); };
const y = new Date().getFullYear();

// ---- setup: 5 people, temple role community_member, community profiles, accepted connections --------------------------------
const people = {
  alice: { email: "alice@example.com", name: "สมหญิง ใจดี" },
  bob: { email: "bob@example.com", name: "สมชาย รักษ์ธรรม" },
  carol: { email: "carol@example.com", name: "มาลี สุขใจ" },
  dave: { email: "dave@example.com", name: "ดวงดี มีสุข" },
  eve: { email: "eve@example.com", name: "อีฟ ผู้ไม่เกี่ยวข้อง" },
};
const pages = {};
for (const k of Object.keys(people)) { const c = await newCtx(); pages[k] = await c.newPage(); await login(pages[k], people[k].email, people[k].name); }
// seed.mjs seedVerifiedTemple() currently violates temple_field_values_check (needs verified_by), so insert the bare temple directly.
const templeId = sql("insert into public.temples(slug, name_th, status, is_listed, province) values ('chat-test-temple', 'วัดทดสอบแชท', 'approved', true, 'จังหวัดทดสอบ') returning id").split("\n")[0];
for (const k of ["alice", "bob", "carol", "dave"]) {
  people[k].id = grantRole(people[k].email, templeId, "community_member");
  sql(`insert into public.community_profiles(person_id, display_name, birth_year, call_permission) values ('${people[k].id}', '${people[k].name}', ${y - 35}, '${k === "dave" ? "nobody" : "connections"}')`);
}
for (const k of ["bob", "carol", "dave"])
  sql(`insert into public.connections(requester, addressee, status, responded_at) values ('${people.alice.id}', '${people[k].id}', 'accepted', now())`);
sql(`insert into public.connections(requester, addressee, status, responded_at) values ('${people.bob.id}', '${people.carol.id}', 'accepted', now())`);
const A = pages.alice, B = pages.bob, C = pages.carol, D = pages.dave, E = pages.eve;

// ---- 1 direct chat -----------------------------------------------------------------------------------------------------------
await A.goto(BASE + "/chat");
ok((await mainText(A)).includes("เริ่มแชทกับคนที่เชื่อมต่อแล้ว") && (await mainText(A)).includes(people.bob.name), "list: connections are offered; no sample data");
await shot(A, "ch-01-list-empty");
await A.click(`a:has-text("${people.bob.name}")`);
await A.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
const directUrl = A.url(); const directId = directUrl.split("/").pop();
ok((await A.textContent("[data-testid=chat-title]")) === people.bob.name, "open_direct_conversation -> direct room titled with the other person");
await B.goto(directUrl);
await A.evaluate(() => { window.__noReload = 1; }); await B.evaluate(() => { window.__noReload = 1; });
await A.fill("#chat-input", "สวัสดีครับ คุณสมชาย");
await A.click("button:has-text('ส่ง')");
await B.waitForSelector("[data-testid=msg]:has-text('สวัสดีครับ คุณสมชาย')", { timeout: 10000 });
ok((await B.evaluate(() => window.__noReload)) === 1, "A->B: message appeared on B by polling, no reload");
await B.fill("#chat-input", "สวัสดีครับ ยินดีที่ได้คุย");
await B.click("button:has-text('ส่ง')");
await A.waitForSelector("[data-testid=msg]:has-text('ยินดีที่ได้คุย')", { timeout: 10000 });
ok((await A.evaluate(() => window.__noReload)) === 1, "B->A: reply appeared on A by polling, no reload");
await shot(A, "ch-02-room");

// over-long message keeps the draft + explains
await A.fill("#chat-input", "ก".repeat(2001));
await A.click("button:has-text('ส่ง')");
await A.waitForSelector("text=ข้อความยาวเกินไป");
ok((await A.inputValue("#chat-input")).length === 2001, "over-long message: Thai error, draft kept");
await A.fill("#chat-input", "");

// ---- 2 unread badge ----------------------------------------------------------------------------------------------------------
await B.goto(BASE + "/chat");
await A.fill("#chat-input", "ข้อความที่ยังไม่ได้อ่าน");
await A.click("button:has-text('ส่ง')");
await B.waitForSelector("[data-testid=unread]", { timeout: 12000 });
ok((await B.textContent("[data-testid=unread]")).trim() === "1" && (await mainText(B)).includes("ข้อความที่ยังไม่ได้อ่าน"), "B's list shows last message + unread badge 1 (auto-refreshed)");
await shot(B, "ch-03-list-unread");
await B.click("[data-testid=conv-item]"); await B.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
await B.goto(BASE + "/chat");
ok((await B.locator("[data-testid=unread]").count()) === 0, "unread badge cleared after opening the chat (mark_read)");

// ---- 3 access control --------------------------------------------------------------------------------------------------------
await E.goto(directUrl);
ok((await mainText(E)).includes("ไม่ได้เป็นสมาชิก"), "non-member sees an empty/forbidden state on /chat/<id>");
ok(!(await mainText(E)).includes("สวัสดีครับ"), "non-member sees no messages");
ok((await E.evaluate(async (id) => (await fetch(`/api/chat/${id}`)).status, directId)) === 403, "non-member GET /api/chat/<id> => 403");
const anon = await (await browser.newContext()).request.get(`${BASE}/api/chat/${directId}`);
ok(anon.status() === 401, "no session GET /api/chat/<id> => 401");
ok((await (await browser.newContext()).request.get(`${BASE}/api/calls/incoming`)).status() === 401, "no session GET /api/calls/incoming => 401");
await E.goto(BASE + `/chat/new?with=${people.alice.id}`);
ok((await mainText(E)).includes("เริ่มแชทไม่ได้"), "no profile/connection: cannot open a direct chat (42501 explained in Thai)");

// ---- 4 group -----------------------------------------------------------------------------------------------------------------
await A.goto(BASE + "/chat/new-group");
await A.check(`label:has-text("${people.bob.name}") input`);
await A.click("button[type=submit]"); await A.waitForSelector("#title-err");
ok(await A.isChecked(`label:has-text("${people.bob.name}") input`), "group form: error shown and selection kept");
await shot(A, "ch-04-group-form");
await A.fill("#title", "ชมรมจิตอาสาทดสอบ");
await A.check(`label:has-text("${people.carol.name}") input`);
await A.click("button[type=submit]"); await A.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
const groupUrl = A.url();
ok((await A.textContent("[data-testid=chat-title]")) === "ชมรมจิตอาสาทดสอบ", "group created from accepted connections");
await A.fill("#chat-input", "ยินดีต้อนรับสู่กลุ่ม");
await A.click("button:has-text('ส่ง')");
await C.goto(groupUrl);
await C.waitForSelector("[data-testid=msg]:has-text('ยินดีต้อนรับสู่กลุ่ม')");
ok(true, "group member sees the group message");
ok((await C.locator("button:has-text('วิดีโอคอล')").count()) === 0, "group chat has no call buttons (calls are 1:1)");
await C.fill("#chat-input", "ขอบคุณค่ะ");
await C.click("button:has-text('ส่ง')");
await A.waitForSelector("[data-testid=msg]:has-text('ขอบคุณค่ะ')", { timeout: 10000 });
ok((await mainText(A)).includes(people.carol.name), "group: A sees C's reply with sender name");
await shot(C, "ch-05-group-room");

// ---- 5 report + removed message ---------------------------------------------------------------------------------------------
await B.goto(directUrl);
const aliceMsg = B.locator("[data-testid=msg]:has-text('สวัสดีครับ คุณสมชาย')");
await aliceMsg.locator("button[aria-label='ตัวเลือกข้อความ']").click();
await aliceMsg.locator("button:has-text('รายงานข้อความนี้')").click();
await aliceMsg.locator("select").selectOption("harassment");
await aliceMsg.locator("button:has-text('ส่งรายงาน')").click();
await B.waitForSelector("text=ส่งรายงานแล้ว");
ok(sql("select count(*) from public.moderation_reports where target_kind='message' and reason='harassment'") === "1", "app.report_content('message') stored the report");
sql(`update public.messages set removed_at = now(), removed_reason = 'e2e' where body = 'สวัสดีครับ คุณสมชาย'`); // moderator action stand-in
await B.reload();
ok((await B.locator("[data-testid=msg][data-removed='1']").textContent()).includes("(ข้อความถูกลบ)"), "removed message shows (ข้อความถูกลบ) and its body is not sent");

// ---- 6 call refused by call_permission 'nobody' ------------------------------------------------------------------------------
await A.goto(BASE + `/chat/new?with=${people.dave.id}`); await A.waitForURL(/\/chat\/[0-9a-f-]{36}$/);
await A.click("button:has-text('โทร')");
await A.waitForSelector("text=คนนี้ไม่รับสายในตอนนี้");
ok(A.url().includes("/chat/") && (await A.locator("[data-testid=call-screen]").count()) === 0, "call to a 'nobody' user is refused with Thai message, stays on chat");

// ---- 7 video call: connect, toggles, hang up -------------------------------------------------------------------------------
await A.goto(directUrl); await B.goto(BASE + "/chat");
await A.click("button:has-text('วิดีโอคอล')");
await A.waitForURL(/\/call\/[0-9a-f-]{36}/);
const callId = A.url().match(/\/call\/([0-9a-f-]{36})/)[1];
ok((await A.textContent("[data-testid=call-name]")) === people.bob.name, "caller screen shows callee name");
ok((await A.textContent("[data-testid=call-avatar]")).trim().length >= 1, "caller screen shows large avatar with initials (no photo upload in v1)");
await B.waitForSelector("[data-testid=incoming-call]", { timeout: 12000 });
ok((await B.textContent("[data-testid=incoming-call]")).includes(people.alice.name), "callee banner shows caller name");
await shot(B, "ch-06-incoming-banner");
await B.click("[data-testid=incoming-accept]");
await B.waitForURL(/\/call\/[0-9a-f-]{36}/);
for (const [n, p] of [["caller", A], ["callee", B]])
  await p.waitForSelector("[data-testid=call-screen][data-state=connected]", { timeout: 45000 }).catch(async (e) => {
    console.error(n, "state:", await p.getAttribute("[data-testid=call-screen]", "data-state"), await p.textContent("[data-testid=call-status]")); throw e; });
ok(true, "BOTH RTCPeerConnections report connectionState === 'connected'");
await A.waitForFunction(() => /คุยอยู่ \d\d:\d\d/.test(document.querySelector("[data-testid=call-status]").textContent));
ok(true, "status text shows คุยอยู่ mm:ss");
await A.waitForTimeout(1500);
await shot(A, "ch-07-call-screen");
await shot(B, "ch-08-call-screen-callee");

const trackEnabled = (p, kind) => p.evaluate((k) => {
  const v = document.querySelector("[data-testid=local-video]"); const t = (k === "audio" ? v.srcObject.getAudioTracks() : v.srcObject.getVideoTracks())[0];
  return t ? t.enabled : null; }, kind);
const pressed = (p, id) => p.getAttribute(`[data-testid=${id}]`, "aria-pressed");
ok((await pressed(A, "btn-mic")) === "true" && (await trackEnabled(A, "audio")) === true, "mic starts on");
await A.click("[data-testid=btn-mic]");
ok((await pressed(A, "btn-mic")) === "false" && (await trackEnabled(A, "audio")) === false && (await A.textContent("[data-testid=btn-mic]")).includes("ไมค์ ปิด"), "mic toggle: aria-pressed false, audio track disabled");
await A.click("[data-testid=btn-mic]");
ok((await pressed(A, "btn-mic")) === "true" && (await trackEnabled(A, "audio")) === true, "mic toggled back on");
await A.click("[data-testid=btn-camera]");
ok((await pressed(A, "btn-camera")) === "false" && (await trackEnabled(A, "video")) === false, "camera toggle: aria-pressed false, video track disabled");
await A.click("[data-testid=btn-camera]");
ok((await pressed(A, "btn-camera")) === "true" && (await trackEnabled(A, "video")) === true, "camera toggled back on");
const muted = (p) => p.evaluate(() => document.querySelector("[data-testid=remote-audio]").muted);
ok((await pressed(B, "btn-speaker")) === "true" && (await muted(B)) === false, "speaker starts on");
await B.click("[data-testid=btn-speaker]");
ok((await pressed(B, "btn-speaker")) === "false" && (await muted(B)) === true, "speaker toggle: aria-pressed false, remote audio element muted");
await B.click("[data-testid=btn-speaker]");
const hasRemote = await B.evaluate(() => document.querySelector("[data-testid=remote-audio]").srcObject?.getTracks().length);
ok(hasRemote >= 2, "callee receives remote audio+video tracks");

const localTracks = await A.evaluate(() => { window.__lt = document.querySelector("[data-testid=local-video]").srcObject.getTracks(); return window.__lt.length; });
await A.click("[data-testid=btn-hangup]");
await A.waitForSelector("[data-testid=call-screen][data-phase=ended]");
await B.waitForSelector("[data-testid=call-screen][data-phase=ended]", { timeout: 8000 });
ok((await A.textContent("[data-testid=call-status]")) === "วางสายแล้ว" && (await B.textContent("[data-testid=call-status]")) === "วางสายแล้ว", "hang up: both sides show วางสายแล้ว");
ok(await A.evaluate(() => window.__lt.every((t) => t.readyState === "ended")) && localTracks >= 2, "all local tracks stopped after hang up");
ok(sql(`select status from public.call_sessions where id = '${callId}'`) === "ended" && sql(`select count(*) from public.call_signals where call_id='${callId}'`) === "0", "DB: call ended, signals deleted");
await shot(A, "ch-09-call-ended");

// ---- 8 decline + voice call UI -----------------------------------------------------------------------------------------------
await A.goto(directUrl); await B.goto(BASE + "/chat");
await A.click("button:has-text('โทร')");
await A.waitForURL(/\/call\/[0-9a-f-]{36}/);
ok(await A.isDisabled("[data-testid=btn-camera]") && (await A.textContent("main")).includes("เปิดกล้องกลางสายไม่ได้"), "voice call: camera button disabled with explanation");
await B.waitForSelector("[data-testid=incoming-call]", { timeout: 12000 });
await B.click("[data-testid=incoming-decline]");
await A.waitForSelector("[data-testid=call-screen][data-phase=declined]", { timeout: 8000 });
ok((await A.textContent("[data-testid=call-status]")) === "ปฏิเสธสาย", "decline: caller sees ปฏิเสธสาย");
ok((await B.locator("[data-testid=incoming-call]").count()) === 0, "banner disappears after declining");

// ---- 9 caller cancels while ringing -> callee banner goes away --------------------------------------------------------------
await A.goto(directUrl); await B.goto(BASE + "/chat");
await A.click("button:has-text('โทร')"); await A.waitForURL(/\/call\/[0-9a-f-]{36}/);
await B.waitForSelector("[data-testid=incoming-call]", { timeout: 12000 });
await A.click("[data-testid=btn-hangup]");
await B.waitForSelector("[data-testid=incoming-call]", { state: "detached", timeout: 12000 });
ok(true, "caller hangs up while ringing: callee banner disappears");

console.log("ALL CHAT/CALL E2E CHECKS PASSED");
await browser.close();
