// E2E: community — ineligible explanations, profile + visibility, search, connect/accept, connections-only posts,
// comments, mute, block, report -> admin moderation (remove content / suspend / lift). FICTIONAL data in a throwaway DB.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { sql, grantRole, seedVerifiedTemple } from "./seed.mjs";

// seed.mjs#seedVerifiedTemple currently violates temple_field_values_check (verified_by is required), so this spec inserts a plain
// approved temple itself; community permissions only need an active membership, not the temple's field data.
const seedTemple = () => seedVerifiedTemple("community-test", "วัดทดสอบระบบ");

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome });
const newPage = async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH" });
  const pg = await c.newPage();
  pg.on("pageerror", (e) => console.error("PAGEERROR:", e.message.slice(0, 300)));
  return pg;
};
const settle = (p) => p.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
const go = async (p, path) => { await p.goto(BASE + path); await settle(p); await p.waitForFunction(() => !document.querySelector(".loading")); };
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return (await p.textContent("main")) ?? ""; };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
async function login(page, email, name) {
  await page.goto(BASE + "/login", { waitUntil: "load" });
  await settle(page);
  await page.fill("#email", email); await page.click("button[type=submit]");
  await page.waitForURL("**/login/code**");
  await page.fill("#code", codeFor(email)); await page.click("button[type=submit]");
  await page.waitForURL(/\/(welcome|me)$/);
  if (page.url().endsWith("/welcome")) { await page.fill("#name", name); await page.click("button[type=submit]"); await page.waitForURL("**/me"); }
}
async function createProfile(p, name, extra = {}) {
  await go(p, "/community/profile");
  await p.fill("#display_name", name);
  await p.fill("#birth_year", "2510");
  if (extra.bio) await p.fill("#bio", extra.bio);
  if (extra.skills) await p.fill("#skills", extra.skills);
  if (extra.interests) await p.fill("#interests", extra.interests);
  if (extra.bio_vis) await p.selectOption("#bio_vis", extra.bio_vis);
  if (extra.skills_vis) await p.selectOption("#skills_vis", extra.skills_vis);
  if (extra.interests_vis) await p.selectOption("#interests_vis", extra.interests_vis);
  await p.click("button[type=submit]");
  await p.waitForSelector("text=บันทึกโปรไฟล์แล้ว");
}
const article = (p, label, hasText) => p.locator(`article[aria-label="${label}"]`).filter(hasText ? { hasText } : {});
async function openMenu(art, item) {
  await art.locator('button[aria-label^="เมนูเพิ่มเติม"]').click();
  await art.locator(`[role=menuitem]:has-text("${item}")`).click();
}
async function post(p, body, vis) {
  await go(p, "/community");
  await p.fill("#body", body);
  await p.selectOption("#visibility", vis);
  await p.click("form button[type=submit]");
  await p.waitForSelector("text=โพสต์เรียบร้อยแล้ว");
}
const NA = "ผู้ทดสอบเอ", NB = "ผู้ทดสอบบี", NC = "ผู้ทดสอบซี";

// ---- 1 ineligible explanations ----------------------------------------------------------------------------------
const templeId = seedTemple();
const nop = await newPage();
await login(nop, "nop@example.com", "ผู้ไม่มีโปรไฟล์");
await go(nop, "/community");
let t = await text(nop);
ok(t.includes("ยังไม่มีโปรไฟล์ชุมชน") && (await nop.locator('a[href="/community/profile"].btn-primary').count()) === 1, "no profile: honest explanation + link to create profile");
await shot(nop, "c-01-no-profile");

const monk = await newPage();
await login(monk, "monk@example.com", "พระทดสอบ");
grantRole("monk@example.com", templeId, "bhikkhu", { monastic: "bhikkhu" });
await go(monk, "/community");
t = await text(monk);
ok(t.includes("บัญชีพระใช้ช่องทางติดต่อวัดแทน ไม่มีแชท/ชุมชน"), "monastic: explained, no community");
ok((await monk.locator("#body").count()) === 0, "monastic: no compose form");
await shot(monk, "c-02-monastic");

