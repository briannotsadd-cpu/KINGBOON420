# UX / UI / Spatial Experience Upgrade

วันที่: 8 ตุลาคม 2026 · Repository: `briannotsadd-cpu/KINGBOON420`
Base: `fd2d9a15aad4e731d7991f71a92427db6b4137a7`
Branch: `codex/spatial-ux-upgrade`

**สถานะรวม: PARTIAL** — มี Implementation และผลตรวจจริงตามตารางด้านล่าง ยังไม่ผ่าน Definition of Done ของ Digital Twin / Production-grade 3D ทั้งหมด เพราะไม่มีข้อมูลพื้นที่จริง ฐานข้อมูลทดสอบ และ GPU Browser ที่รองรับ WebGL ไม่ได้ Deploy หรือ Merge

## สิ่งที่พบและลำดับความสำคัญ

| ระดับ | Evidence / ปัญหา | ผลการดำเนินการ |
| --- | --- | --- |
| P0 / Environment | Lockfile เดิมมีแพ็กเกจใหม่เกิน minimum release age ของ Runtime | VERIFIED: Resolve ใหม่ภายใต้นโยบายเดิม และ Frozen install ผ่าน ไม่ปิดการป้องกัน |
| P1 | แผนที่ใช้ Panel ต่อท้าย Scene; โฟกัสเปิด Panel ไม่แน่นอนและไม่มีการคืนโฟกัส | IMPLEMENTED + VERIFIED บน Component: Panel ข้าง Scene, รอ DOM Commit ก่อน Focus, Escape/ปิดคืนโฟกัส |
| P1 | Parking เป็นรายการรอง ไม่มี Save / Find My Car และเชื่อมแผนผังไม่ชัด | IMPLEMENTED: Overview เด่นบนหน้าวัด, หน้า Parking ใหม่, ลิงก์สองทิศทางกับแผนผัง |
| P1 | State GPS สามารถค้างหลัง Retry, เปลี่ยนวัด หรือรายงานใหม่ถอนลานเดิม | IMPLEMENTED: ล้างพิกัดก่อน Retry, ยกเลิก Request เดิม, ห้าม Save โดยใช้ลาน Fallback เงียบ ๆ; VERIFIED การถอนลาน/ล้าง Note ผ่าน UI |
| P1 | Native Field บางแห่งอ้าง Hint/Error ID ผิดหรือไม่ประกาศ Required/Invalid | IMPLEMENTED + VERIFIED: Shared Field ผูก ID กับ DOM ที่มีจริง โดยคง Value/Name/Handlers เดิม |
| P1 | ปุ่ม Danger/Success ใน Dark Theme ใช้ข้อความสีขาวบนพื้นอ่อน | IMPLEMENTED + VERIFIED เชิงตัวเลข: เพิ่ม Semantic on-color tokens สำหรับ Chat/Call/ปุ่มทั่วไป |
| P2 | 3D Render ต่อเนื่องและหมุนอัตโนมัติ; ไม่มีเครื่องมือกล้องสำหรับ Keyboard ที่ชัด | IMPLEMENTED: Demand rendering, Visibility pause, Opt-in rotation, Camera controls, Reduced motion |
| P2 | Typography, Navigation state, ความกว้างหน้า และเงาไม่แยกงานอ่านกับ Spatial work | IMPLEMENTED: Sarabun TH/EN weights จริง, Type/Motion tokens, Current navigation, Reading/Auth/Scene widths |
| P3 | ภาพทีเซอร์สูงผิดสัดส่วน, Label บนแผนผังใหญ่, State feedback/focus เล็กน้อย | IMPLEMENTED + VERIFIED ในขนาดจอที่ระบุ: Crop ภาพ 4:3, Code labels, Post-delete focus, Icon/Spacing/Touch targets |

Audit อ่าน Route tree, Layout, Shared UI, Forms, Map, 3D, Parking, Chat/Call และข้อมูล DB ปัจจุบัน การตรวจหน้าที่ต้องลงชื่อเข้าใช้เป็น Code review; ไม่อ้างว่าได้ทดสอบผู้ใช้จริงหรือทุกหน้าในระบบ

## Design Decisions

