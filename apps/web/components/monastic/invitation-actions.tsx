"use client";
import { useActionState } from "react";
import { Ban, CheckCheck, Play, RotateCcw, Search, Send, TriangleAlert, Users, XCircle } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { invitationOpAction } from "@/app/temple/[id]/monastic-actions";
import { DECLINE_REASONS, STALE_ERR, violationLabel, warningLabel } from "@/lib/monastic";
import { aria, err, kv, useRefreshOnOk } from "./use-refresh";

export interface Cand { id: string; name: string; codes: string[] }
export interface Cands { suggested: Cand[]; needs: Cand[]; excluded: Cand[] }

/** All transitions of one invitation in one form that stays mounted when the status changes (so the result message stays visible).
 *  Authority is entirely in app.invitation_transition; the buttons shown depend on status only. */
export function InvitationActions({ templeId, invId, version, status, canManage, startsPassed, requiresLead, monksRequired, cands, suggestDenied, warnings }:
  { templeId: string; invId: string; version: number; status: string; canManage: boolean; startsPassed: boolean; requiresLead: boolean;
    monksRequired: number; cands: Cands | null; suggestDenied: boolean; warnings: string[] }) {
  const [s, act] = useActionState(invitationOpAction, {});
  useRefreshOnOk(s);
  const picked = new Set((s.values?.team ?? "").split(",").filter(Boolean));
  const canDecline = status === "RECEIVED" || status === "REVIEWING" || status === "TEAM_PROPOSED";
  const canCancel = status === "CONFIRMED" || status === "IN_PROGRESS";
  const selectable = [...(cands?.suggested ?? []), ...(cands?.needs ?? [])];
  const body = (
    <>
      {s.error && (
        <Notice kind="error">
          {s.error}
          {s.error === STALE_ERR && <> <a href={`/temple/${templeId}/invitations/${invId}`}>โหลดหน้านี้ใหม่</a></>}
        </Notice>
      )}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="inv_id" value={invId} />
      <input type="hidden" name="version" value={version} />

      {status === "REVIEWING" && (
        <section className="stack" data-testid="suggestions" aria-label="รายชื่อพระที่ระบบเสนอ">
          <h2>เลือกทีมพระ (ต้องการ {monksRequired} รูป)</h2>
          <p className="meta">รายชื่อนี้เป็นข้อเสนอของระบบ ผู้ตัดสินใจคือเจ้าอาวาสหรือผู้ได้รับมอบหมาย</p>
          {suggestDenied && <Notice kind="info">บัญชีนี้ไม่มีสิทธิ์ดูรายชื่อที่ระบบเสนอ</Notice>}
          {cands && (
            <>
              <div className="stack" data-testid="list-suggested">
                <h3>แนะนำ <span className="hint">(แจ้งว่าว่างรับกิจในช่วงนี้แล้ว)</span></h3>
                {cands.suggested.length === 0 ? <p className="meta">ยังไม่มี</p> : cands.suggested.map((c) => (
                  <label key={c.id} className="check"><input key={`${c.id}:${picked.has(c.id)}`} type="checkbox" name="team" value={c.id} defaultChecked={picked.has(c.id)} /><span>{c.name || "(ไม่มีชื่อ)"}</span></label>
                ))}
              </div>
              <div className="stack" data-testid="list-needs">
                <h3>ต้องถามก่อน <span className="hint">(ยังไม่ได้แจ้งว่าว่าง)</span></h3>
                {cands.needs.length === 0 ? <p className="meta">ไม่มี</p> : cands.needs.map((c) => (
                  <div key={c.id}>
                    <label className="check"><input key={`${c.id}:${picked.has(c.id)}`} type="checkbox" name="team" value={c.id} defaultChecked={picked.has(c.id)} /><span>{c.name || "(ไม่มีชื่อ)"}</span></label>
                    {c.codes.map((w) => <p key={w} className="meta" style={{ marginLeft: 40 }}><TriangleAlert size={18} aria-hidden /> {warningLabel(w)}</p>)}
                  </div>
                ))}
              </div>
              <div className="stack" data-testid="list-excluded">
                <h3>ไม่ว่าง/ขัดข้อง <span className="hint">(เลือกไม่ได้)</span></h3>
                {cands.excluded.length === 0 ? <p className="meta">ไม่มี</p> : cands.excluded.map((c) => (
                  <div key={c.id}>
                    <b>{c.name || "(ไม่มีชื่อ)"}</b>
                    {c.codes.map((v) => <p key={v} className="meta" style={{ margin: "0 0 0 8px" }}>{violationLabel(v)}</p>)}
                  </div>
                ))}
              </div>
              {err(s, "team") && <span className="field-error" role="alert">{err(s, "team")}</span>}
              {requiresLead && (
                <Field id="lead" label="หัวหน้าคณะ" required hint="พิธีนี้ต้องมีหัวหน้าคณะ เลือกจากพระที่ติ๊กไว้ด้านบน" error={err(s, "lead")}>
                  <select key={kv(s, "lead")} id="lead" name="lead" className="input" defaultValue={s.values?.lead ?? ""} {...aria(s, "lead")}>
                    <option value="">— เลือก —</option>
                    {selectable.map((c) => <option key={c.id} value={c.id}>{c.name || "(ไม่มีชื่อ)"}</option>)}
                  </select>
                </Field>
              )}
            </>
          )}
        </section>
      )}

      {status === "TEAM_PROPOSED" && warnings.length > 0 && (
        <div className="notice notice-warn" data-testid="warnings">
          <TriangleAlert size={24} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>คำเตือนก่อนยืนยัน</b>
            <ul className="check-list">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            <label className="check"><input key={kv(s, "ack")} type="checkbox" name="ack" defaultChecked={!!s.values?.ack} /><span><b>รับทราบคำเตือน</b> และต้องการยืนยันกิจนิมนต์นี้</span></label>
          </div>
        </div>
      )}

      {canManage && (
        <div className="btn-row" style={{ marginTop: 0 }}>
          {status === "RECEIVED" && <SubmitButton name="op" value="start_review" pendingText="กำลังบันทึก…"><Search aria-hidden />เริ่มพิจารณา</SubmitButton>}
          {status === "REVIEWING" && cands && <SubmitButton name="op" value="propose_team" pendingText="กำลังบันทึก…"><Users aria-hidden />เสนอทีมนี้</SubmitButton>}
          {status === "TEAM_PROPOSED" && <SubmitButton name="op" value="confirm" pendingText="กำลังยืนยัน…"><CheckCheck aria-hidden />ยืนยันกิจนิมนต์</SubmitButton>}
          {status === "TEAM_PROPOSED" && <SubmitButton name="op" value="revise_team" pendingText="กำลังบันทึก…" variant="secondary"><RotateCcw aria-hidden />แก้ไขทีม</SubmitButton>}
          {status === "CONFIRMED" && <SubmitButton name="op" value="start" pendingText="กำลังบันทึก…" variant="secondary"><Play aria-hidden />เริ่มกิจ</SubmitButton>}
          {(status === "CONFIRMED" || status === "IN_PROGRESS") && startsPassed &&
            <SubmitButton name="op" value="complete" pendingText="กำลังบันทึก…" variant={status === "IN_PROGRESS" ? "primary" : "secondary"}><Send aria-hidden />กิจเสร็จสิ้น</SubmitButton>}
        </div>
      )}
      {canManage && (status === "CONFIRMED" || status === "IN_PROGRESS") && !startsPassed && <p className="meta">กดบันทึกว่ากิจเสร็จสิ้นได้เมื่อถึงเวลาเริ่มกิจแล้ว</p>}

      {canManage && canDecline && (
        <details className="more" open={!!err(s, "reason_code")}>
          <summary>ไม่รับกิจนิมนต์นี้</summary>
          <div className="stack">
            <p className="meta">การไม่รับต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายเป็นผู้ยืนยัน</p>
            <Field id="reason_code" label="เหตุผลที่ไม่รับ" required error={err(s, "reason_code")}>
              <select key={kv(s, "reason_code")} id="reason_code" name="reason_code" className="input" defaultValue={s.values?.reason_code ?? ""} {...aria(s, "reason_code")}>
                <option value="">— เลือก —</option>
                {DECLINE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <SubmitButton name="op" value="decline" pendingText="กำลังบันทึก…" variant="danger"><Ban aria-hidden />ยืนยัน ไม่รับกิจนิมนต์นี้</SubmitButton>
          </div>
        </details>
      )}
      {canManage && canCancel && (
        <details className="more" open={!!err(s, "cancel_reason")}>
          <summary>ยกเลิกกิจนิมนต์นี้</summary>
          <div className="stack">
            <p className="meta">การยกเลิกจะยกเลิกตารางของพระทุกรูปในทีม และต้องให้เจ้าอาวาสหรือผู้ได้รับมอบหมายเป็นผู้ยืนยัน</p>
            <Field id="cancel_reason" label="เหตุผลที่ยกเลิก" required hint="ตัวอย่าง: เจ้าภาพขอเลื่อนวัน" error={err(s, "cancel_reason")}>
              <textarea id="cancel_reason" name="cancel_reason" className="input" defaultValue={s.values?.cancel_reason ?? ""} {...aria(s, "cancel_reason")} />
            </Field>
            <SubmitButton name="op" value="cancel" pendingText="กำลังยกเลิก…" variant="danger"><XCircle aria-hidden />ยืนยัน ยกเลิกกิจนิมนต์</SubmitButton>
          </div>
        </details>
      )}
    </>
  );
  return <form action={act} className="stack" noValidate>{body}</form>;
}
