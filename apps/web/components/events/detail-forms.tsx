"use client";
import { Check, ClipboardPlus, HandHeart, LogOut, Play, RotateCcw, Send, UserPlus, UsersRound, X } from "lucide-react";
import { SubmitButton } from "@/components/ui";
import { CATEGORIES, WEIGHTS } from "@/lib/events";
import { EField, OpForm, aria } from "./common";
import { sub } from "./chip";
import type { MemberOption } from "./event-form";

type Ids = { templeId: string; eventId: string };
const hid = (i: Ids, op: string, extra: Record<string, string> = {}) => ({ temple_id: i.templeId, event_id: i.eventId, op, ...extra });

/** Add a staffing target (พระ / อาสาสมัคร / เจ้าหน้าที่). Empty "ขั้นต่ำ" lets the database pick its default. */
export function TargetForm(i: Ids) {
  return (
    <OpForm hidden={hid(i, "target")}>
      {(s) => {
        const v = (k: string, d = "") => s.values?.[k] ?? d, e = (k: string) => s.fieldErrors?.[k];
        return (
          <>
            <EField id="t-category" label="ประเภทกำลังคน" required error={e("category")}>
              <select key={`c:${v("category", "volunteer")}`} id="t-category" name="category" className="input" defaultValue={v("category", "volunteer")} {...aria("t-category", e("category"))}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </EField>
            <EField id="t-label" label="ชื่อเป้าหมาย" required hint="ตัวอย่าง: อาสาจัดสถานที่ หรือ พระสวดมนต์" error={e("label")}>
              <input id="t-label" name="label" className="input" defaultValue={v("label")} {...aria("t-label", e("label"))} />
            </EField>
            <EField id="t-required" label="จำนวนที่ต้องการ (คน)" required error={e("required")}>
              <input id="t-required" name="required" inputMode="numeric" className="input" defaultValue={v("required")} {...aria("t-required", e("required"))} />
            </EField>
            <EField id="t-min" label="ขั้นต่ำที่ต้องมี (คน)" hint="ถ้าเว้นว่าง ระบบใช้ค่าเริ่มต้น: พระต้องครบทุกรูป ส่วนอื่นร้อยละ 80" error={e("min")}>
              <input id="t-min" name="min" inputMode="numeric" className="input" defaultValue={v("min")} {...aria("t-min", e("min"))} />
            </EField>
            <label className="check">
              <input key={`h:${s.values?.hard ?? "init"}`} type="checkbox" name="hard" defaultChecked={s.values ? s.values.hard === "on" : true} />
              <span><b>เป็นเงื่อนไขบังคับ</b><br /><span style={sub}>ถ้ากำลังคนไม่ถึงขั้นต่ำ งานจะขึ้นว่า “ยังไม่พร้อม”</span></span>
            </label>
            <SubmitButton variant="secondary" pendingText="กำลังเพิ่ม…"><UsersRound aria-hidden />เพิ่มเป้าหมายกำลังคน</SubmitButton>
          </>
        );
      }}
    </OpForm>
  );
}

/** Manager adds a monk (to a monk target) or a staff member directly; the database refuses a wrong category. */
export function AddParticipantForm({ templeId, eventId, targetId, category, members, taken }: Ids & { targetId: string; category: string; members: MemberOption[]; taken: string[] }) {
  const options = members.filter((m) => !taken.includes(m.person_id) && (category === "monk" ? m.monastic_kind !== "none" : m.monastic_kind === "none"));
  const id = `p-${targetId}`;
  return (
    <OpForm hidden={hid({ templeId, eventId }, "participant", { target_id: targetId })}>
      {(s) => (
        <>
          <EField id={id} label={category === "monk" ? "เพิ่มพระเข้าร่วม" : "เพิ่มเจ้าหน้าที่เข้าร่วม"} error={s.fieldErrors?.person_id}
            hint={options.length ? undefined : "ไม่มีรายชื่อให้เลือก (ทุกคนที่คุณเห็นอยู่ในเป้าหมายนี้แล้ว หรือคุณยังไม่มีสิทธิ์ดูรายชื่อสมาชิก)"}>
            <select key={`p:${s.values?.person_id ?? ""}`} id={id} name="person_id" className="input" defaultValue={s.values?.person_id ?? ""} {...aria(id, s.fieldErrors?.person_id)}>
              <option value="">เลือกชื่อ</option>
              {options.map((m) => <option key={m.person_id} value={m.person_id}>{m.display_name || "ไม่มีชื่อ"}</option>)}
            </select>
          </EField>
          <SubmitButton variant="secondary" pendingText="กำลังเพิ่ม…"><UserPlus aria-hidden />เพิ่มเข้าเป้าหมายนี้</SubmitButton>
        </>
      )}
    </OpForm>
  );
}

/** Approve / not approve a pending volunteer. The database refuses approving yourself, so the buttons are not offered for your own row. */
export function DecideForm({ templeId, eventId, participantId }: Ids & { participantId: string }) {
  return (
    <OpForm hidden={hid({ templeId, eventId }, "decide", { participant_id: participantId })}>
      {() => (
        <div className="btn-row" style={{ marginTop: 0 }}>
          <SubmitButton name="act" value="accept" variant="secondary" pendingText="กำลังบันทึก…"><Check aria-hidden />อนุมัติ</SubmitButton>
          <SubmitButton name="act" value="decline" variant="secondary" pendingText="กำลังบันทึก…"><X aria-hidden />ไม่อนุมัติ</SubmitButton>
        </div>
      )}
    </OpForm>
  );
}

