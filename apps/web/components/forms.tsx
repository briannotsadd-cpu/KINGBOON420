"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, Save, Send, Check, X, Eye, EyeOff, FilePlus2 } from "lucide-react";
import { Field, Notice, SubmitButton } from "./ui";
import { RELATIONSHIP_TH, SOURCE_TYPES } from "@/lib/verification";
import {
  requestCodeAction, verifyCodeAction, saveNameAction, registerTempleAction, reviewTempleAction, setListedAction,
  recordFieldAction, fieldOpAction, type FormState,
} from "@/app/actions";

const err = (s: FormState, k: string) => s.fieldErrors?.[k];
/** After a successful save on the same page, re-render the server parts (statuses, readiness) while keeping this
 *  form mounted so its success message stays visible. */
function useRefreshOnOk(s: FormState) {
  const router = useRouter();
  const last = useRef<FormState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; router.refresh(); } }, [s, router]);
}
const aria = (s: FormState, k: string) => ({ "aria-invalid": err(s, k) ? true : undefined, "aria-describedby": err(s, k) ? `${k}-err` : `${k}-hint` });

export function EmailForm() {
  const [s, act] = useActionState(requestCodeAction, {});
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <Field id="email" label="อีเมลของคุณ" required hint="ตัวอย่าง: somchai@gmail.com" error={err(s, "email")}>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" className="input" defaultValue={s.values?.email} {...aria(s, "email")} />
      </Field>
      <SubmitButton pendingText="กำลังส่งรหัส…" block><Mail aria-hidden />ส่งรหัสเข้าอีเมล</SubmitButton>
    </form>
  );
}

export function CodeForm({ email }: { email: string }) {
  const [s, act] = useActionState(verifyCodeAction, {});
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="email" value={email} />
      <Field id="code" label="รหัส 6 หลักจากอีเมล" required hint="ตัวอย่าง: 482913" error={err(s, "code")}>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input code-input" defaultValue={s.values?.code} {...aria(s, "code")} />
      </Field>
      <SubmitButton pendingText="กำลังตรวจรหัส…" block><KeyRound aria-hidden />เข้าสู่ระบบ</SubmitButton>
    </form>
  );
}

export function NameForm() {
  const [s, act] = useActionState(saveNameAction, {});
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <Field id="name" label="ชื่อที่ให้คนอื่นเห็น" required hint="ตัวอย่าง: สมชาย ใจดี หรือ พระมหาสมชาย" error={err(s, "name")}>
        <input id="name" name="name" autoComplete="name" className="input" defaultValue={s.values?.name} {...aria(s, "name")} />
      </Field>
      <SubmitButton pendingText="กำลังบันทึก…" block><Save aria-hidden />บันทึกชื่อ</SubmitButton>
    </form>
  );
}

