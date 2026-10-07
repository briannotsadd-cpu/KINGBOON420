"use client";
import { useActionState } from "react";
import { Ban, X } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { clearAvailabilityAction, setOtherUnavailableAction } from "@/app/temple/[id]/monastic-actions";
import { UNAVAIL_REASONS } from "@/lib/monastic";
import { aria, err, kv, useRefreshOnOk } from "./use-refresh";

/** Set ANOTHER monk to ไม่ว่าง. The end date is required (no default), at most 120 days. */
export function SetOtherForm({ templeId, monks, minDate }: { templeId: string; monks: { id: string; name: string }[]; minDate: string }) {
  const [s, act] = useActionState(setOtherUnavailableAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <Field id="person_id" label="พระที่ต้องการตั้งว่า ไม่ว่าง" required error={err(s, "person_id")}>
        <select key={kv(s, "person_id")} id="person_id" name="person_id" className="input" defaultValue={s.values?.person_id ?? ""} {...aria(s, "person_id")}>
          <option value="">— เลือก —</option>
          {monks.map((m) => <option key={m.id} value={m.id}>{m.name || "(ไม่มีชื่อ)"}</option>)}
        </select>
      </Field>
      <Field id="end_date" label="ไม่ว่างถึงวันที่" required hint="นับถึงสิ้นวันที่เลือก ตั้งได้ไม่เกิน 120 วัน" error={err(s, "end_date")}>
        <input id="end_date" name="end_date" type="date" min={minDate} className="input" defaultValue={s.values?.end_date ?? ""} {...aria(s, "end_date")} />
      </Field>
      <Field id="reason" label="เหตุผล" required error={err(s, "reason")}>
        <select key={kv(s, "reason")} id="reason" name="reason" className="input" defaultValue={s.values?.reason ?? "OTHER"} {...aria(s, "reason")}>
          {UNAVAIL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
      <SubmitButton pendingText="กำลังบันทึก…" block><Ban aria-hidden />ตั้งว่า ไม่ว่าง</SubmitButton>
    </form>
  );
}

export function ClearRowButton({ templeId, rowId }: { templeId: string; rowId: string }) {
  const [s, act] = useActionState(clearAvailabilityAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack">
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="row_id" value={rowId} />
      <SubmitButton pendingText="กำลังยกเลิก…" variant="secondary"><X aria-hidden />ยกเลิกการตั้ง ไม่ว่าง</SubmitButton>
    </form>
  );
}
