// E2E: temple map (2D), registry editor, confirm-before-public, public map, 3D showcase. FICTIONAL data in a throwaway DB. Phone viewport.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { clickNav, grantRole, seedVerifiedTemple, sql, waitText } from "./seed.mjs";

const [chrome, shots, LOG] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3000";
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok  -", m); };
const codeFor = (email) => [...readFileSync(LOG, "utf8").matchAll(new RegExp(`login code for ${email.replace(".", "\\.")}: (\\d{6})`, "g"))].at(-1)?.[1];
const browser = await chromium.launch({ executablePath: chrome, args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = async (ip, extra = {}) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH", extraHTTPHeaders: { "x-forwarded-for": ip }, ...extra });
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
/** tap points given as fractions of the 1600x1000 canvas */
async function tapPoints(p, pts) {
  const c = p.locator("[data-testid=poly-canvas]"); await c.scrollIntoViewIfNeeded();
  const box = await c.boundingBox();
  for (const [fx, fy] of pts) await c.click({ position: { x: box.width * fx, y: box.height * fy } });
}

const SLUG = "map-test";
const T = seedVerifiedTemple(SLUG, "วัดทดสอบระบบ");

const ed = await page("198.51.100.11"); await login(ed, "editor@example.com", "ผู้ดูแลสถานที่");
grantRole("editor@example.com", T, "facility_manager");
const ab = await page("198.51.100.12"); await login(ab, "abbot@example.com", "เจ้าอาวาสทดสอบ");
grantRole("abbot@example.com", T, "abbot", { monastic: "bhikkhu" });
const cm = await page("198.51.100.13"); await login(cm, "member@example.com", "สมาชิกทดสอบ");
grantRole("member@example.com", T, "community_member");
const pub = await page("198.51.100.14");

// 1 community_member cannot open the editor
await cm.goto(`${BASE}/temple/${T}/map/manage`);
let t = await text(cm);
ok(t.includes("หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์จัดการอาคารเท่านั้น") && (await cm.locator("form").count()) === 0, "community_member: editor page shows an explanation and no form");
await shot(cm, "mp-01-manage-denied");
await cm.goto(`${BASE}/temple/${T}/map`);
t = await text(cm);
ok(t.includes("วัดยังไม่ได้เพิ่มอาคารในแผนที่"), "empty map: วัดยังไม่ได้เพิ่มอาคารในแผนที่");
ok((await cm.locator("a:has-text('จัดการอาคารและแผนที่')").count()) === 0, "community_member sees no manage link");
ok((await cm.locator("a:has-text('ดูตัวอย่างแผนที่ 3 มิติ (สาธิต)')").count()) === 1, "map page links to the 3D showcase");
await shot(cm, "mp-02-map-empty");
await pub.goto(`${BASE}/t/${SLUG}/map`);
ok((await text(pub)).includes("วัดยังไม่ได้เผยแพร่แผนผัง"), "public map empty state: วัดยังไม่ได้เผยแพร่แผนผัง");
await shot(pub, "mp-03-public-empty");
await pub.goto(`${BASE}/t/no-such-temple/map`);
ok((await text(pub)).includes("ไม่พบวัดนี้"), "public map of unknown temple -> not found");

// 2 editor: invalid code keeps input
await ed.goto(`${BASE}/temple/${T}/map/manage`);
await ed.waitForSelector("[data-testid=form-add]");
await ed.fill("#code", "bad code"); await ed.fill("#name_th", "ศาลาทดสอบหนึ่ง"); await ed.selectOption("#visibility", "PUBLIC");
await tapPoints(ed, [[0.1, 0.1], [0.3, 0.1]]);
await ed.click("[data-testid=form-add] button[type=submit]");
await ed.waitForSelector("#code-err");
t = await text(ed);
ok(t.includes("รหัสต้องเป็นตัวพิมพ์ใหญ่") && (await ed.inputValue("#code")) === "bad code" && (await ed.inputValue("#name_th")) === "ศาลาทดสอบหนึ่ง", "invalid code -> Thai error, input kept");
ok(t.includes("รูปร่างต้องมีอย่างน้อย 3 จุด") && (await ed.textContent("[data-testid=poly-count]")).includes("2 จุด"), "2-point polygon refused with Thai message, points kept");
await shot(ed, "mp-04-manage-errors");

// 3 PUBLIC building with a 4-point polygon (+ undo)
await ed.fill("#code", "test.sala.01");
await tapPoints(ed, [[0.3, 0.3], [0.1, 0.3]]);
ok((await ed.textContent("[data-testid=poly-count]")).includes("4 จุด"), "four points drawn on the canvas");
await tapPoints(ed, [[0.9, 0.9]]);
await ed.click("button:has-text('ย้อนจุดล่าสุด')");
ok((await ed.textContent("[data-testid=poly-count]")).includes("4 จุด"), "undo removes the last point");
await shot(ed, "mp-05-polygon-drawn");
await ed.click("[data-testid=form-add] button[type=submit]");
await waitText(ed, "เพิ่มอาคาร TEST.SALA.01 แล้ว");
ok(sql(`select jsonb_array_length(polygon2d) = 4 and public_visibility = 'PUBLIC' and confirmed_at is null from public.buildings where temple_id = '${T}' and code = 'TEST.SALA.01'`) === "t", "building saved: 4 points, PUBLIC, unconfirmed");
await waitText(ed, "รอวัดยืนยัน");
ok((await ed.inputValue("#code")) === "" && (await ed.textContent("[data-testid=poly-count]")).includes("0 จุด"), "form emptied for the next building after create");

// 4 STAFF_ONLY building, no polygon
await ed.fill("#code", "TEST.KUTI.01"); await ed.fill("#name_th", "กุฏิทดสอบ"); await ed.selectOption("#kind", "KUTI"); await ed.selectOption("#visibility", "STAFF_ONLY");
await ed.click("[data-testid=form-add] button[type=submit]");
await waitText(ed, "เพิ่มอาคาร TEST.KUTI.01 แล้ว");
ok(sql(`select polygon2d is null and public_visibility = 'STAFF_ONLY' from public.buildings where temple_id = '${T}' and code = 'TEST.KUTI.01'`) === "t", "STAFF_ONLY building without polygon saved");
await ed.waitForSelector("[data-testid='row-TEST.KUTI.01']");
ok((await ed.locator("[data-testid='row-TEST.KUTI.01'] button:has-text('ยืนยันข้อมูลอาคารนี้')").count()) === 0, "facility_manager (no temple.settings) has no confirm button");
// duplicate code -> DB unique violation mapped
await ed.fill("#code", "TEST.KUTI.01"); await ed.fill("#name_th", "กุฏิซ้ำ");
await ed.click("[data-testid=form-add] button[type=submit]");
await ed.waitForSelector("#code-err");
ok((await text(ed)).includes("รหัสนี้ถูกใช้แล้วในวัดนี้") && (await ed.inputValue("#name_th")) === "กุฏิซ้ำ", "duplicate code -> Thai error from DB error mapping, input kept");
// zone
await ed.fill("#zone-code", "TEST.COURT.01"); await ed.fill("#zone-name", "ลานทดสอบ"); await ed.selectOption("#zone-building", { label: "ศาลาทดสอบหนึ่ง" });
await ed.click("[data-testid=form-zone] button[type=submit]");
await waitText(ed, "เพิ่มโซน TEST.COURT.01 แล้ว");
await ed.waitForSelector("[data-testid='zone-TEST.COURT.01']");
ok(true, "zone added and listed");
await shot(ed, "mp-06-manage-list");
await noOverflow(ed, "manage");

// 5 editor map: sees unconfirmed with badge; list entry without polygon
await ed.goto(`${BASE}/temple/${T}/map`);
t = await text(ed);
ok(t.includes("รอวัดยืนยัน") && t.includes("ยังไม่มีตำแหน่งบนแผนที่") && t.includes("กุฏิทดสอบ"), "editor sees unconfirmed badge and 'no position' entry");
// 6 community member does not see unconfirmed
await cm.goto(`${BASE}/temple/${T}/map`);
t = await text(cm);
ok(!t.includes("ศาลาทดสอบหนึ่ง") && !t.includes("กุฏิทดสอบ") && t.includes("วัดยังไม่ได้เพิ่มอาคารในแผนที่"), "community_member does not see unconfirmed buildings");
await pub.goto(`${BASE}/t/${SLUG}/map`);
ok((await text(pub)).includes("วัดยังไม่ได้เผยแพร่แผนผัง"), "public map still empty while unconfirmed");

// 7 abbot confirms
await ab.goto(`${BASE}/temple/${T}/map/manage`);
t = await text(ab);
ok(t.includes("เมื่อยืนยันแล้ว อาคารที่ตั้งเป็น 'ทุกคน' จะแสดงบนแผนที่สาธารณะ; ถ้าแก้ไขภายหลังต้องยืนยันใหม่"), "confirm explanation text shown to the temple admin");
await shot(ab, "mp-07-confirm");
await ab.locator("[data-testid='row-TEST.SALA.01'] button:has-text('ยืนยันข้อมูลอาคารนี้')").click();
await ab.waitForSelector("[data-testid='row-TEST.SALA.01'] .notice-ok");
await ab.locator("[data-testid='row-TEST.KUTI.01'] button:has-text('ยืนยันข้อมูลอาคารนี้')").click();
await ab.waitForSelector("[data-testid='row-TEST.KUTI.01'] .notice-ok");
ok(sql(`select count(*) from public.buildings where temple_id = '${T}' and confirmed_at is not null`) === "2", "abbot confirmed both buildings");
await ab.waitForSelector("[data-testid='row-TEST.SALA.01'] .badge:has-text('วัดยืนยันแล้ว')");

// 8 community member sees the PUBLIC one on the map and list; STAFF_ONLY stays hidden
await cm.goto(`${BASE}/temple/${T}/map`);
await cm.waitForSelector("[data-testid='poly-TEST.SALA.01']");
t = await text(cm);
ok(t.includes("ศาลาทดสอบหนึ่ง") && !t.includes("กุฏิทดสอบ") && !t.includes("รอวัดยืนยัน"), "community_member sees the confirmed PUBLIC building, not the STAFF_ONLY one");
const label = await cm.getAttribute("[data-testid='poly-TEST.SALA.01']", "aria-label");
ok(label.includes("ศาลาทดสอบหนึ่ง") && (await cm.getAttribute("[data-testid='poly-TEST.SALA.01']", "tabindex")) === "0", "polygon is focusable with an aria-label");
await noOverflow(cm, "map");
await shot(cm, "mp-08-member-map");
// sheet from the polygon
await cm.locator("[data-testid='poly-TEST.SALA.01']").focus(); await cm.keyboard.press("Enter");
await cm.waitForSelector("[data-testid=building-sheet]");
let sheet = await cm.textContent("[data-testid=building-sheet]");
ok(sheet.includes("ศาลาทดสอบหนึ่ง") && sheet.includes("ศาลา") && sheet.includes("เปิดใช้งาน") && sheet.includes("TEST.SALA.01") && sheet.includes("กิจกรรมวันนี้") && sheet.includes("งานอาสาที่เปิดอยู่"),
  "building sheet opens from the polygon (keyboard) with name, kind, status, counts");
ok((await cm.textContent("[data-testid=sheet-events]")).trim() === "ไม่ทราบ" && (await cm.textContent("[data-testid=sheet-quests]")).trim() === "ไม่ทราบ",
  "community member: event/quest counts shown as ไม่ทราบ (unknown), never 0 (0014)");
await shot(cm, "mp-09-sheet-polygon");
await cm.click("button[aria-label='ปิดรายละเอียดอาคาร']");
ok((await cm.locator("[data-testid=building-sheet]").count()) === 0, "sheet closes");
// sheet from the list
await cm.click("[data-testid='item-TEST.SALA.01']");
await cm.waitForSelector("[data-testid=building-sheet]");
ok((await cm.textContent("[data-testid=building-sheet]")).includes("ศาลาทดสอบหนึ่ง"), "building sheet opens from the list too");

// 9 abbot map: both visible; STAFF_ONLY entry has no position
await ab.goto(`${BASE}/temple/${T}/map`);
t = await text(ab);
ok(t.includes("กุฏิทดสอบ") && t.includes("ยังไม่มีตำแหน่งบนแผนที่") && (await ab.locator("a:has-text('แก้ไขอาคารนี้')").count()) === 0, "abbot sees both buildings; no edit link until a sheet is open");
await ab.click("[data-testid='item-TEST.KUTI.01']");
await ab.waitForSelector("[data-testid=building-sheet] a:has-text('แก้ไขอาคารนี้')");
ok(true, "managers get an edit link in the sheet");

// 10 public map shows only the confirmed PUBLIC one
await pub.goto(`${BASE}/t/${SLUG}/map`);
await pub.waitForSelector("[data-testid='poly-TEST.SALA.01']");
t = await text(pub);
ok(t.includes("ศาลาทดสอบหนึ่ง") && !t.includes("กุฏิทดสอบ"), "public map shows only the confirmed PUBLIC building");
await pub.click("[data-testid='item-TEST.SALA.01']");
ok(!(await pub.textContent("[data-testid=building-sheet]")).includes("กิจกรรมวันนี้"), "public sheet shows no internal counts");
await shot(pub, "mp-10-public-map");
await pub.goto(`${BASE}/t/${SLUG}`);
await clickNav(pub, "a:has-text('แผนผังวัด')", `**/t/${SLUG}/map`, { retry: true });
ok(true, "temple page links to the public map");

// 11 editing the name clears the confirmation
const bid = sql(`select id from public.buildings where temple_id = '${T}' and code = 'TEST.SALA.01'`);
await ed.goto(`${BASE}/temple/${T}/map/manage?edit=${bid}`);
await ed.waitForSelector("[data-testid=form-edit]");
ok((await ed.textContent("[data-testid=code-readonly]")).trim() === "TEST.SALA.01" && (await ed.locator("[data-testid=form-edit] input[name=code]").count()) === 0, "code is read-only on edit");
ok((await ed.textContent("[data-testid=poly-count]")).includes("4 จุด"), "edit form loads the existing polygon");
await ed.fill("#name_th", "ศาลาทดสอบหนึ่ง (แก้ชื่อ)");
await ed.click("[data-testid=form-edit] button[type=submit]");
await waitText(ed, "บันทึกแล้ว ถ้าอาคารนี้เคยยืนยันแล้ว ต้องให้วัดยืนยันใหม่");
ok(sql(`select confirmed_at is null from public.buildings where id = '${bid}'`) === "t", "renaming cleared the confirmation");
await ed.waitForSelector("[data-testid='row-TEST.SALA.01'] .badge:has-text('รอวัดยืนยัน')");
await shot(ed, "mp-11-edited");
await cm.goto(`${BASE}/temple/${T}/map`);
ok(!(await text(cm)).includes("ศาลาทดสอบหนึ่ง"), "community_member no longer sees the edited, unconfirmed building");
await pub.goto(`${BASE}/t/${SLUG}/map`);
ok((await text(pub)).includes("วัดยังไม่ได้เผยแพร่แผนผัง"), "public map hides it again");

// 12 3D showcase
const sc = await page("198.51.100.15", { reducedMotion: "reduce" });
await sc.goto(`${BASE}/showcase/3d`);
const LABEL = "แบบจำลองเชิงศิลป์เพื่อสาธิต (placeholder) — ไม่ใช่ข้อมูลจริงหรือผังสำรวจของวัดใด ความสูงและตำแหน่งเป็นการประมาณเชิงศิลป์";
const CREDIT = "สร้างโดยโครงการ BOON SYSTEM (procedural, project-owned)";
await sc.waitForSelector("[data-testid=showcase]:not([data-state=loading])", { timeout: 60000 });
t = await text(sc);
ok(t.includes(LABEL) && t.includes(CREDIT), "showcase shows the placeholder label and the credit");
const state = await sc.getAttribute("[data-testid=showcase]", "data-state");
if (state === "ready") {
  ok((await sc.locator("canvas[data-testid=canvas-3d]").count()) === 1, "3D canvas rendered");
  ok((await sc.getAttribute("canvas[data-testid=canvas-3d]", "aria-label")).includes(LABEL), "canvas alt text carries the placeholder label");
  ok((await sc.getAttribute("[data-testid=showcase]", "data-autorotate")) === "false", "prefers-reduced-motion -> no auto-rotate");
  await sc.waitForTimeout(800);
  const cv = sc.locator("canvas[data-testid=canvas-3d]"); const box = await cv.boundingBox();
  await sc.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
  await sc.waitForSelector("[data-testid=pick-code]", { timeout: 5000 }).catch(() => {});
  const tapped = await sc.locator("[data-testid=pick-code]").count();
  console.log("info- canvas tap at centre selected a building:", tapped ? await sc.textContent("[data-testid=pick-code]") : "no (nothing under the tap)");
  await sc.click("[data-testid='node-WAT-ARUN.UBOSOT']");
  ok((await sc.textContent("[data-testid=pick-code]")).trim() === "WAT-ARUN.UBOSOT", "choosing a node from the list shows its code");
  await shot(sc, "mp-12-showcase-3d");
  const rm = await sc.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  ok(rm, "reduced-motion emulation active");
  const def = await page("198.51.100.16");
  await def.goto(`${BASE}/showcase/3d`);
  await def.waitForSelector("[data-testid=showcase][data-state=ready]", { timeout: 60000 });
  ok((await def.getAttribute("[data-testid=showcase]", "data-autorotate")) === "true", "default motion -> auto-rotate on");
} else {
  ok((await sc.locator("[data-testid=webgl-fallback]").count()) === 1, "WebGL unavailable: fallback message + 2D illustration link shown");
  await shot(sc, "mp-12-showcase-fallback");
}
await noOverflow(sc, "showcase");

console.log("MAP E2E PASSED");
await browser.close();