export function RegisterTempleForm() {
  const [s, act] = useActionState(registerTempleAction, {});
  const v = (k: string) => s.values?.[k] ?? "";
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <Field id="name_th" label="ชื่อวัด (ตามทะเบียนวัด)" required hint="ตัวอย่าง: วัดพระศรีมหาธาตุ" error={err(s, "name_th")}>
        <input id="name_th" name="name_th" className="input" defaultValue={v("name_th")} {...aria(s, "name_th")} />
      </Field>
      <Field id="province" label="จังหวัด" required hint="ตัวอย่าง: นนทบุรี" error={err(s, "province")}>
        <input id="province" name="province" className="input" defaultValue={v("province")} {...aria(s, "province")} />
      </Field>
      <Field id="registry_number" label="เลขทะเบียนวัด" hint="ถ้าทราบ จะช่วยให้ตรวจสอบได้เร็วขึ้น" error={err(s, "registry_number")}>
        <input id="registry_number" name="registry_number" className="input" defaultValue={v("registry_number")} {...aria(s, "registry_number")} />
      </Field>
      <Field id="address_th" label="ที่อยู่" hint="ตัวอย่าง: 99 ถนนงามวงศ์วาน ตำบลบางเขน อำเภอเมือง" error={err(s, "address_th")}>
        <textarea id="address_th" name="address_th" className="input" defaultValue={v("address_th")} {...aria(s, "address_th")} />
      </Field>
      <Field id="phone" label="เบอร์สำนักงานวัด" hint="ตัวอย่าง: 02 123 4567" error={err(s, "phone")}>
        <input id="phone" name="phone" type="tel" inputMode="tel" className="input" defaultValue={v("phone")} {...aria(s, "phone")} />
      </Field>
      <Field id="relationship" label="คุณเกี่ยวข้องกับวัดอย่างไร" required error={err(s, "relationship")}>
        <select id="relationship" name="relationship" className="input" defaultValue={v("relationship")} {...aria(s, "relationship")}>
          <option value="">— เลือก —</option>
          {Object.entries(RELATIONSHIP_TH).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      <Field id="evidence" label="หลักฐานว่าคุณมีสิทธิ์ดูแลข้อมูลวัดนี้" required
        hint="ตัวอย่าง: หนังสือมอบหมายจากเจ้าอาวาส ลงวันที่ 1 ต.ค. 2569 / ผู้ดูแลระบบจะติดต่อวัดเพื่อตรวจสอบ" error={err(s, "evidence")}>
        <textarea id="evidence" name="evidence" className="input" defaultValue={v("evidence")} {...aria(s, "evidence")} />
      </Field>
      <Notice kind="info">ข้อมูลที่กรอกจะยังไม่แสดงต่อคนทั่วไป จนกว่าผู้ดูแลระบบตรวจกับทะเบียนวัด และวัดยืนยันข้อมูลแล้ว</Notice>
      <SubmitButton pendingText="กำลังส่งใบสมัคร…" block><Send aria-hidden />ส่งใบสมัครดูแลวัด</SubmitButton>
    </form>
  );
}

export function ListedToggle({ templeId, listed }: { templeId: string; listed: boolean }) {
  const [s, act] = useActionState(setListedAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack">
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="listed" value={listed ? "0" : "1"} />
      <SubmitButton pendingText="กำลังบันทึก…" variant="secondary">
        {listed ? <><EyeOff aria-hidden />ปิดไม่ให้คนทั่วไปค้นหา</> : <><Eye aria-hidden />เปิดให้คนทั่วไปค้นหา</>}
      </SubmitButton>
    </form>
  );
}

export function RecordFieldForm({ templeId, fieldKey, label, back, officialOnly }:
  { templeId: string; fieldKey: string; label: string; back: string; officialOnly?: boolean }) {
  const [s, act] = useActionState(recordFieldAction, {});
  useRefreshOnOk(s);
  const v = (k: string) => s.values?.[k] ?? "";
  const types = officialOnly ? SOURCE_TYPES.filter((t) => t.tier === 1) : SOURCE_TYPES;
  const p = (k: string) => `${fieldKey}-${k}`;
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="field_key" value={fieldKey} />
      <input type="hidden" name="back" value={back} />
      <Field id={p("value")} label={label} required hint={fieldKey === "temple.geo" ? "ตัวอย่าง: 13.7563, 100.5018" : "กรอกตามที่ปรากฏในแหล่งข้อมูล"} error={err(s, "value")}>
        <textarea id={p("value")} name="value" className="input" defaultValue={v("value")} />
      </Field>
      <Field id={p("source_type")} label="ข้อมูลนี้มาจากไหน" required error={err(s, "source_type")}>
        <select id={p("source_type")} name="source_type" className="input" defaultValue={v("source_type") || (officialOnly ? "onab_registry" : "temple_admin_entry")}>
          {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field id={p("source_url")} label="ลิงก์แหล่งข้อมูล" hint="ตัวอย่าง: https://www.example.or.th/about" error={err(s, "source_url")}>
        <input id={p("source_url")} name="source_url" type="url" className="input" defaultValue={v("source_url")} />
      </Field>
      <Field id={p("source_document")} label="หรือ ชื่อเอกสารอ้างอิง" hint="ตัวอย่าง: หนังสือรับรองวัด ฉบับวันที่ 1 ต.ค. 2569" error={err(s, "source_document")}>
        <input id={p("source_document")} name="source_document" className="input" defaultValue={v("source_document")} />
      </Field>
      <Field id={p("source_date")} label="วันที่ของแหล่งข้อมูล" error={err(s, "source_date")}>
        <input id={p("source_date")} name="source_date" type="date" className="input" defaultValue={v("source_date")} />
      </Field>
      <Field id={p("evidence")} label="หลักฐาน / ข้อความที่อ้างถึง" hint="คัดลอกข้อความจากแหล่งข้อมูล เพื่อให้ตรวจย้อนกลับได้" error={err(s, "evidence")}>
        <textarea id={p("evidence")} name="evidence" className="input" defaultValue={v("evidence")} />
      </Field>
      <SubmitButton pendingText="กำลังบันทึก…"><FilePlus2 aria-hidden />บันทึกข้อมูลพร้อมแหล่งที่มา</SubmitButton>
    </form>
  );
}