- ใช้ Ivory / Deep teak / Saffron ของวัดเดิมต่อเนื่อง ให้ Primary มีหน้าที่นำทางและ Action; สีสถานะใช้คู่กับข้อความและ Icon
- หน้า Search ให้ผลลัพธ์เป็นเนื้อหาหลัก ทีเซอร์ 3D อยู่ลำดับรองและระบุว่าเป็นภาพเชิงศิลป์
- จัด Scene กับรายละเอียดให้อยู่ใน Context เดียวกันบน Desktop และเรียงใน Column เดียวตาม Breakpoint มือถือ
- ใช้ Font family เดียวสำหรับไทยและอังกฤษ: Sarabun 400/500/600/700, Heading scale, Label/Caption และ Tabular numerals ไม่เพิ่ม Font library
- ใช้ CSS transitions สำหรับ Feedback และ Camera easing สำหรับ Orientation ไม่มี Motion framework เพิ่ม
- Parking ใช้ข้อมูลที่ Backend มีจริงระดับลานเท่านั้น ไม่สร้างช่องจอด พิกัด ทางเดิน หรือตัวเลขเพื่อให้หน้าเต็ม

## 3D Improvements — IMPLEMENTED

- คง Three.js / OrbitControls / GLTFLoader เดิมและ Dynamic imports ไม่เปลี่ยน Engine
- Demand render loop หยุดเมื่อไม่มีงาน; หยุด Scene เมื่ออยู่นอก Viewport/Tab ถูกซ่อน
- กล้อง Focus/Reset/Top/Zoom แบบ 560ms easing; Reduced motion ข้าม Transition และปิดหมุนอัตโนมัติ
- เลือกอาคารผ่าน Native select หรือ Raycast; แยก Click จาก Drag/Multitouch และไม่เลือกทะลุวัตถุทึบด้านหน้า
- Bounds คำนวณเฉพาะ Visible geometry ไม่รวม LOD ที่ซ่อน; Selection footprint แสดงตำแหน่งที่เลือก
- ACES tone mapping, RoomEnvironment reflection, แสงหลัก/แสงเติม, Static 1024 shadow และ DPR cap 1.5
- GLB Fetch ยกเลิกได้และ Timeout 30 วินาที; จัดการ Context loss / Error พร้อมภาพ 2D
- Cleanup Controls, Observer, Events, RAF, Model geometry/material/texture, Environment และ Renderer

**BLOCKED การยืนยันภาพและ Performance:** Cloud Browser คืน `GL_VENDOR=Disabled, GL_RENDERER=Disabled` และ `Error creating WebGL context` จึงยืนยันได้เฉพาะ Fallback ไม่ได้ยืนยัน Camera/Raycast/Touch/FPS/Memory runtime

Asset เดิม `wat-arun-stylized.glb` เป็น Procedural artistic placeholder (~1.35 MB, 12,184 visible triangles ตาม GLB inspection) ไม่ใช่ผังสำรวจ มีข้อความ Placeholder และ Credit เดิมครบ ไม่แก้ Asset/generator ที่มี Ownership แยก ไม่ทำ Exploded floors เพราะไม่มี Floor geometry / Floor metadata

## Parking Improvements — IMPLEMENTED

- หน้า `/t/[slug]/parking` ใช้ `templePublic` + `templeParking` เดิม; Overview บนหน้าวัดและ Map เชื่อมกับหน้านี้
- เลือกลาน, ดูสถานะ/Icon/ความจุ/ช่องผู้พิการ/ค่าจอด/เวลา และตรวจรายงานใหม่ผ่าน Router refresh
- Occupancy แสดงเฉพาะจำนวนที่ Backend รายงานและมีความจุที่ใช้คำนวณได้ ไม่ประมาณจากสถานะ
- แยก Missing / Stale / Reported; ไม่แสดงจำนวนว่างจากรายงานหมดอายุหรือค่าที่ผิดเงื่อนไข
- Save / Find My Car เก็บชื่อ/Code/Note/เวลาใน Local storage แยกตามวัด; ตรวจ Schema และข้อมูลเสียก่อน Restore
- GPS ขอเมื่อผู้ใช้กดปุ่มเท่านั้น ไม่ส่งให้ระบบวัด; Maps link ปรากฏเมื่อมีพิกัดที่บันทึก พร้อมแจ้งว่าจะส่งพิกัดให้ Google เมื่อเปิดลิงก์
- ไม่เรียกว่า Real-time, ไม่สร้าง Sensor/QR/Plate/Ticket integration และไม่มี Indoor route ที่อ้างตำแหน่งจริง

**VERIFIED ผ่าน Component fixtures ที่ติดป้าย QA ชัดเจน:** เลือกลาน, Stale ไม่แสดง Meter/จำนวนว่าง, Save Note, Reload Restore, Delete, คืนโฟกัสหลัง Delete และถอนลานที่เลือกแล้วล้าง Draft / เลือกลานใหม่ หน้าทดสอบชั่วคราวถูกลบก่อน Build/Commit; ไม่เพิ่มข้อมูลจำลองใน Product หรือ Backend

