"use client";
import { useActionState } from "react";
import { Send } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { submitContactAction, type ContactState } from "@/app/contact-actions";
import { EXPLAINER, TOPICS } from "@/lib/contact";

const err = (s: ContactState, k: string) => s.fieldErrors?.[k];
const aria = (s: ContactState, k: string) => ({ "aria-invalid": err(s, k) ? true : undefined, "aria-describedby": err(s, k) ? `${k}-err` : `${k}-hint` });

export function ContactForm({ slug }: { slug: string }) {
  const [s, act] = useActionState(submitContactAction, {});
  const v = (k: string) => s.values?.[k] ?? "";
  return (
    <form action={act} className="stack" noValidate>
      <Notice kind="info">{EXPLAINER}</Notice>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="slug" value={slug} />
      <Field id="topic" label="เรื่องที่ต้องการติดต่อ" required error={err(s, "topic")}>
        <select id="topic" name="topic" className="input" defaultValue={v("topic") || "invite_monk"} {...aria(s, "topic")}>
          {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field id="message" label="ข้อความ" required hint="อย่างน้อย 5 ตัวอักษร ไม่เกิน 2,000 ตัวอักษร ตัวอย่าง: ขอนิมนต์พระมาทำบุญบ้านวันที่ 12 ต.ค." error={err(s, "message")}>
        <textarea id="message" name="message" className="input" rows={6} defaultValue={v("message")} {...aria(s, "message")} />
      </Field>
      <Field id="name" label="ชื่อของคุณ" hint="ใส่ถ้าต้องการให้วัดติดต่อกลับ" error={err(s, "name")}>
        <input id="name" name="name" autoComplete="name" className="input" defaultValue={v("name")} {...aria(s, "name")} />
      </Field>
      <Field id="phone" label="เบอร์โทร" hint="ใส่ถ้าต้องการให้วัดติดต่อกลับ ตัวอย่าง: 081 234 5678" error={err(s, "phone")}>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="input" defaultValue={v("phone")} {...aria(s, "phone")} />
      </Field>
      <SubmitButton pendingText="กำลังส่งข้อความ…" block><Send aria-hidden />ส่งข้อความถึงวัด</SubmitButton>
    </form>
  );
}