export type CandidateOp = { op: string; label: string; variant?: "primary" | "secondary" | "danger" };

/** One form per candidate value. It stays mounted when the value's status changes, so the result message stays visible. */
export function CandidateActions({ valueId, back, ops, needsReason, canReject }:
  { valueId: string; back: string; ops: CandidateOp[]; needsReason?: string; canReject: boolean }) {
  const [s, act] = useActionState(fieldOpAction, {});
  useRefreshOnOk(s);
  const rid = `${valueId}-reason`;
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="value_id" value={valueId} />
      <input type="hidden" name="back" value={back} />
      {needsReason && (
        <Field id={rid} label={needsReason} required error={err(s, "reason")}>
          <input id={rid} name="reason" className="input" defaultValue={s.values?.reason} />
        </Field>
      )}
      {ops.length > 0 && <div className="btn-row">{ops.map((o) =>
        <SubmitButton key={o.op} name="op" value={o.op} pendingText="กำลังบันทึก…" variant={o.variant ?? "primary"}>{o.label}</SubmitButton>)}</div>}
      {canReject && (
        <details className="more">
          <summary>ข้อมูลนี้ไม่ถูกต้อง?</summary>
          <div className="stack">
            {!needsReason && (
              <Field id={`${rid}-rj`} label="เหตุผลที่ไม่ใช้ข้อมูลนี้" required error={err(s, "reason")}>
                <input id={`${rid}-rj`} name="reason" className="input" defaultValue={s.values?.reason} />
              </Field>
            )}
            <SubmitButton name="op" value="reject" pendingText="กำลังบันทึก…" variant="danger">ยืนยัน ไม่ใช้ข้อมูลนี้</SubmitButton>
          </div>
        </details>
      )}
    </form>
  );
}

export function ReviewForm({ templeId, decision }: { templeId: string; decision: "approved" | "rejected" }) {
  const [s, act] = useActionState(reviewTempleAction, {});
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="decision" value={decision} />
      {decision === "rejected" && (
        <Field id="note" label="เหตุผลที่ไม่อนุมัติ" required hint="ผู้สมัครจะเห็นข้อความนี้ ตัวอย่าง: ไม่สามารถยืนยันว่าเป็นผู้ดูแลวัดได้" error={err(s, "note")}>
          <textarea id="note" name="note" className="input" defaultValue={s.values?.note} {...aria(s, "note")} />
        </Field>
      )}
      <SubmitButton pendingText="กำลังบันทึก…" variant={decision === "approved" ? "primary" : "danger"} block>
        {decision === "approved" ? <><Check aria-hidden />ยืนยัน อนุมัติวัดนี้</> : <><X aria-hidden />ยืนยัน ไม่อนุมัติวัดนี้</>}
      </SubmitButton>
    </form>
  );
}
