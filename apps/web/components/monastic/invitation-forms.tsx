"use client";
import { useActionState } from "react";
import { FilePlus2, Plus } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { createInvitationAction, saveRiteTypeAction } from "@/app/temple/[id]/monastic-actions";
import { DURATIONS, RECEIVED_VIA, TRANSPORTS, fmtDuration } from "@/lib/monastic";
import { aria, err, kv, useRefreshOnOk } from "./use-refresh";

/** Add a rite type without leaving the page. A separate form (forms cannot nest) placed above the intake form. */
export function RiteTypeForm({ templeId, open }: { templeId: string; open: boolean }) {
  const [s, act] = useActionState(saveRiteTypeAction, {});
  useRefreshOnOk(s);
  return (
    <details className="more" open={open || !!s.ok || !!s.error || !!s.fieldErrors}>
      <summary>ไม่มีประเภทพิธีที่ต้องการ? เพิ่มประเภทพิธีใหม่</summary>
      <form action={act} className="stack card" noValidate>
        {s.error && <Notice kind="error">{s.error}</Notice>}
        {s.ok && <Notice kind="ok">{s.ok}</Notice>}
        <input type="hidden" name="temple_id" value={templeId} />
        <Field id="rite_name" label="ชื่อประเภทพิธี" required hint="ตัวอย่าง: สวดมนต์เย็น, ทำบุญบ้าน, งานศพ" error={err(s, "rite_name")}>
          <input id="rite_name" name="rite_name" className="input" defaultValue={s.values?.rite_name ?? ""} {...aria(s, "rite_name")} />
        </Field>
        <Field id="rite_duration" label="ระยะเวลามาตรฐาน" required error={err(s, "rite_duration")}>
          <select key={kv(s, "rite_duration")} id="rite_duration" name="rite_duration" className="input" defaultValue={s.values?.rite_duration ?? "60"}>
            {DURATIONS.map((d) => <option key={d} value={d}>{fmtDuration(d)}</option>)}
          </select>
        </Field>
        <label className="check"><input key={kv(s, "requires_lead")} type="checkbox" name="requires_lead" defaultChecked={!!s.values?.requires_lead} /><span>พิธีนี้ต้องมีหัวหน้าคณะ</span></label>
        <SubmitButton pendingText="กำลังบันทึก…" variant="secondary"><Plus aria-hidden />เพิ่มประเภทพิธี</SubmitButton>
      </form>
    </details>
  );
}

export function NewInvitationForm({ templeId, rites, minDate }: { templeId: string; rites: { id: string; name_th: string }[]; minDate: string }) {
  const [s, act] = useActionState(createInvitationAction, {});
  const v = (k: string, d = "") => s.values?.[k] ?? d;
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <Field id="rite" label="ประเภทพิธี" required error={err(s, "rite")}>
        <select key={kv(s, "rite")} id="rite" name="rite" className="input" defaultValue={v("rite")} {...aria(s, "rite")}>
          <option value="">— เลือก —</option>
          {rites.map((r) => <option key={r.id} value={r.id}>{r.name_th}</option>)}
        </select>
      </Field>
      <Field id="host_name" label="ชื่อเจ้าภาพ" required hint="ตัวอย่าง: คุณสมหมาย ใจดี" error={err(s, "host_name")}>
        <input id="host_name" name="host_name" className="input" defaultValue={v("host_name")} {...aria(s, "host_name")} />
      </Field>
      <Field id="host_phone" label="เบอร์โทรเจ้าภาพ" hint="ตัวอย่าง: 081 234 5678 (เห็นเฉพาะผู้ที่ดูกิจนิมนต์นี้ได้)" error={err(s, "host_phone")}>
        <input id="host_phone" name="host_phone" type="tel" inputMode="tel" className="input" defaultValue={v("host_phone")} {...aria(s, "host_phone")} />
      </Field>
      <Field id="host_relation" label="เจ้าภาพเกี่ยวข้องกับวัดอย่างไร" hint="ตัวอย่าง: โยมประจำวัด, ญาติโยม" error={err(s, "host_relation")}>
        <input id="host_relation" name="host_relation" className="input" defaultValue={v("host_relation")} {...aria(s, "host_relation")} />
      </Field>
      <Field id="venue" label="สถานที่" required hint="ตัวอย่าง: บ้านเลขที่ 99 ถนนสุขใจ หมู่ 3" error={err(s, "venue")}>
        <textarea id="venue" name="venue" className="input" defaultValue={v("venue")} {...aria(s, "venue")} />
      </Field>
      <Field id="date" label="วันที่" required hint="เวลาประเทศไทย" error={err(s, "date")}>
        <input id="date" name="date" type="date" min={minDate} className="input" defaultValue={v("date")} {...aria(s, "date")} />
      </Field>
      <Field id="time" label="เวลาเริ่ม" required error={err(s, "time")}>
        <input id="time" name="time" type="time" className="input" defaultValue={v("time")} {...aria(s, "time")} />
      </Field>
      <Field id="duration" label="ใช้เวลาประมาณ" required error={err(s, "duration")}>
        <select key={kv(s, "duration")} id="duration" name="duration" className="input" defaultValue={v("duration", "60")} {...aria(s, "duration")}>
          {DURATIONS.map((d) => <option key={d} value={d}>{fmtDuration(d)}</option>)}
        </select>
      </Field>
      <Field id="monks" label="จำนวนพระที่เจ้าภาพขอนิมนต์ (รูป)" required hint="ตัวอย่าง: 9" error={err(s, "monks")}>
        <input id="monks" name="monks" inputMode="numeric" className="input" defaultValue={v("monks")} {...aria(s, "monks")} />
      </Field>
      <Field id="transport" label="การเดินทางไปสถานที่" required error={err(s, "transport")}>
        <select key={kv(s, "transport")} id="transport" name="transport" className="input" defaultValue={v("transport", "HOST_PROVIDES")} {...aria(s, "transport")}>
          {TRANSPORTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field id="travel_out" label="เวลาเดินทางไป (นาที)" hint="ไม่ทราบให้เว้นว่าง ระบบจะไม่เดา" error={err(s, "travel_out")}>
        <input id="travel_out" name="travel_out" inputMode="numeric" className="input" defaultValue={v("travel_out")} {...aria(s, "travel_out")} />
      </Field>
      <Field id="travel_back" label="เวลาเดินทางกลับ (นาที)" hint="ไม่ทราบให้เว้นว่าง ระบบจะไม่เดา" error={err(s, "travel_back")}>
        <input id="travel_back" name="travel_back" inputMode="numeric" className="input" defaultValue={v("travel_back")} {...aria(s, "travel_back")} />
      </Field>
      <Field id="via" label="รับเรื่องมาทางไหน" required error={err(s, "via")}>
        <select key={kv(s, "via")} id="via" name="via" className="input" defaultValue={v("via", "phone")} {...aria(s, "via")}>
          {RECEIVED_VIA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field id="note" label="หมายเหตุ" hint="ไม่เกิน 1,000 ตัวอักษร" error={err(s, "note")}>
        <textarea id="note" name="note" className="input" defaultValue={v("note")} {...aria(s, "note")} />
      </Field>
      <SubmitButton pendingText="กำลังบันทึก…" block><FilePlus2 aria-hidden />บันทึกกิจนิมนต์</SubmitButton>
    </form>
  );
}