**BLOCKED:** การอ่าน/Refresh กับฐานจริง, GPS permission/accuracy และ Google Maps navigation บนอุปกรณ์จริงยังไม่ได้ทดสอบ

## Performance Evidence

Build เปรียบเทียบกับ Base commit ใน Worktree แยก ใช้ Lockfile ที่ผ่านนโยบายชุดเดียวกันเพื่อให้ Dependency environment เทียบกันได้ ตัวเลขเป็น Next build estimates ไม่ใช่ Network/Lighthouse measurement

| First-load JS | Base | Changed |
| --- | ---: | ---: |
| Home | 108 kB | 108 kB |
| Shared | 103 kB | 103 kB |
| Showcase 3D | 112 kB | 115 kB |
| Public temple | 110 kB | 111 kB |
| Public map | 112 kB | 112 kB |
| Parking route | ไม่มี | 114 kB |

Font WOFF2 ที่ Emit รวม 42,672 → 85,868 bytes เนื่องจากเพิ่ม 500/600 จริงทั้ง TH/EN เป็น Cost ที่ยอมรับเพื่อ Typography consistency ตัวเลขนี้ไม่ใช่จำนวน Download ทุกครั้ง; Browser เลือก Subset/Weight ที่ใช้ ใช้ font-display swap ตาม Fontsource เดิม

ลด Shadow ทั่ว UI, จำกัด WebGL DPR, สร้าง Shadow เมื่อจำเป็น, ลด RAF ขณะ Idle และคงการโหลด Three.js แยก ไม่อ้างว่า Web Vitals/FPS/Memory ถูก Optimize หรือไม่มี Regression บนอุปกรณ์จริง เพราะยังวัดไม่ได้

## Accessibility Evidence

- Skip link, Current-page navigation, Semantic sections/headings, Native select และ Button labels
- Focus หลังเปิด Map sheet / Escape กลับ Trigger และหลังลบบันทึก Parking ผ่าน UI จริง
- Shared Field DOM ตรวจพบ `id`, `aria-required`, `aria-invalid`, `aria-describedby` ที่ตรงกับ Hint/Error จริง
- สถานะ Parking มี Icon + Text และ Occupancy มี Accessible label ไม่พึ่งสีอย่างเดียว
- Focus contrast Light primary/background **8.76:1**; Danger text **6.57:1 Light / 8.30:1 Dark**; Dark success text **9.69:1** (คำนวณจาก Token sRGB)
- ปุ่ม Scene 44px, ปุ่ม Parking หลัก 48px ขึ้นไป, Safe-area padding, Reduced-motion CSS + 3D media listener

ยังไม่ได้ทำ Screen-reader audit, Full WCAG audit, Dark visual QA หรือ Text scaling ทุกหน้า ไม่กล่าวอ้างว่าผ่าน Accessibility ทั้งระบบ

## Verification

| Check | สถานะ | ขอบเขต |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | VERIFIED | Lockfile / supply-chain policy เดิม |
| `pnpm --filter @boon/web build` | VERIFIED | Next production compilation + Types / Route generation; ไม่มี QA-only route |
| `pnpm --filter @boon/web typecheck` | VERIFIED | TypeScript |
| `pnpm --filter @boon/web test` | VERIFIED | 12 files / 154 tests รวม Parking edge cases |
| `git diff --check` | VERIFIED | Whitespace / conflict-marker review |
| Browser render + Visual inspection | VERIFIED | 1363×936: Home error state, Login presentation, 3D fallback; Component fixtures สำหรับ Map/Parking |
| Map selection / Escape focus | VERIFIED | Component fixtures ผ่าน DOM + Keyboard interaction |
| Parking Save/Restore/Delete/withdrawal | VERIFIED | Component fixtures; ไม่ใช่ DB end-to-end |
| 1920 / Tablet / Mobile / Touch / Dark screenshots | BLOCKED | Browser API ไม่มี Viewport emulation/control ที่ใช้งานได้ใน Session นี้ |
| WebGL interaction / GPU / FPS / Memory | BLOCKED | Cloud GPU ปิด |
| Full auth / DB / Contact / Chat / Call E2E | BLOCKED | ไม่ได้มีฐานและบัญชีทดสอบพร้อมใช้งาน |
| Existing map E2E script | IMPLEMENTED | ปรับ Locator Native select / Opt-in rotation; ยังไม่ได้รันชุด E2E |

