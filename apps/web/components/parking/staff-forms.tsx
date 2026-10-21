"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, CircleCheck, CircleX, LockKeyhole, Plus, Save, Send, TriangleAlert } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { useRefreshOnOk } from "@/components/monastic/use-refresh";
import { DECLARED_TH, REPORT_STATUSES, REPORT_TH, VEHICLES, VEHICLE_TH } from "@/lib/parking-staff";
import { confirmLotAction, reportParkingAction, saveLotAction, setDeclaredAction, type ParkingState } from "@/app/temple/[id]/parking/actions";
import s from "./staff.module.css";

const err = (st: ParkingState, k: string) => st.fieldErrors?.[k];
const STATUS_ICON = { AVAILABLE: CircleCheck, FILLING: TriangleAlert, FULL: CircleX, CLOSED: LockKeyhole };

export interface ReportLot { id: string; code: string; name_th: string; capacity: number | null }

/** The gate screen: pick the lot, tap a status, send. Big targets, one primary button. */
export function ReportForm({ templeId, lots, initialLot }: { templeId: string; lots: ReportLot[]; initialLot: string }) {
  const [st, act] = useActionState(reportParkingAction, {});
  useRefreshOnOk(st);
  const [lotId, setLotId] = useState(initialLot);
  const [gen, setGen] = useState(0);
  const last = useRef<ParkingState | null>(null);
  useEffect(() => { if (st.ok && last.current !== st) { last.current = st; setGen((g) => g + 1); } }, [st]);   // sent: clear status/count/note
  useEffect(() => { setLotId(initialLot); }, [initialLot]);
  const lot = lots.find((l) => l.id === lotId) ?? lots[0];
  const keep = st.ok ? undefined : st.values;
  return (
    <form action={act} className="stack" noValidate data-testid="form-report">
      {st.error && <Notice kind="error">{st.error}</Notice>}
      {st.ok && <Notice kind="ok">{st.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <fieldset className={s.group}>
        <legend>1. ลานไหน</legend>
        <div className={s.lotPicker}>
          {lots.map((l) => (
            <label key={l.id} className={s.lotChip} data-testid={`pick-${l.code}`}>
              <input type="radio" name="lot_id" value={l.id} checked={l.id === lot?.id} onChange={() => setLotId(l.id)} />
              <span><strong>{l.code}</strong> {l.name_th}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div key={`${gen}:${JSON.stringify(keep ?? {})}`} className="stack">
        <fieldset className={s.group} aria-describedby={err(st, "status") ? "status-err" : undefined}>
          <legend>2. ตอนนี้เป็นอย่างไร</legend>
          <div className={s.statusGrid}>
            {REPORT_STATUSES.map((k) => {
              const Icon = STATUS_ICON[k];
              return (
                <label key={k} className={`${s.statusTile} ${s[REPORT_TH[k].tone]}`} data-testid={`status-${k}`}>
                  <input type="radio" name="status" value={k} defaultChecked={keep?.status === k} />
                  <Icon size={30} aria-hidden /><strong>{REPORT_TH[k].label}</strong><small>{REPORT_TH[k].hint}</small>
                </label>
              );
            })}
          </div>
          {err(st, "status") && <span className="field-error" id="status-err" role="alert">{err(st, "status")}</span>}
        </fieldset>
        <details className="more" open={Boolean(err(st, "free") || err(st, "note") || keep?.free || keep?.note)}>
          <summary>3. นับที่ว่าง หรือเพิ่มหมายเหตุ (ไม่บังคับ)</summary>
          <div className="stack">
            <Field id="free" label="ที่ว่างที่นับได้ (คัน)" hint={lot?.capacity ? `ลานนี้จุได้ ${lot.capacity} คัน · เว้นว่างถ้าไม่ได้นับ ระบบจะไม่เดาตัวเลขให้` : "เว้นว่างถ้าไม่ได้นับ ระบบจะไม่เดาตัวเลขให้"} error={err(st, "free")}>
              <input name="free" className="input" inputMode="numeric" autoComplete="off" defaultValue={keep?.free ?? ""} />
            </Field>
            <Field id="note" label="หมายเหตุสำหรับผู้มาวัด" hint="ตัวอย่าง: ทางเข้าฝั่งตะวันออกปิด ใช้ประตู 2 แทน (ไม่เกิน 200 ตัวอักษร)" error={err(st, "note")}>
              <input name="note" className="input" maxLength={200} defaultValue={keep?.note ?? ""} />
            </Field>
          </div>
        </details>
      </div>
      <SubmitButton pendingText="กำลังส่ง…" block><Send aria-hidden />ส่งสถานะ{lot ? ` ${lot.code}` : ""}</SubmitButton>
    </form>
  );
}

export interface LotEdit {
  id: string; code: string; name_th: string; capacity: number | null; accessible_spaces: number | null; vehicle_types: string[];
  fee_note_th: string | null; hours_note_th: string | null; is_public: boolean; active: boolean; stale_after_minutes: number;
}

export function LotForm({ templeId, edit }: { templeId: string; edit?: LotEdit }) {
  const [st, act] = useActionState(saveLotAction, {});
  useRefreshOnOk(st);
  const [gen, setGen] = useState(0);
  const last = useRef<ParkingState | null>(null);
  useEffect(() => { if (st.created && last.current !== st) { last.current = st; setGen((g) => g + 1); } }, [st]);   // added: empty the form
  const v = (k: string, d = "") => st.values?.[k] ?? d;
  const vehicles = st.values?.vehicles !== undefined ? st.values.vehicles.split(",") : (edit?.vehicle_types ?? ["car"]);
  const flag = (k: "is_public" | "active", d: boolean) => (st.values ? st.values[k] === "on" : d);
  return (
    <form action={act} className="stack" noValidate data-testid={edit ? "form-lot-edit" : "form-lot-add"}>
      {st.error && <Notice kind="error">{st.error}</Notice>}
      {st.ok && <Notice kind="ok">{st.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      {edit && <input type="hidden" name="lot_id" value={edit.id} />}
      <div className="stack" key={`${gen}:${JSON.stringify(st.values ?? {})}`}>
        {edit ? (
          <div className="field"><span style={{ fontWeight: 700 }}>รหัสลาน</span>
            <output className="input" style={{ display: "flex", alignItems: "center", background: "var(--surface-2)" }} data-testid="lot-code-readonly">{edit.code}</output>
            <span className="hint">รหัสแก้ไขไม่ได้หลังสร้างแล้ว</span></div>
        ) : (
          <Field id="code" label="รหัสลาน" required hint="ตัวอย่าง: P1 หรือ NORTH-2 (ตัวพิมพ์ใหญ่ ตัวเลข หรือขีด) สร้างแล้วแก้ไขไม่ได้" error={err(st, "code")}>
            <input name="code" className="input" autoCapitalize="characters" autoComplete="off" spellCheck={false} defaultValue={v("code")} />
          </Field>
        )}
        <Field id="name_th" label="ชื่อลาน" required hint="ตัวอย่าง: ลานจอดหน้าวัด" error={err(st, "name_th")}>
          <input name="name_th" className="input" defaultValue={v("name_th", edit?.name_th)} />
        </Field>
        <div className={s.twoCol}>
          <Field id="capacity" label="จอดได้ทั้งหมด (คัน)" hint="เว้นว่างถ้ายังไม่ทราบ" error={err(st, "capacity")}>
            <input name="capacity" className="input" inputMode="numeric" defaultValue={v("capacity", edit?.capacity?.toString() ?? "")} />
          </Field>
          <Field id="accessible" label="ช่องจอดผู้พิการ" hint="เว้นว่างถ้ายังไม่ทราบ" error={err(st, "accessible")}>
            <input name="accessible" className="input" inputMode="numeric" defaultValue={v("accessible", edit?.accessible_spaces?.toString() ?? "")} />
          </Field>
        </div>
        <fieldset className={s.group} aria-describedby={err(st, "vehicles") ? "vehicles-err" : undefined}>
          <legend>ประเภทรถที่จอดได้</legend>
          <div className={s.checks}>
            {VEHICLES.map((k) => (
              <label key={k} className={s.check}><input type="checkbox" name="vehicles" value={k} defaultChecked={vehicles.includes(k)} />{VEHICLE_TH[k]}</label>
            ))}
          </div>
          {err(st, "vehicles") && <span className="field-error" id="vehicles-err" role="alert">{err(st, "vehicles")}</span>}
        </fieldset>
        <Field id="fee" label="ค่าจอด" hint="ตัวอย่าง: ฟรี หรือ ชั่วโมงละ 20 บาท · เว้นว่างถ้ายังไม่ทราบ" error={err(st, "fee")}>
          <input name="fee" className="input" maxLength={200} defaultValue={v("fee", edit?.fee_note_th ?? "")} />
        </Field>
        <Field id="hours" label="เวลาเปิด" hint="ตัวอย่าง: 06:00–18:00 · เว้นว่างถ้ายังไม่ทราบ" error={err(st, "hours")}>
          <input name="hours" className="input" maxLength={200} defaultValue={v("hours", edit?.hours_note_th ?? "")} />
        </Field>
        <div className={s.checks}>
          <label className={s.check}><input type="checkbox" name="is_public" defaultChecked={flag("is_public", edit?.is_public ?? true)} />ผู้มาวัดเห็นลานนี้ได้ (หลังวัดยืนยันแล้ว)</label>
          <label className={s.check}><input type="checkbox" name="active" defaultChecked={flag("active", edit?.active ?? true)} />เปิดใช้งาน (ปิดเมื่อเลิกใช้ลานนี้ ข้อมูลเดิมยังอยู่)</label>
        </div>
        <details className="more" open={Boolean(err(st, "stale"))}>
          <summary>ตั้งค่าเพิ่มเติม</summary>
          <Field id="stale" label="สถานะหมดอายุหลังจาก (นาที)" hint="ถ้าไม่มีใครรายงานใหม่ภายในเวลานี้ ผู้มาวัดจะเห็น “ไม่ทราบสถานะตอนนี้” แทนสถานะเก่า (5-1440)" error={err(st, "stale")}>
            <input name="stale" className="input" inputMode="numeric" defaultValue={v("stale", String(edit?.stale_after_minutes ?? 60))} />
          </Field>
        </details>
      </div>
      <SubmitButton pendingText="กำลังบันทึก…" block>{edit ? <><Save aria-hidden />บันทึกการแก้ไข</> : <><Plus aria-hidden />เพิ่มลานจอด</>}</SubmitButton>
    </form>
  );
}

/** Stays mounted after the lot becomes confirmed so the result message stays visible. */
export function ConfirmLotForm({ templeId, lotId, confirmed, name }: { templeId: string; lotId: string; confirmed: boolean; name: string }) {
  const [st, act] = useActionState(confirmLotAction, {});
  useRefreshOnOk(st);
  return (
    <form action={act} className="stack" noValidate>
      {st.error && <Notice kind="error">{st.error}</Notice>}
      {st.ok && confirmed && <Notice kind="ok">{st.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="lot_id" value={lotId} />
      {!confirmed && <>
        <p className="meta" style={{ margin: 0 }}>เมื่อยืนยันแล้ว ลานที่ตั้งให้ผู้มาวัดเห็นจะแสดงในหน้าที่จอดรถสาธารณะ ถ้าแก้ไขภายหลังต้องยืนยันใหม่</p>
        <SubmitButton pendingText="กำลังยืนยัน…" variant="secondary"><Check aria-hidden />ยืนยันข้อมูล {name}</SubmitButton>
      </>}
    </form>
  );
}

export function DeclaredForm({ templeId, current }: { templeId: string; current: string }) {
  const [st, act] = useActionState(setDeclaredAction, {});
  useRefreshOnOk(st);
  const value = st.values?.declared ?? current;
  return (
    <form action={act} className="stack" noValidate data-testid="form-declared">
      {st.error && <Notice kind="error">{st.error}</Notice>}
      {st.ok && <Notice kind="ok">{st.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <Field id="declared" label="วัดมีที่จอดรถไหม" hint="ใช้เมื่อยังไม่มีลานที่ยืนยันแล้ว: ผู้มาวัดจะเห็นว่า “วัดไม่มีที่จอดรถ” หรือ “วัดยังไม่ได้ยืนยันข้อมูล”">
        <select key={value} name="declared" className="input" defaultValue={value}>
          {Object.entries(DECLARED_TH).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </Field>
      <SubmitButton pendingText="กำลังบันทึก…" variant="secondary"><Save aria-hidden />บันทึกการตั้งค่า</SubmitButton>
    </form>
  );
}
