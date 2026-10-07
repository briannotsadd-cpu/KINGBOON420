"use client";
import { useActionState } from "react";
import { Mail, KeyRound, Save, Send, Check, X } from "lucide-react";
import { Field, Notice, SubmitButton } from "./ui";
import {
  requestCodeAction, verifyCodeAction, saveNameAction, registerTempleAction, updateTempleAction, reviewTempleAction, type FormState,
} from "@/app/actions";

const err = (s: FormState, k: string) => s.fieldErrors?.[k];
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

type Temple = { id?: string; name_th?: string; province?: string | null; address_th?: string | null; phone?: string | null; description_th?: string | null; is_listed?: boolean };

export function TempleForm({ temple, mode }: { temple?: Temple; mode: "create" | "edit" }) {
  const [s, act] = useActionState(mode === "create" ? registerTempleAction : updateTempleAction, {});
  const v = (k: keyof Temple) => (s.values?.[k as string] ?? (temple?.[k] as string | undefined) ?? "") as string;
  const listed = s.values ? s.values.is_listed === "on" : !!temple?.is_listed;
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      {temple?.id && <input type="hidden" name="temple_id" value={temple.id} />}
      <Field id="name_th" label="ชื่อวัด" required hint="ตัวอย่าง: วัดพระศรีมหาธาตุ" error={err(s, "name_th")}>
        <input id="name_th" name="name_th" className="input" defaultValue={v("name_th")} {...aria(s, "name_th")} />
      </Field>
      <Field id="province" label="จังหวัด" required hint="ตัวอย่าง: นนทบุรี" error={err(s, "province")}>
        <input id="province" name="province" className="input" defaultValue={v("province")} {...aria(s, "province")} />
      </Field>
      <Field id="address_th" label="ที่อยู่" hint="ตัวอย่าง: 99 ถนนงามวงศ์วาน ตำบลบางเขน อำเภอเมือง" error={err(s, "address_th")}>
        <textarea id="address_th" name="address_th" className="input" defaultValue={v("address_th")} {...aria(s, "address_th")} />
      </Field>
      <Field id="phone" label="เบอร์โทรติดต่อวัด" hint="ตัวอย่าง: 02 123 4567" error={err(s, "phone")}>
        <input id="phone" name="phone" type="tel" inputMode="tel" className="input" defaultValue={v("phone")} {...aria(s, "phone")} />
      </Field>
      <Field id="description_th" label="แนะนำวัดสั้นๆ" hint="เช่น เวลาเปิด-ปิด สิ่งที่ผู้มาเยือนควรรู้" error={err(s, "description_th")}>
        <textarea id="description_th" name="description_th" className="input" defaultValue={v("description_th")} {...aria(s, "description_th")} />
      </Field>
      {mode === "edit" && (
        <label className="check">
          <input type="checkbox" name="is_listed" defaultChecked={listed} />
          <span><b>เปิดให้คนทั่วไปค้นหาวัดนี้ได้</b><br /><span className="hint">จะแสดงเมื่อผู้ดูแลระบบอนุมัติวัดแล้วเท่านั้น</span></span>
        </label>
      )}
      <SubmitButton pendingText={mode === "create" ? "กำลังส่งใบสมัคร…" : "กำลังบันทึก…"} block>
        {mode === "create" ? <><Send aria-hidden />ส่งใบสมัครลงทะเบียนวัด</> : <><Save aria-hidden />บันทึกข้อมูลวัด</>}
      </SubmitButton>
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