// ---- 2 profile (create, validation, visibility) ---------------------------------------------------------------------
const A = await newPage();
await login(A, "a@example.com", NA);
await go(A, "/community/profile");
await A.fill("#display_name", NA); await A.fill("#birth_year", "2560"); await A.click("button[type=submit]");
await A.waitForSelector("#birth_year-err");
ok((await text(A)).includes("ต่ำกว่า 20 ปี") && (await A.inputValue("#birth_year")) === "2560" && (await A.inputValue("#display_name")) === NA, "under-age birth year rejected with Thai message, input kept");
await A.fill("#birth_year", "99"); await A.click("button[type=submit]"); await A.waitForSelector("text=ตัวเลข 4 หลัก");
ok((await text(A)).includes("ตัวเลข 4 หลัก"), "malformed birth year rejected");
await shot(A, "c-03-profile-errors");
await createProfile(A, NA, { bio: "แนะนำตัวของเอ", skills: "ทำอาหาร, ปลูกต้นไม้", interests: "ฟังธรรม", bio_vis: "private", skills_vis: "public", interests_vis: "connections" });
await go(A, "/community/profile");
ok((await A.locator("#birth_year").count()) === 0 && (await text(A)).includes("2510") && (await text(A)).includes("แก้ไขไม่ได้"), "birth year read-only after first save");
ok((await A.inputValue("#bio_vis")) === "private" && (await A.inputValue("#skills")) === "ทำอาหาร, ปลูกต้นไม้", "saved visibility + comma list round-trip");
await shot(A, "c-04-profile");
await go(A, "/community");
ok((await text(A)).includes("ติดตามวัดก่อน") && (await A.locator('a[href="/"].btn-primary').count()) === 1, "profile but no temple membership: 'follow a temple first' with link to /");
await shot(A, "c-05-no-temple");
grantRole("a@example.com", templeId, "community_member");
await go(A, "/community");
ok((await A.locator("#body").count()) === 1, "after following a temple: community opens");

const B = await newPage(), C = await newPage();
await login(B, "b@example.com", NB); await login(C, "c@example.com", NC);
await createProfile(B, NB); await createProfile(C, NC);
grantRole("b@example.com", templeId, "community_member"); grantRole("c@example.com", templeId, "community_member");

// ---- 3 search + connect + accept ----------------------------------------------------------------------------------------
await go(B, "/community/people?q=" + encodeURIComponent("ผ"));
ok((await text(B)).includes("อย่างน้อย 2 ตัวอักษร"), "search < 2 chars: asks for more");
await go(B, "/community/people");
await B.fill("#q", "ผู้ทดสอบ"); await B.click("button[type=submit]");
await B.waitForURL(/q=/);
t = await text(B);
ok(t.includes(NA) && t.includes(NC) && !t.includes(NB), "search finds others, not self");
await shot(B, "c-06-search");
await B.click(`a:has-text("${NA}")`); await B.waitForURL(/\/community\/people\/[0-9a-f-]{36}$/);
await settle(B);
const aUrl = B.url();
t = await text(B);
ok(t.includes("ทำอาหาร") && !t.includes("แนะนำตัวของเอ") && !t.includes("ฟังธรรม"), "stranger sees only PUBLIC skills (bio private, interests connections-only hidden)");
ok((await B.locator('a[href^="/chat/new"]').count()) === 0, "no chat link before connection");
await settle(B);
await B.click("button:has-text('ขอเชื่อมต่อ')"); await B.waitForSelector("text=ส่งคำขอเชื่อมต่อแล้ว");
await B.waitForSelector("text=ส่งคำขอแล้ว รออีกฝ่ายตอบรับ");
ok(true, "connection request sent");
await go(A, "/community/connections");
t = await text(A);
ok(t.includes("คำขอที่รอคุณตอบ (1)") && t.includes(NB), "A sees incoming request");
await A.click("button:has-text('ยอมรับ')");
await A.waitForSelector("text=เชื่อมต่อกันแล้ว (1)");
await shot(A, "c-07-connections");
await go(B, new URL(aUrl).pathname);
t = await text(B);
ok(t.includes("ฟังธรรม") && !t.includes("แนะนำตัวของเอ"), "connected: sees connections-only interests, still not the private bio");
ok((await B.locator('a[href^="/chat/new?with="]').count()) === 1, "chat link shown only when connected (can_message)");
await shot(B, "c-08-profile-connected");

