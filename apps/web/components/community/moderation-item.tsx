"use client";
import { useActionState } from "react";
import { Gavel } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { decideReportAction } from "@/app/community/actions";
import { DECISIONS, KIND_LABEL, LIMITS, decisionLabel, reasonLabel } from "@/lib/community";
import { ariaOf, errOf } from "./hooks";
import s from "./community.module.css";

export interface QueueItem {
  id: string; target_kind: string; target_person: string; target_name: string | null; content: string | null;
  reason: string; note: string | null; when: string; prior_actions: number;
}

export function ModerationItem({ item }: { item: QueueItem }) {
  const [st, act] = useActionState(decideReportAction, {});
  const pinned = item.reason === "minor_safety";
  const options = DECISIONS.filter((d) => item.target_kind !== "person" || d.value !== "remove_content");
  const done = !!st.ok;
  return (
    <article className="card stack" id={`report-${item.id}`} aria-label={`รายงาน${KIND_LABEL[item.target_kind] ?? ""}`}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <h3>{KIND_LABEL[item.target_kind] ?? item.target_kind} · {reasonLabel(item.reason)}</h3>
          <p className="meta" style={{ margin: 0 }}>{item.when}</p>
        </div>
        {pinned && <span className={`badge b-bad ${s.pin}`}>เร่งด่วน: เกี่ยวกับผู้เยาว์</span>}
      </div>
      <p style={{ margin: 0 }}>ผู้ถูกรายงาน: <strong>{item.target_name ?? "ไม่ทราบชื่อ"}</strong>
        {item.prior_actions > 0 && <> · เคยถูกดำเนินการแล้ว {item.prior_actions} ครั้ง</>}</p>
      {item.content != null && <blockquote className={s.quote}>{item.content}</blockquote>}
      {item.note && <p style={{ margin: 0 }}>รายละเอียดจากผู้รายงาน: {item.note}</p>}
      {done ? (
        <Notice kind="ok">{st.ok} ({decisionLabel(st.values?.decision ?? "")}) เหตุผล: {st.values?.reason}</Notice>
      ) : (
        <form action={act} className="stack" noValidate>
          {st.error && <Notice kind="error">{st.error}</Notice>}
          <input type="hidden" name="report" value={item.id} />
          <fieldset className={s.radios}>
            <legend>คำตัดสิน <span className="req">(จำเป็น)</span></legend>
            {options.map((d) => (
              <label key={d.value} className={s.radio}>
                <input type="radio" name="decision" value={d.value} defaultChecked={st.values?.decision === d.value} />
                <span>{d.label}<small>{d.help}</small></span>
              </label>
            ))}
            {errOf(st, "decision") && <span className="field-error" role="alert">{errOf(st, "decision")}</span>}
          </fieldset>
          <Field id={`reason-${item.id}`} label="เหตุผลของคำตัดสิน" required hint={`บันทึกไว้ตรวจสอบย้อนหลัง ไม่เกิน ${LIMITS.decisionReason} ตัวอักษร`} error={errOf(st, "reason")}>
            <textarea id={`reason-${item.id}`} name="reason" className="input" defaultValue={st.values?.reason} {...ariaOf(st, "reason")} />
          </Field>
          <SubmitButton pendingText="กำลังบันทึก…" variant="secondary"><Gavel aria-hidden />บันทึกคำตัดสิน</SubmitButton>
        </form>
      )}
    </article>
  );
}
