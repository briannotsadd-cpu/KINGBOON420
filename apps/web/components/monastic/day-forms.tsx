"use client";
import { useActionState, useState } from "react";
import { CalendarCheck, Check, DoorOpen, Hand, TriangleAlert, X } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { checkInAction, clearAvailabilityAction, respondAction, setMyAvailabilityAction } from "@/app/temple/[id]/monastic-actions";
import { SELF_STATES, UNAVAIL_REASONS } from "@/lib/monastic";
import { aria, err, kv, useRefreshOnOk, useFlashRefreshOnOk } from "./use-refresh";

/** Set my own availability. valid_until is required and prefilled to the end of today (Asia/Bangkok). */
export function AvailabilityForm({ templeId, defaultUntil }: { templeId: string; defaultUntil: string }) {
  const [s, act] = useActionState(setMyAvailabilityAction, {});
  useRefreshOnOk(s);
  const [sel, setSel] = useState(s.values?.state || "AVAILABLE");
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 700, marginBottom: 6 }}>ตั้งสถานะของฉัน <span className="req">(จำเป็น)</span></legend>
        {SELF_STATES.map((o) => (
          <label key={o.value} className="check">
            <input type="radio" name="state" value={o.value} checked={sel === o.value} onChange={() => setSel(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
        {err(s, "state") && <span className="field-error" role="alert">{err(s, "state")}</span>}
      </fieldset>
      {sel === "UNAVAILABLE" && (
        <Field id="reason" label="เหตุผลที่ไม่ว่าง" error={err(s, "reason")}>
          <select key={kv(s, "reason")} id="reason" name="reason" className="input" defaultValue={s.values?.reason || "OTHER"} {...aria(s, "reason")}>
            {UNAVAIL_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      )}
      <Field id="valid_until" label="สถานะนี้ใช้ถึงเมื่อไร (เวลาประเทศไทย)" required
        hint="ระบบตั้งให้เป็นสิ้นวันนี้ เปลี่ยนได้ ถึงเวลานั้นสถานะจะกลับเป็น ไม่ทราบ เอง" error={err(s, "valid_until")}>
        <input id="valid_until" name="valid_until" type="datetime-local" className="input" defaultValue={s.values?.valid_until ?? defaultUntil} {...aria(s, "valid_until")} />
      </Field>
      <SubmitButton pendingText="กำลังบันทึก…" block><Check aria-hidden />บันทึกสถานะ</SubmitButton>
    </form>
  );
}

export function CheckInButton({ templeId }: { templeId: string }) {
  const [s, act] = useActionState(checkInAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack">
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <SubmitButton pendingText="กำลังเช็คอิน…" variant="secondary" block><DoorOpen aria-hidden />เช็คอินเข้าวัด</SubmitButton>
    </form>
  );
}

export function ClearOwnButton({ templeId, rowId, label }: { templeId: string; rowId: string; label: string }) {
  const [s, act] = useActionState(clearAvailabilityAction, {});
  useFlashRefreshOnOk(s);
  return (
    <form action={act} className="stack">
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="row_id" value={rowId} />
      <SubmitButton pendingText="กำลังยกเลิก…" variant="secondary"><X aria-hidden />{label}</SubmitButton>
    </form>
  );
}

/** Acknowledge / report a problem for one invitation. "แจ้งติดขัด" never cancels the invitation. */
export function RespondForm({ templeId, invId, response }: { templeId: string; invId: string; response: string }) {
  const [s, act] = useActionState(respondAction, {});
  useRefreshOnOk(s);
  const shown = s.ok ? (s.ok.includes("ติดขัด") ? "RELEASE_REQUESTED" : "ACKNOWLEDGED") : response;
  return (
    <form action={act} className="stack" style={{ marginTop: 12 }}>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="inv_id" value={invId} />
      {shown === "ACKNOWLEDGED" && <p className="meta"><CalendarCheck size={18} aria-hidden /> รับทราบแล้ว</p>}
      {shown === "RELEASE_REQUESTED" && <p className="meta"><TriangleAlert size={18} aria-hidden /> แจ้งติดขัดแล้ว รอเลขาฯ ติดต่อกลับ</p>}
      <div className="btn-row" style={{ marginTop: 0 }}>
        {shown !== "ACKNOWLEDGED" && <SubmitButton name="response" value="ACKNOWLEDGED" pendingText="กำลังบันทึก…" variant="secondary"><Hand aria-hidden />รับทราบ</SubmitButton>}
        {shown !== "RELEASE_REQUESTED" && <SubmitButton name="response" value="RELEASE_REQUESTED" pendingText="กำลังส่ง…" variant="secondary"><TriangleAlert aria-hidden />แจ้งติดขัด</SubmitButton>}
      </div>
      <p className="meta">แจ้งติดขัดจะส่งถึงเลขาฯ ไม่ได้ยกเลิกกิจนิมนต์</p>
    </form>
  );
}