// ---- 4 posts: public + connections-only ---------------------------------------------------------------------------------------
await post(A, "โพสต์สาธารณะของเอ", "public");
await post(A, "โพสต์เฉพาะเพื่อนของเอ", "connections");
await go(C, "/community");
t = await text(C);
ok(t.includes("โพสต์สาธารณะของเอ") && !t.includes("โพสต์เฉพาะเพื่อนของเอ"), "non-connection sees public post only");
await go(B, "/community");
t = await text(B);
ok(t.includes("โพสต์สาธารณะของเอ") && t.includes("โพสต์เฉพาะเพื่อนของเอ"), "connection sees both posts");
await shot(B, "c-09-feed");

// ---- 5 comment ---------------------------------------------------------------------------------------------------------------------------
await B.click(`article:has-text("โพสต์สาธารณะของเอ") a:has-text("ความคิดเห็น")`); await B.waitForURL(/\/community\/posts\//);
await settle(B);
const postUrl = new URL(B.url()).pathname;
await B.fill("#body", "อนุโมทนาครับ"); await B.click("form button[type=submit]");
await B.waitForSelector("text=ส่งความคิดเห็นแล้ว");
await B.waitForSelector('article:has-text("อนุโมทนาครับ")');
ok((await text(B)).includes("ความคิดเห็น (1)"), "comment added and listed");
await shot(B, "c-10-post-comments");
await go(C, "/community");
ok((await text(C)).includes("ความคิดเห็น 1 รายการ"), "comment count shows in feed");

// ---- 6 mute ------------------------------------------------------------------------------------------------------------------------------
await openMenu(article(C, `โพสต์ของ ${NA}`), "ปิดเสียง");
await C.waitForSelector("text=ปิดเสียงแล้ว");
await go(C, "/community");
ok(!(await text(C)).includes("โพสต์สาธารณะของเอ"), "muted author's posts are hidden from the feed");
await go(C, "/community/people?q=" + encodeURIComponent("ผู้ทดสอบเอ"));
await C.click(`a:has-text("${NA}")`); await C.waitForURL(/\/community\/people\//);
await settle(C);
const aUrlC = new URL(C.url()).pathname;
await C.locator('button[aria-label^="เมนูเพิ่มเติม"]').click();
ok((await C.locator('[role=menuitem]:has-text("เลิกปิดเสียง")').count()) === 1, "profile menu offers unmute");
await C.locator('[role=menuitem]:has-text("เลิกปิดเสียง")').click(); await C.waitForSelector("text=เลิกปิดเสียงแล้ว");
await go(C, "/community");
ok((await text(C)).includes("โพสต์สาธารณะของเอ"), "unmute brings the posts back");

// ---- 7 block ------------------------------------------------------------------------------------------------------------------------------
await go(B, "/community");
await openMenu(article(B, `โพสต์ของ ${NA}`, "โพสต์สาธารณะของเอ"), "บล็อก");
await B.click("button:has-text('ยืนยันบล็อก')"); await B.waitForSelector("text=บล็อกแล้ว");
await go(B, "/community");
t = await text(B);
ok(!t.includes("โพสต์สาธารณะของเอ") && !t.includes("โพสต์เฉพาะเพื่อนของเอ"), "block hides the blocked person's posts");
await go(B, new URL(aUrl).pathname);
ok((await text(B)).includes("ไม่พบโปรไฟล์นี้"), "blocked person's profile cannot be seen");
await go(B, postUrl);
ok((await text(B)).includes("ไม่พบโพสต์นี้"), "blocked person's post page is gone");
await go(A, "/community/connections");
ok((await text(A)).includes("เชื่อมต่อกันแล้ว (0)"), "block removed the connection");
await go(B, "/community/connections");
t = await text(B);
ok(t.includes("คนที่บล็อก (1)") && t.includes(NA), "blocked list shows one entry with the person's name");
await shot(B, "c-11-blocked-list");
await B.click("button:has-text('ยกเลิกการบล็อก')");
await B.waitForSelector("text=คุณยังไม่ได้บล็อกใคร");
ok(true, "unblock works");

// ---- 8 report ------------------------------------------------------------------------------------------------------------------------------------
await go(C, "/community");
const art = article(C, `โพสต์ของ ${NA}`, "โพสต์สาธารณะของเอ");
await art.locator('button[aria-label^="เมนูเพิ่มเติม"]').click();
await art.locator('[role=menuitem]:has-text("รายงาน")').click();
await art.locator("button:has-text('ส่งรายงาน')").click();
await C.waitForSelector("text=กรุณาเลือกเหตุผลที่รายงาน");
ok(true, "report requires a reason");
await art.locator('label:has-text("ก่อกวน")').click();
await art.locator("textarea").fill("ทดสอบรายงานโพสต์");
await shot(C, "c-12-report-open");
await art.locator("button:has-text('ส่งรายงาน')").click();
await C.waitForSelector("text=ส่งรายงานแล้ว");
ok(true, "post reported");
await go(C, aUrlC);
await C.locator('button[aria-label^="เมนูเพิ่มเติม"]').click();
await C.locator('[role=menuitem]:has-text("รายงาน")').click();
await C.locator('label:has-text("เกี่ยวกับผู้เยาว์")').click();
await C.locator("form button:has-text('ส่งรายงาน')").click();
await C.waitForSelector("text=ส่งรายงานแล้ว");
ok(true, "person reported (minor safety)");

// ---- 9 admin ---------------------------------------------------------------------------------------------------------------------------------------
const nonAdmin = await go(C, "/admin/moderation");
ok((await text(C)).includes("สำหรับผู้ดูแลระบบเท่านั้น"), "non-admin cannot open moderation");
const admin = await newPage();
await login(admin, "admin@example.com", "ผู้ดูแลระบบทดสอบ");
await go(admin, "/admin/moderation");
t = await text(admin);
const firstTitle = await admin.locator("article").first().locator("h3").textContent();
ok(firstTitle.includes("โปรไฟล์") && firstTitle.includes("เกี่ยวกับผู้เยาว์") && t.includes("เร่งด่วน"), "minor_safety report is pinned first");
ok(t.includes(NA) && t.includes("โพสต์สาธารณะของเอ") && !t.includes(NC), "queue shows target + content but never the reporter");
await shot(admin, "c-13-admin-queue");
const personItem = admin.locator('article[aria-label="รายงานโปรไฟล์"]');
const postItem = admin.locator('article[aria-label="รายงานโพสต์"]');
ok((await personItem.locator('input[value=remove_content]').count()) === 0, "person report offers no 'remove content'");
await postItem.locator("button:has-text('บันทึกคำตัดสิน')").click();
await admin.waitForSelector("text=กรุณาเลือกคำตัดสิน");
await postItem.locator("input[value=remove_content]").check();
await postItem.locator("button:has-text('บันทึกคำตัดสิน')").click();
await admin.waitForSelector("text=กรุณาพิมพ์เหตุผลของคำตัดสิน");
ok(true, "decision requires a reason");
await postItem.locator("textarea").fill("ข้อความก่อกวน ทดสอบ");
await postItem.locator("button:has-text('บันทึกคำตัดสิน')").click();
await admin.waitForSelector("text=บันทึกคำตัดสินแล้ว");
await personItem.locator("input[value=suspend]").check();
await personItem.locator("textarea").fill("ทดสอบระงับบัญชี");
await personItem.locator("button:has-text('บันทึกคำตัดสิน')").click();
await admin.waitForSelector("article[aria-label='รายงานโปรไฟล์'] >> text=บันทึกคำตัดสินแล้ว");
ok(true, "admin removed the post and suspended the person, each with a reason");
await go(C, "/community");
ok(!(await text(C)).includes("โพสต์สาธารณะของเอ"), "removed post is gone from the feed");

// ---- 10 suspended ---------------------------------------------------------------------------------------------------------------------------------------
await go(A, "/community");
t = await text(A);
ok(t.includes("ถูกระงับการใช้ชุมชน") && t.includes("ทดสอบระงับบัญชี"), "suspended user sees the suspension + reason");
ok((await A.locator("#body").count()) === 0, "suspended user cannot compose");
await shot(A, "c-14-suspended");
await go(admin, "/admin/moderation");
t = await text(admin);
ok(t.includes("ผู้ที่ถูกระงับอยู่ (1)") && t.includes("รอตรวจสอบ (0)"), "admin sees suspension list and empty queue");
await admin.click("button:has-text('ยกเลิกการระงับ')"); await admin.waitForSelector("text=ยกเลิกการระงับแล้ว");
await go(A, "/community");
ok((await A.locator("#body").count()) === 1, "lifting the suspension restores access");

await browser.close();
console.log("E2E COMMUNITY PASSED");
