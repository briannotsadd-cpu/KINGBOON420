// E2E: Temple Contact + follow temple. FICTIONAL data in a throwaway DB (reset by e2e/run.sh). Phone viewport.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { grantRole, sql } from "./seed.mjs";

// seed.mjs#seedVerifiedTemple currently violates temple_field_values_check (TEMPLE_CONFIRMED needs verified_by), so this spec
// carries the same fixture with a fixture verifier person. Same data, only verified_by added.
function seedVerifiedTemple(slug, nameTh) {
  sql(`insert into public.persons(display_name) select 'ผู้ตรวจสอบ (ข้อมูลทดสอบ)' where not exists (select 1 from public.persons where display_name = 'ผู้ตรวจสอบ (ข้อมูลทดสอบ)')`);
  return sql(`with t as (insert into public.temples(slug, name_th, status, is_listed, province) values ('${slug}', '${nameTh}', 'approved', true, 'จังหวัดทดสอบ') returning id),
    s as (insert into public.data_sources(temple_id, source_type, source_name, source_url, evidence)
          select id, 'onab_registry', 'TEST FIXTURE (fictional)', 'https://registry.example.invalid/${slug}', 'fixture' from t returning temple_id, id),
    v as (insert into public.temple_field_values(temple_id, field_key, value, source_id, status, verified_at, last_reviewed_at, verified_by)
          select s.temple_id, k, to_jsonb(val), s.id, 'TEMPLE_CONFIRMED', now(), now(), (select id from public.persons where display_name = 'ผู้ตรวจสอบ (ข้อมูลทดสอบ)') from s,
          (values ('temple.name_th', '${nameTh}'), ('temple.province', 'จังหวัดทดสอบ'), ('temple.address', 'ที่อยู่สมมติสำหรับทดสอบ')) x(k, val) returning 1)
    select id from t, (select count(*) from v) c`).split("\n")[0];
}

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome });
// each browser context gets its own fake client address (x-forwarded-for) so rate-limit buckets do not mix
const page = async (ip) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH", extraHTTPHeaders: { "x-forwarded-for": ip } });
  const p = await c.newPage(); p.on("pageerror", (e) => console.error("PAGEERROR:", e.message.slice(0, 300))); return p;
};
const text = async (p) => { await p.waitForFunction(() => !document.querySelector(".loading")); return p.textContent("main"); };
const shot = (p, n) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: true, animations: "disabled" });
async function login(p, email, name) {
  await p.goto(BASE + "/login");
  await p.fill("#email", email); await p.click("button[type=submit]");
  await p.waitForURL("**/login/code**");
  await p.fill("#code", codeFor(email)); await p.click("button[type=submit]");
  await p.waitForURL(/\/(welcome|me)$/);
  if (p.url().endsWith("/welcome")) { await p.fill("#name", name); await p.click("button[type=submit]"); await p.waitForURL("**/me"); }
}
async function send(p, slug, { topic = "invite_monk", message, name = "", phone = "" }) {
  await p.goto(`${BASE}/t/${slug}/contact`);
  await p.selectOption("#topic", topic); await p.fill("#message", message);
  await p.fill("#name", name); await p.fill("#phone", phone);
  await p.click("button[type=submit]");
}
const sentRef = async (p) => { await p.waitForURL(/\/contact\/sent\?ref=/); return (await p.textContent("[data-testid=ref-code]")).trim(); };
const noOverflow = async (p, m) => ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${m}: no horizontal scroll at phone width`);

const SLUG = "test-temple";
const T = seedVerifiedTemple(SLUG, "วัดทดสอบระบบ");

// 1 logged-out: temple page shows contact link + login-to-follow
let v = await page("198.51.100.1");
await v.goto(`${BASE}/t/${SLUG}`);
let t = await text(v);
ok(t.includes("ติดต่อวัด") && t.includes("เข้าสู่ระบบเพื่อติดตามวัด"), "temple page: contact link + 'login to follow' when logged out");
await shot(v, "k-01-temple-page");
await v.click("a:has-text('ติดต่อวัด')"); await v.waitForURL(`**/t/${SLUG}/contact`);
t = await text(v);
ok(t.includes("ข้อความส่งถึงเจ้าหน้าที่ของวัด ไม่ได้ส่งถึงพระโดยตรง") && t.includes("ใส่ถ้าต้องการให้วัดติดต่อกลับ"), "contact form works logged out, explainer present");
const topics = await v.$$eval("#topic option", (o) => o.map((x) => x.textContent));
ok(["ขอนิมนต์พระ", "สอบถามกิจกรรม", "ขอบริจาคสิ่งของ", "อื่น ๆ"].every((x) => topics.includes(x)), "four topics offered");
await shot(v, "k-02-contact-form");
await noOverflow(v, "contact form");

// 2 validation keeps input
await send(v, SLUG, { message: "สั้น", name: "ผู้ทดสอบ", phone: "12ab" });
await v.waitForSelector("#message-err");
t = await text(v);
ok(t.includes("อย่างน้อย 5 ตัวอักษร") && t.includes("เบอร์โทรใช้ได้เฉพาะตัวเลข"), "validation errors in Thai (message too short, bad phone)");
ok((await v.inputValue("#message")) === "สั้น" && (await v.inputValue("#name")) === "ผู้ทดสอบ" && (await v.inputValue("#phone")) === "12ab", "input kept after validation error");
await shot(v, "k-03-contact-errors");

// 3 logged-out success -> reference code, no reply-time promise
await v.fill("#message", "ขอนิมนต์พระมาทำบุญบ้านวันที่ 12 (ข้อมูลทดสอบ)"); await v.fill("#phone", "081 234 5678");
await v.click("button[type=submit]");
const anonRef = await sentRef(v);
t = await text(v);
ok(/^[0-9A-F]{8}$/.test(anonRef), `logged-out submit shows reference code ${anonRef}`);
ok(t.includes("เราบอกไม่ได้ว่าวัดจะตอบเมื่อไร") && !/ภายใน\s*\d/.test(t), "success page makes no reply-time promise");
await shot(v, "k-04-sent");
ok(sql(`select sender_person_id is null and sender_phone = '0812345678' from public.temple_contact_threads where ref_code = '${anonRef}'`) === "t", "anon thread stored without person; phone normalized");
ok(sql(`select sender_ip_hash ~ '^[0-9a-f]{64}$' and sender_ip_hash not like '%198.51.100.1%' from public.temple_contact_threads where ref_code = '${anonRef}'`) === "t", "only a sha256 hash of the client address is stored");

// 4 rate limit: 5 allowed, 6th refused with the Thai message and input kept
const r = await page("198.51.100.2");
for (let i = 1; i <= 5; i++) { await send(r, SLUG, { topic: "other", message: `ข้อความทดสอบครั้งที่ ${i}` }); await sentRef(r); }
await send(r, SLUG, { topic: "other", message: "ข้อความทดสอบครั้งที่ 6" });
await r.waitForSelector(".notice-error");
t = await text(r);
ok(t.includes("ส่งหลายครั้งเกินไป กรุณารอ 1 ชั่วโมงแล้วลองใหม่ หรือโทรหาวัดโดยตรง"), "6th submit within an hour -> rate-limit message");
ok((await r.inputValue("#message")) === "ข้อความทดสอบครั้งที่ 6", "message kept after rate-limit error");
await shot(r, "k-05-rate-limited");

// 5 unknown temple -> not found page
await v.goto(`${BASE}/t/no-such-temple/contact`);
ok((await text(v)).includes("ไม่พบวัดนี้"), "contact page for unverified/unknown temple is 404");

// 6 logged-in sender: own thread at /me/contacts
const sender = await page("198.51.100.3");
await login(sender, "sender@example.com", "ผู้ส่ง ทดสอบ");
await send(sender, SLUG, { topic: "activity", message: "สอบถามเวลาทำวัตรเย็น (ข้อมูลทดสอบ)", name: "ผู้ส่ง ทดสอบ", phone: "+66 81 000 0000" });
const ref = await sentRef(sender);
ok((await text(sender)).includes("ดูข้อความของฉัน"), "logged-in success page links to my messages");
await sender.goto(`${BASE}/me/contacts`);
t = await sender.textContent(`[data-testid=my-thread-${ref}]`);
ok(t.includes("สอบถามกิจกรรม") && t.includes("ใหม่") && t.includes("วัดทดสอบระบบ") && t.includes("สอบถามเวลาทำวัตรเย็น"), "sender sees own thread with status ใหม่ at /me/contacts");
ok(!(await text(sender)).includes(anonRef), "another visitor's anonymous thread is not shown");
await shot(sender, "k-06-my-contacts");
await noOverflow(sender, "/me/contacts");

// 7 staff: secretary (monastic, contact_inbox.manage) and a lay staff_general without it
const sec = await page("198.51.100.4");
await login(sec, "secretary@example.com", "พระเลขา ทดสอบ");
grantRole("secretary@example.com", T, "monk_secretary", { monastic: "bhikkhu" });
const gen = await page("198.51.100.5");
await login(gen, "staff@example.com", "เจ้าหน้าที่ทั่วไป");
grantRole("staff@example.com", T, "staff_general");

await sec.goto(`${BASE}/me`);
ok((await text(sec)).includes("กล่องข้อความ วัดทดสอบระบบ"), "/me lists the inbox for a user with contact_inbox.manage");
await shot(sec, "k-07-me-inbox-link");
await sec.click("a:has-text('กล่องข้อความ วัดทดสอบระบบ')"); await sec.waitForURL(`**/temple/${T}/inbox`);
t = await text(sec);
ok(t.includes(ref) && t.includes("+66 81 000 0000".replace(/\s/g, "")) && t.includes("สอบถามเวลาทำวัตรเย็น"), "secretary sees the new thread incl. phone (phone shown to inbox staff)");
ok(t.includes("ไม่มีช่องส่งตรงถึงพระ"), "inbox states there is no direct-to-monk channel");
await shot(sec, "k-08-inbox-new");
await noOverflow(sec, "inbox");

const card = (p) => p.locator(`[data-testid=thread-${ref}]`);
await card(sec).locator("button:has-text('รับเรื่อง')").click();
await sec.waitForSelector("text=รับเรื่องแล้ว");
ok(sql(`select status from public.temple_contact_threads where ref_code = '${ref}'`) === "ASSIGNED", "assign -> ASSIGNED");
await sec.goto(`${BASE}/temple/${T}/inbox?tab=new`);
ok((await text(sec)).includes("ยังไม่มีข้อความใหม่") || !(await text(sec)).includes(ref), "thread left the 'ใหม่' tab");
await sec.click("a:has-text('มอบหมายแล้ว')"); await sec.waitForURL(/tab=assigned/);
ok((await card(sec).count()) === 1, "thread is under มอบหมายแล้ว");

// reply validation keeps input, then a real reply
await card(sec).locator("button:has-text('ส่งคำตอบ')").click();
await card(sec).locator(".field-error").waitFor();
ok((await text(sec)).includes("กรุณาพิมพ์ข้อความตอบกลับ"), "empty reply refused with Thai message");
await card(sec).locator("textarea").fill("วัดรับทราบแล้ว ทำวัตรเย็นเวลา 17.00 น. (ข้อมูลทดสอบ)");
await card(sec).locator("button:has-text('ส่งคำตอบ')").click();
await sec.waitForSelector("text=ส่งคำตอบแล้ว");
ok(sql(`select status from public.temple_contact_threads where ref_code = '${ref}'`) === "REPLIED", "reply -> REPLIED");
await sec.goto(`${BASE}/temple/${T}/inbox?tab=replied`);
t = await card(sec).textContent();
ok(t.includes("ตอบโดย เจ้าหน้าที่วัด") && t.includes("ทำวัตรเย็นเวลา 17.00"), "replied tab shows 'ตอบโดย เจ้าหน้าที่วัด' + reply");
console.log("info- replier line:", t.match(/ตอบโดย เจ้าหน้าที่วัด[^\n]{0,40}/)?.[0]);
await shot(sec, "k-09-inbox-replied");

// sender sees the reply
await sender.goto(`${BASE}/me/contacts`);
t = await sender.textContent(`[data-testid=my-thread-${ref}]`);
ok(t.includes("ตอบแล้ว") && t.includes("ตอบโดย เจ้าหน้าที่วัด") && t.includes("ทำวัตรเย็นเวลา 17.00"), "sender sees status ตอบแล้ว and the reply");
await shot(sender, "k-10-my-contacts-reply");

// close
await card(sec).locator("button:has-text('ปิดเรื่อง')").click();
await sec.waitForSelector("text=ปิดเรื่องแล้ว");
ok(sql(`select status from public.temple_contact_threads where ref_code = '${ref}'`) === "CLOSED", "close -> CLOSED");
await sec.goto(`${BASE}/temple/${T}/inbox?tab=closed`);
ok((await card(sec).count()) === 1 && (await card(sec).locator("button").count()) === 0, "closed tab shows thread without actions");
await sec.goto(`${BASE}/temple/${T}/inbox`);
// the anonymous thread + the five rate-limit threads are still NEW, so empty state needs a different check below
ok((await text(sec)).includes(anonRef), "other new threads (anonymous sender) are listed for the secretary");
await sender.goto(`${BASE}/me/contacts`);
ok((await sender.textContent(`[data-testid=my-thread-${ref}]`)).includes("ปิด"), "sender sees status ปิด");

// empty state on a temple with no messages
const T2 = seedVerifiedTemple("test-temple-2", "วัดทดสอบสอง");
grantRole("secretary@example.com", T2, "monk_secretary", { monastic: "bhikkhu" });
await sec.goto(`${BASE}/temple/${T2}/inbox`);
ok((await text(sec)).includes("ยังไม่มีข้อความใหม่"), "empty inbox: ยังไม่มีข้อความใหม่");
await shot(sec, "k-11-inbox-empty");

// staff_general: no inbox link, no inbox content, cannot act
await gen.goto(`${BASE}/me`);
t = await text(gen);
ok(!t.includes("กล่องข้อความ วัด"), "/me shows no inbox link for staff_general");
await gen.goto(`${BASE}/temple/${T}/inbox`);
t = await text(gen);
ok(!t.includes(ref) && !t.includes(anonRef) && !t.includes("0812345678") && !t.includes("+66810000000") && (await gen.locator("textarea, button[type=submit]").count()) === 0,
  "staff_general sees no inbox content, phone or actions");
await shot(gen, "k-12-inbox-denied");
ok(sql(`select count(*) from public.temple_contact_threads where status <> 'NEW' and ref_code <> '${ref}'`) === "0", "nothing else was changed by staff_general");

// 8 follow + unfollow (verified temple only)
await sender.goto(`${BASE}/t/${SLUG}`);
t = await text(sender);
ok(t.includes("ติดตามวัด") && !t.includes("เข้าสู่ระบบเพื่อติดตามวัด"), "logged in: follow button instead of login prompt");
await sender.click("button:has-text('ติดตามวัด')");
await sender.waitForSelector("text=เลิกติดตามวัด");
ok(sql(`select count(*) from public.memberships m join public.persons p on p.id = m.person_id join authx.users u on u.id = p.auth_user_id where u.email = 'sender@example.com' and m.temple_id = '${T}' and m.status = 'active'`) === "1", "follow -> active community membership");
await shot(sender, "k-13-following");
await sender.reload();
ok((await text(sender)).includes("คุณกำลังติดตามวัดนี้"), "following state survives reload");
await sender.click("button:has-text('เลิกติดตามวัด')");
await sender.waitForSelector("button:has-text('ติดตามวัด')");
ok(sql(`select count(*) from public.memberships m join public.persons p on p.id = m.person_id join authx.users u on u.id = p.auth_user_id where u.email = 'sender@example.com' and m.temple_id = '${T}' and m.status = 'active'`) === "0", "unfollow -> membership left");
// DB gap, shown honestly: join_temple_community does not re-activate a 'left' membership
await sender.click("button:has-text('ติดตามวัด')");
await sender.waitForSelector(".notice-error");
ok((await text(sender)).includes("เคยเลิกติดตามไปแล้ว"), "re-follow after leaving is refused honestly (DB gap), not shown as success");
await shot(sender, "k-14-refollow-gap");

// staff member cannot leave via follow button: DB refusal shown
await gen.goto(`${BASE}/t/${SLUG}`);
await gen.click("button:has-text('เลิกติดตามวัด')");
await gen.waitForSelector(".notice-error");
ok((await text(gen)).includes("เลิกติดตามเองไม่ได้"), "leaving with a staff role is refused and the reason is shown");
ok(sql(`select count(*) from public.memberships m join public.persons p on p.id = m.person_id join authx.users u on u.id = p.auth_user_id where u.email = 'staff@example.com' and m.temple_id = '${T}' and m.status = 'active'`) === "1", "staff membership untouched");

console.log("CONTACT E2E PASSED");
await browser.close();
