"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { Notice, SubmitButton } from "@/components/ui";
import { saveEventAction } from "@/app/temple/[id]/events/actions";
import { KINDS, VISIBILITIES } from "@/lib/events";
import { EField, aria } from "./common";

export interface EventInitial { title: string; kind: string; description: string; starts: string; ends: string; venue: string; visibility: string; lead: string; expected: string }
export interface MemberOption { person_id: string; display_name: string; monastic_kind: string }

/** Create (no eventId) or edit. Times are typed and shown as Asia/Bangkok wall-clock time. */
export function EventForm({ templeId, eventId, initial, members, currentLeadName, approved }:
  { templeId: string; eventId?: string; initial: EventInitial; members: MemberOption[]; currentLeadName?: string | null; approved?: boolean }) {
  const [s, act] = useActionState(saveEventAction, {});
  const v = (k: keyof EventInitial) => s.values?.[k] ?? initial[k];
  const e = (k: string) => s.fieldErrors?.[k];
  const lead = v("lead");
  const leadListed = !lead || members.some((m) => m.person_id === lead);
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      {eventId && <input type="hidden" name="event_id" value={eventId} />}
      {approved && <Notice kind="warn">งานนี้อนุมัติแล้ว ถ้าเปลี่ยนวันหรือเวลา ผู้ร่วมงานที่ยืนยันไว้แล้วต้องยืนยันใหม่</Notice>}
      <EField id="kind" label="ประเภทงาน" required error={e("kind")}>
        <select key={`kind:${v("kind")}`} id="kind" name="kind" className="input" defaultValue={v("kind")} {...aria("kind", e("kind"))}>
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </EField>
      <EField id="title" label="ชื่องาน" required hint="ตัวอย่าง: ทอดกฐินสามัคคี" error={e("title")}>
        <input id="title" name="title" className="input" defaultValue={v("title")} maxLength={200} {...aria("title", e("title"))} />
      </EField>
      <EField id="description" label="รายละเอียด" hint="เล่าสั้น ๆ ว่างานนี้คืออะไร ไม่เกิน 2,000 ตัวอักษร" error={e("description")}>
        <textarea id="description" name="description" className="input" rows={4} defaultValue={v("description")} {...aria("description", e("description"))} />
      </EField>
      <EField id="starts" label="เริ่มงาน" required hint="เวลาประเทศไทย" error={e("starts")}>
        <input id="starts" name="starts" type="datetime-local" className="input" defaultValue={v("starts")} {...aria("starts", e("starts"))} />
      </EField>
      <EField id="ends" label="สิ้นสุดงาน" required hint="เวลาประเทศไทย ต้องอยู่หลังเวลาเริ่มงาน" error={e("ends")}>
        <input id="ends" name="ends" type="datetime-local" className="input" defaultValue={v("ends")} {...aria("ends", e("ends"))} />
      </EField>
      <EField id="venue" label="สถานที่จัดงาน" hint="ตัวอย่าง: ศาลาการเปรียญ ต้องใส่ก่อนอนุมัติงาน" error={e("venue")}>
        <input id="venue" name="venue" className="input" defaultValue={v("venue")} {...aria("venue", e("venue"))} />
      </EField>
      <EField id="visibility" label="ใครเห็นงานนี้ได้" required error={e("visibility")}
        hint={VISIBILITIES.map((x) => `${x.label}: ${x.hint}`).join(" · ")}>
        <select key={`vis:${v("visibility")}`} id="visibility" name="visibility" className="input" defaultValue={v("visibility")} {...aria("visibility", e("visibility"))}>
          {VISIBILITIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
      </EField>
      <EField id="lead" label="ผู้รับผิดชอบงาน" error={e("lead")}
        hint={members.length ? "ต้องเลือกก่อนกดวางแผนงาน" : "ยังไม่มีรายชื่อสมาชิกที่คุณมีสิทธิ์เห็น จึงเลือกผู้รับผิดชอบไม่ได้ในตอนนี้ ให้ผู้ดูแลวัดเพิ่มสมาชิกหรือให้สิทธิ์ดูรายชื่อสมาชิกก่อน แล้วกลับมาเลือก"}>
        <select key={`lead:${lead}`} id="lead" name="lead" className="input" defaultValue={lead} {...aria("lead", e("lead"))}>
          <option value="">ยังไม่เลือก</option>
          {!leadListed && <option value={lead}>{currentLeadName || "ผู้รับผิดชอบปัจจุบัน"}</option>}
          {members.map((m) => <option key={m.person_id} value={m.person_id}>{m.display_name || "ไม่มีชื่อ"}{m.monastic_kind !== "none" ? " (พระ)" : ""}</option>)}
        </select>
      </EField>
      <EField id="expected" label="จำนวนผู้ร่วมงานที่คาดไว้" hint="ใส่เป็นตัวเลข ตัวอย่าง: 300" error={e("expected")}>
        <input id="expected" name="expected" inputMode="numeric" className="input" defaultValue={v("expected")} {...aria("expected", e("expected"))} />
      </EField>
      <SubmitButton pendingText="กำลังบันทึก…" block><Save aria-hidden />{eventId ? "บันทึกการแก้ไข" : "สร้างงาน"}</SubmitButton>
    </form>
  );
}