ภาพตรวจจริง: [Home](docs/ux-upgrade/boon-home-qa.jpg), [Login](docs/ux-upgrade/boon-login-qa.jpg) — ภาพจาก Dev preview จึงมี Next Dev indicator; หน้า Home แสดง Error ของ DB ตามจริง

## Tools / Library

ใช้ของเดิม: Next.js, React, Three.js, OrbitControls, GLTFLoader, Lucide, Fontsource Sarabun, Vitest และ pnpm ใช้ RoomEnvironment จาก Three package เดิม ไม่มี Dependency ใหม่ ใช้ Browser UI inspection และ GitHub connector เพื่อเตรียม Draft PR

ไม่เพิ่ม R3F/Drei, Motion/GSAP หรือ Mapbox/MapLibre เพราะ Native Three/CSS ครอบคลุม Interaction ที่มี และยังไม่มีข้อมูลเส้นทางจริงให้ Engine แผนที่ใช้

Lockfile Resolve ใหม่แก้ Transitive `rolldown 1.2.13 → 1.2.12`, `@oxc-project/types 0.153.0 → 0.152.0`, `caniuse-lite ...1815 → ...1814` พร้อม Platform libc metadata ไม่แก้ Direct dependency versions และไม่ลด Supply-chain protection

## Blockers / งานถัดไปที่มี Impact สูง

1. **BLOCKED:** จัดฐานทดสอบที่ใช้ Migration จริงและบัญชีตาม Role เพื่อทดสอบ Search → Temple → Map/Parking พร้อม Backend permission/freshness/error states และ E2E เดิม
2. **BLOCKED:** เปิด Browser/GPU ที่รองรับ WebGL แล้วตรวจ Lighting, Camera clipping, Raycast/drag/pinch, Context recovery, Idle RAF, FPS/Memory และ 1920/Laptop/Tablet/Mobile/Dark/Text scaling ก่อนรับรองคุณภาพ
3. **BLOCKED ด้านข้อมูล:** ต้องมีผังสำรวจจริง, Parking polygons/slots, Entrance/Elevator coordinates, Walkable graph, Floor metadata และสถานะจากแหล่งที่ยืนยันแล้ว จึงสร้าง Digital Twin / Exploded-floor / Recommended parking / Indoor routing ได้อย่างซื่อตรง
4. **PROPOSED:** แก้ UX เดิมของ Follow temple → Login ที่ไม่คืนผู้ใช้กลับวัด โดยส่ง `returnTo` แบบ Local path ที่ตรวจความปลอดภัยผ่าน Login/Code/Welcome; ต้องทดสอบ OTP จริงด้วย ไม่ทำ Auto-follow
5. **PROPOSED:** Profiling บนอุปกรณ์ GPU ระดับกลาง แล้วจึงตัดสินใจเรื่อง LOD/Texture compression/Model redesign จากหลักฐาน; GLB ปัจจุบันเล็ก ไม่ควรเพิ่ม Pipeline ก่อนมี Asset จริง

## Files changed

- `apps/web/app/t/[slug]/parking/page.tsx`
- `apps/web/components/app-nav.tsx`
- `apps/web/components/map/map-view.module.css`
- `apps/web/components/map/showcase-3d.module.css`
- `apps/web/components/parking/parking-experience.tsx`
- `apps/web/components/parking/parking-overview.tsx`
- `apps/web/components/parking/parking.module.css`
- `docs/ux-upgrade/boon-home-qa.jpg`
- `docs/ux-upgrade/boon-login-qa.jpg`
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/login/code/page.tsx`
- `apps/web/app/login/page.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/showcase/3d/page.tsx`
- `apps/web/app/t/[slug]/map/page.tsx`
- `apps/web/app/t/[slug]/page.tsx`
- `apps/web/app/temple/[id]/map/page.tsx`
- `apps/web/components/call/call.module.css`
- `apps/web/components/chat/chat.module.css`
- `apps/web/components/map/map-view.tsx`
- `apps/web/components/map/showcase-3d.tsx`
- `apps/web/components/ui.tsx`
- `apps/web/e2e/map.e2e.mjs`
- `apps/web/lib/parking.test.ts`
- `apps/web/lib/parking.ts`
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `UX_UI_UPGRADE_REPORT.md`

ตรวจ Diff รอบสุดท้ายโดยแยก Ownership ของ Audit / 3D / Parking; แก้ Regression ของ GPS state, Focus และภาพทีเซอร์ก่อนรวม ขอบเขตนี้ไม่มีการแก้ DB migration, Permission model, API schema หรือข้อมูล Asset จริง
