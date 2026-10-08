"use client";
import { useActionState } from "react";
import { Ban, CheckCheck, ClipboardList, Flag, Play } from "lucide-react";
import { Notice, SubmitButton } from "@/components/ui";
import { eventOpAction } from "@/app/temple/[id]/events/actions";
import { APPROVER_MSG, CAN_CANCEL, NEXT_STEP, TRANSITION_TH, type Transition } from "@/lib/events";
import { EField, aria, useRefreshOnOk } from "./common";
import { sub } from "./chip";

const ICON: Record<Transition, typeof Play> = { plan: ClipboardList, approve: CheckCheck, start: Play, close: Flag, cancel: Ban };

/** Lifecycle for managers: the single next step (the page's primary button) and, below it, cancel with a required reason.
 *  The DB decides who may approve; its refusal is shown here. */
export function LifecycleForm({ templeId, eventId, status, canApprove }: { templeId: string; eventId: string; status: string; canApprove: boolean }) {
  const [s, act] = useActionState(eventOpAction, {});
  useRefreshOnOk(s);
  const next = NEXT_STEP[status];
  if (!next && !CAN_CANCEL.has(status)) return null;
  const Icon = next ? ICON[next] : Ban;
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="event_id" value={eventId} />
      {next && (
        <div>
          <SubmitButton name="op" value={next} pendingText="กำลังบันทึก…" block><Icon aria-hidden />{TRANSITION_TH[next]}</SubmitButton>
          {next === "approve" && !canApprove && <p style={sub}>{APPROVER_MSG}</p>}
        </div>
      )}
      {CAN_CANCEL.has(status) && (
        <details className="more" open={!!s.values?.reason || !!s.fieldErrors?.reason}>
          <summary>ยกเลิกงานนี้</summary>
          <div className="stack">
            <EField id="reason" label="เหตุผลที่ยกเลิก" required hint={status === "APPROVED" ? "งานที่อนุมัติแล้ว ต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายเป็นผู้ยกเลิก" : undefined} error={s.fieldErrors?.reason}>
              <textarea id="reason" name="reason" className="input" rows={3} defaultValue={s.values?.reason} {...aria("reason", s.fieldErrors?.reason)} />
            </EField>
            <SubmitButton name="op" value="cancel" variant="danger" pendingText="กำลังยกเลิก…" block><Ban aria-hidden />ยืนยันยกเลิกงาน</SubmitButton>
          </div>
        </details>
      )}
    </form>
  );
}
