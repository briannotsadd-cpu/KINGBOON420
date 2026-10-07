"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { saveProfileAction } from "@/app/community/actions";
import type { MyProfile } from "@/app/community/data";
import { CALL_PERMISSION_LABEL, LIMITS, VIS_LABEL, VIS_VALUES, toBuddhistYear } from "@/lib/community";
import { ariaOf, errOf, useRefreshOnOk } from "./hooks";
import s from "./community.module.css";

function VisSelect({ name, label, value, error }: { name: string; label: string; value: string; error?: string }) {
  return (
    <Field id={name} label={label} required error={error}>
      <select id={name} name={name} className="input" defaultValue={value}>
        {VIS_VALUES.map((v) => <option key={v} value={v}>{VIS_LABEL[v]}</option>)}
      </select>
    </Field>
  );
}

export function ProfileForm({ profile, defaultName }: { profile: MyProfile | null; defaultName: string }) {
  const [st, act] = useActionState(saveProfileAction, {});
  useRefreshOnOk(st);
  const v = (k: string, fallback: string) => st.values?.[k] ?? fallback;
  return (
    <form action={act} className="stack" noValidate>
      {st.error && <Notice kind="error">{st.error}</Notice>}
      {st.ok && <Notice kind="ok">{st.ok}</Notice>}
      <Field id="display_name" label="ชื่อที่ให้คนในชุมชนเห็น" required hint={`${LIMITS.nameMin}–${LIMITS.nameMax} ตัวอักษร ชื่อนี้เห็นได้เสมอ`} error={errOf(st, "display_name")}>
        <input id="display_name" name="display_name" className="input" autoComplete="name" defaultValue={v("display_name", profile?.display_name ?? defaultName)} {...ariaOf(st, "display_name")} />
      </Field>

      {profile ? (
        <div className="field">
          <span className={s.fieldTitle}>ปีเกิด (พ.ศ.)</span>
          <p style={{ margin: 0, fontSize: "1.1rem" }}>{toBuddhistYear(profile.birth_year)}</p>
          <span className="hint">แก้ไขไม่ได้หลังบันทึกครั้งแรก ปีเกิดใช้เพื่อตรวจว่าอายุถึงเกณฑ์เท่านั้น และไม่แสดงให้ใครเห็น</span>
        </div>
      ) : (
        <Field id="birth_year" label="ปีเกิด (พ.ศ.)" required hint="กรอกครั้งเดียว แก้ไขภายหลังไม่ได้ กรุณาตรวจสอบให้ถูกต้อง เช่น 2510 ใช้เพื่อตรวจว่าอายุถึงเกณฑ์ (20 ปีขึ้นไป) เท่านั้น ไม่แสดงให้ใครเห็น" error={errOf(st, "birth_year")}>
          <input id="birth_year" name="birth_year" className="input" inputMode="numeric" maxLength={4} defaultValue={v("birth_year", "")} {...ariaOf(st, "birth_year")} />
        </Field>
      )}

      <section className="card stack">
        <h2 style={{ margin: 0 }}>แนะนำตัว</h2>
        <Field id="bio" label="แนะนำตัวสั้น ๆ" hint={`ไม่เกิน ${LIMITS.bio} ตัวอักษร`} error={errOf(st, "bio")}>
          <textarea id="bio" name="bio" className="input" defaultValue={v("bio", profile?.bio ?? "")} {...ariaOf(st, "bio")} />
        </Field>
        <VisSelect name="bio_vis" label="ใครเห็นการแนะนำตัวได้" value={v("bio_vis", profile?.bio_vis ?? "connections")} error={errOf(st, "bio_vis")} />
        <Field id="skills" label="ความสามารถ" hint="คั่นด้วยเครื่องหมายจุลภาค (,) เช่น ทำอาหาร, ปลูกต้นไม้" error={errOf(st, "skills")}>
          <input id="skills" name="skills" className="input" defaultValue={v("skills", profile?.skills.join(", ") ?? "")} {...ariaOf(st, "skills")} />
        </Field>
        <VisSelect name="skills_vis" label="ใครเห็นความสามารถได้" value={v("skills_vis", profile?.skills_vis ?? "connections")} error={errOf(st, "skills_vis")} />
        <Field id="interests" label="สิ่งที่สนใจ" hint="คั่นด้วยเครื่องหมายจุลภาค (,) เช่น ฟังธรรม, งานบุญ" error={errOf(st, "interests")}>
          <input id="interests" name="interests" className="input" defaultValue={v("interests", profile?.interests.join(", ") ?? "")} {...ariaOf(st, "interests")} />
        </Field>
        <VisSelect name="interests_vis" label="ใครเห็นสิ่งที่สนใจได้" value={v("interests_vis", profile?.interests_vis ?? "connections")} error={errOf(st, "interests_vis")} />
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>ความเป็นส่วนตัว</h2>
        <label className="check" htmlFor="discoverable">
          <input id="discoverable" name="discoverable" type="checkbox" defaultChecked={st.values ? st.values.discoverable === "on" : (profile?.discoverable ?? true)} />
          <span>ให้คนอื่นค้นหาชื่อฉันเจอ<br /><span className="hint">ถ้าปิด คนอื่นจะหาฉันจากการค้นหาไม่เจอ</span></span>
        </label>
        <Field id="call_permission" label="ใครโทรหาฉันได้" required error={errOf(st, "call_permission")}>
          <select id="call_permission" name="call_permission" className="input" defaultValue={v("call_permission", profile?.call_permission ?? "connections")}>
            {(Object.keys(CALL_PERMISSION_LABEL) as (keyof typeof CALL_PERMISSION_LABEL)[]).map((k) => <option key={k} value={k}>{CALL_PERMISSION_LABEL[k]}</option>)}
          </select>
        </Field>
      </section>
      <SubmitButton pendingText="กำลังบันทึก…" block><Save aria-hidden />บันทึกโปรไฟล์</SubmitButton>
    </form>
  );
}
