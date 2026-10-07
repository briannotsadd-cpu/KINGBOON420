"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquareReply, UserCheck, Archive } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { contactOpAction, type ContactState } from "@/app/contact-actions";

function useRefreshOnOk(s: ContactState) {
  const router = useRouter();
  const last = useRef<ContactState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; router.refresh(); } }, [s, router]);
}

/** One form per thread; stays mounted when the status changes so the result message stays visible. */
export function InboxActions({ templeId, threadId, status }: { templeId: string; threadId: string; status: string }) {
  const [s, act] = useActionState(contactOpAction, {});
  useRefreshOnOk(s);
  const rid = `reply-${threadId}`;
  const canAssign = status === "NEW" || status === "ASSIGNED";
  const canReply = status !== "CLOSED";
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="thread_id" value={threadId} />
      <input type="hidden" name="temple_id" value={templeId} />
      {canReply && (
        <Field id={rid} label={status === "REPLIED" ? "ตอบเพิ่มเติม" : "ตอบกลับ"} hint="ตอบในนามเจ้าหน้าที่วัด ไม่เกิน 2,000 ตัวอักษร" error={s.fieldErrors?.reply}>
          <textarea id={rid} name="reply" className="input" rows={4} defaultValue={s.values?.reply}
            aria-invalid={s.fieldErrors?.reply ? true : undefined} aria-describedby={s.fieldErrors?.reply ? `${rid}-err` : `${rid}-hint`} />
        </Field>
      )}
      <div className="btn-row" style={{ marginTop: 0 }}>
        {canReply && <SubmitButton name="op" value="reply" pendingText="กำลังส่ง…"><MessageSquareReply aria-hidden />ส่งคำตอบ</SubmitButton>}
        {canAssign && status === "NEW" && <SubmitButton name="op" value="assign" pendingText="กำลังบันทึก…" variant="secondary"><UserCheck aria-hidden />รับเรื่อง</SubmitButton>}
        {status !== "CLOSED" && <SubmitButton name="op" value="close" pendingText="กำลังบันทึก…" variant="secondary"><Archive aria-hidden />ปิดเรื่อง</SubmitButton>}
      </div>
      {status === "CLOSED" && <p className="meta"><Check size={18} aria-hidden /> เรื่องนี้ปิดแล้ว</p>}
    </form>
  );
}