export function SignupForm({ templeId, eventId, targetId, primary }: Ids & { targetId: string; primary?: boolean }) {
  return (
    <OpForm hidden={hid({ templeId, eventId }, "signup", { target_id: targetId })}>
      {() => <SubmitButton variant={primary ? "primary" : "secondary"} pendingText="กำลังสมัคร…" block><HandHeart aria-hidden />สมัครเป็นอาสา</SubmitButton>}
    </OpForm>
  );
}

export function WithdrawForm({ templeId, eventId, participantId }: Ids & { participantId: string }) {
  return (
    <OpForm hidden={hid({ templeId, eventId }, "withdraw", { participant_id: participantId })}>
      {() => <SubmitButton variant="secondary" pendingText="กำลังบันทึก…"><LogOut aria-hidden />ถอนตัว</SubmitButton>}
    </OpForm>
  );
}

/** Add an event task (quest). "ต้องเสร็จก่อนงาน" makes it a gate (G-CHECK). */
export function TaskForm({ templeId, eventId, members }: Ids & { members: MemberOption[] }) {
  return (
    <OpForm hidden={hid({ templeId, eventId }, "task")}>
      {(s) => {
        const v = (k: string, d = "") => s.values?.[k] ?? d, e = (k: string) => s.fieldErrors?.[k];
        return (
          <>
            <EField id="k-title" label="ชื่องานย่อย" required hint="ตัวอย่าง: เตรียมเครื่องเสียง" error={e("title")}>
              <input id="k-title" name="title" className="input" defaultValue={v("title")} {...aria("k-title", e("title"))} />
            </EField>
            <EField id="k-weight" label="ความสำคัญ" required error={e("weight")}>
              <select key={`w:${v("weight", "2")}`} id="k-weight" name="weight" className="input" defaultValue={v("weight", "2")} {...aria("k-weight", e("weight"))}>
                {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </EField>
            <label className="check">
              <input key={`g:${s.values?.gate ?? "init"}`} type="checkbox" name="gate" defaultChecked={s.values?.gate === "on"} />
              <span><b>ต้องเสร็จก่อนงาน</b><br /><span style={sub}>ถ้างานนี้ยังไม่เสร็จ งานจะขึ้นว่า “พร้อม” ไม่ได้</span></span>
            </label>
            <EField id="k-due" label="กำหนดเสร็จ" hint="เวลาประเทศไทย" error={e("due")}>
              <input id="k-due" name="due" type="datetime-local" className="input" defaultValue={v("due")} {...aria("k-due", e("due"))} />
            </EField>
            <EField id="k-assignee" label="ผู้รับผิดชอบงานย่อย" error={e("assignee")}
              hint={members.length ? "ถ้ายังไม่เลือก งานจะยังไม่มีคนรับผิดชอบ" : "ยังไม่มีรายชื่อสมาชิกที่คุณมีสิทธิ์เห็น"}>
              <select key={`a:${v("assignee")}`} id="k-assignee" name="assignee" className="input" defaultValue={v("assignee")} {...aria("k-assignee", e("assignee"))}>
                <option value="">ยังไม่เลือก</option>
                {members.map((m) => <option key={m.person_id} value={m.person_id}>{m.display_name || "ไม่มีชื่อ"}</option>)}
              </select>
            </EField>
            <SubmitButton variant="secondary" pendingText="กำลังเพิ่ม…"><ClipboardPlus aria-hidden />เพิ่มงานย่อย</SubmitButton>
          </>
        );
      }}
    </OpForm>
  );
}

/** Task steps. Assignee: เริ่ม / ส่งงาน. Verifier (someone else): ตรวจรับ / ส่งกลับแก้. */
export function TaskProgress({ templeId, eventId, assignmentId, status, isMine, canVerify }:
  Ids & { assignmentId: string; status: string; isMine: boolean; canVerify: boolean }) {
  const mineStart = isMine && status === "ASSIGNED", mineSubmit = isMine && status === "IN_PROGRESS";
  const verify = canVerify && !isMine && status === "SUBMITTED";
  return (
    <OpForm hidden={hid({ templeId, eventId }, "progress", { assignment_id: assignmentId })}>
      {() => (
        <>
          <div className="btn-row" style={{ marginTop: 0 }}>
            {mineStart && <SubmitButton name="act" value="start" variant="secondary" pendingText="กำลังบันทึก…"><Play aria-hidden />เริ่มทำ</SubmitButton>}
            {mineSubmit && <SubmitButton name="act" value="submit" variant="secondary" pendingText="กำลังส่ง…"><Send aria-hidden />ส่งงาน</SubmitButton>}
            {verify && <SubmitButton name="act" value="verify" variant="secondary" pendingText="กำลังบันทึก…"><Check aria-hidden />ตรวจรับ</SubmitButton>}
            {verify && <SubmitButton name="act" value="reject" variant="secondary" pendingText="กำลังบันทึก…"><RotateCcw aria-hidden />ส่งกลับแก้</SubmitButton>}
          </div>
          {isMine && status === "SUBMITTED" && <p style={sub}>คุณส่งงานแล้ว ต้องให้ผู้จัดการงานคนอื่นเป็นผู้ตรวจรับ</p>}
        </>
      )}
    </OpForm>
  );
}
