# PARKING — "เลือกวัดแล้วดูได้ว่ามีที่จอดไหม"

Owner: Opus (owner request 2026-10-07). Implemented in `supabase/migrations/0004_parking.sql`; tests `supabase/tests/05_parking.sql`.

## User flow (visitor, no login needed)
เปิดแอป → เลือกวัด (`listed_temples()`) → การ์ด "ที่จอดรถ" (`temple_parking(slug)`):

| Data | Card shows |
|---|---|
| `parking_declared = none` | "วัดนี้ไม่มีที่จอดรถของวัด" |
| `parking_declared = unknown`, no public lot | "วัดยังไม่ได้ให้ข้อมูลที่จอดรถ" |
| lot `AVAILABLE` | 🟢 "มีที่ว่าง" (+ "ว่างประมาณ N คัน" only if staff counted) |
| lot `FILLING` | 🟡 "ใกล้เต็ม" |
| lot `FULL` | 🔴 "เต็ม" |
| lot `CLOSED` | ⚫ "ปิด" |
| no report, or report older than `stale_after_minutes` (default 60, HYPOTHESIS) | ⚪ "ไม่ทราบสถานะตอนนี้" + "อัปเดตล่าสุด HH:MM" when a stale report exists |

Always shown per lot: name, vehicle types (รถยนต์/มอเตอร์ไซค์/รถตู้/รถบัส), capacity if known, accessible spaces, fee note, hours.

## Rules
- Only temples with `is_listed = true` appear to visitors; only lots with `is_public` and `active`.
- Status is never estimated. `UNKNOWN` is never stored; it is derived from missing/stale reports.
- Reports are append-only, made by `parking.report` holders (traffic staff, security, facility manager, abbot/deputy)
  in their own name; free spaces cannot exceed capacity; FULL means 0 free.
- Lots are managed by `parking.manage` (abbot, facility manager, temple admin).
- Visitors never see who reported. Members see all lots of their temple (incl. staff-only).

## Not yet built
App screen (no app scaffold yet — Wave 3); staff "report status" button (one tap: มีที่ / ใกล้เต็ม / เต็ม / ปิด);
event-day overrides; map pin on the 2D/3D map (lot `code` can match a zone code).
