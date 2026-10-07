"use client";
import { useActionState } from "react";
import { Users } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { createGroupAction } from "@/app/chat/actions";
import { initials } from "@/lib/chat";
import styles from "./chat.module.css";

export function GroupForm({ people }: { people: { person_id: string; display_name: string }[] }) {
  const [s, act] = useActionState(createGroupAction, {});
  const chosen = new Set((s.values?.member as string[] | undefined) ?? []);
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <Field id="title" label="ชื่อกลุ่ม" required hint="ตัวอย่าง: ชมรมจิตอาสา" error={s.fieldErrors?.title}>
        <input id="title" name="title" className="input" maxLength={60} defaultValue={(s.values?.title as string | undefined) ?? ""}
          aria-invalid={s.fieldErrors?.title ? true : undefined} />
      </Field>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack" aria-describedby={s.fieldErrors?.member ? "member-err" : undefined}>
        <legend style={{ fontWeight: 700, marginBottom: 8 }}>เลือกสมาชิก <span className="req">(จำเป็น)</span></legend>
        {people.map((p) => (
          <label key={p.person_id} className={styles.pickRow}>
            <input type="checkbox" name="member" value={p.person_id} defaultChecked={chosen.has(p.person_id)} />
            <span className={styles.avatar} aria-hidden style={{ width: 40, height: 40, fontSize: "1rem" }}>{initials(p.display_name)}</span>
            <span style={{ fontWeight: 700 }}>{p.display_name}</span>
          </label>
        ))}
        {s.fieldErrors?.member && <span className="field-error" id="member-err" role="alert">{s.fieldErrors.member}</span>}
      </fieldset>
      <SubmitButton pendingText="กำลังสร้างกลุ่ม…" block><Users aria-hidden />สร้างกลุ่ม</SubmitButton>
    </form>
  );
}
