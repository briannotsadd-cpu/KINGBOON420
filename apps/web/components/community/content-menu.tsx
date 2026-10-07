"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { EllipsisVertical, Flag, VolumeX, Volume2, Ban, Trash2, X } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { blockAction, deletePostAction, reportAction, setMuteAction } from "@/app/community/actions";
import { REPORT_REASONS, LIMITS } from "@/lib/community";
import { ariaOf, errOf, useAct } from "./hooks";
import s from "./community.module.css";

type Mode = null | "menu" | "report" | "block" | "delete";
export interface MenuProps {
  /** what a report is about */
  kind: "post" | "comment" | "person";
  targetId: string;
  /** the author / the person the menu is about */
  personId: string;
  personName: string;
  /** own post: the menu only offers delete */
  mine?: boolean;
  muted?: boolean;
  /** called after mute/block/delete succeeded so the parent can hide things */
  onGone?: (what: "mute" | "block" | "delete", personId: string, targetId: string) => void;
  id?: string;
}

/** The ⋯ menu: identical everywhere (FLOWS J-06): รายงาน / ปิดเสียง / บล็อก, plus delete for own posts. */
export function ContentMenu(p: MenuProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [muted, setMuted] = useState(!!p.muted);
  const act = useAct(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [rs, rAct] = useActionState(reportAction, {});

  useEffect(() => {
    if (mode !== "menu") return;
    const close = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setMode(null); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mode]);

  const label = p.kind === "post" ? "โพสต์" : p.kind === "comment" ? "ความคิดเห็น" : "โปรไฟล์";
  return (
    <>
    <div className={s.menuWrap} ref={wrap}>
      <button type="button" className={s.menuBtn} aria-label={`เมนูเพิ่มเติมของ${label}`} aria-haspopup="menu" aria-expanded={mode === "menu"}
        onClick={() => setMode(mode === "menu" ? null : "menu")}>
        <EllipsisVertical aria-hidden />
      </button>
      {mode === "menu" && (
        <div className={s.menu} role="menu">
          {p.mine ? (
            <button type="button" role="menuitem" className={s.danger} onClick={() => setMode("delete")}><Trash2 size={20} aria-hidden />ลบโพสต์ของฉัน</button>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={() => setMode("report")}><Flag size={20} aria-hidden />รายงาน</button>
              <button type="button" role="menuitem" onClick={() => {
                const next = !muted; setMode(null);
                act.run(() => setMuteAction(p.personId, next), () => { setMuted(next); if (next) p.onGone?.("mute", p.personId, p.targetId); });
              }}>{muted ? <Volume2 size={20} aria-hidden /> : <VolumeX size={20} aria-hidden />}{muted ? "เลิกปิดเสียง" : "ปิดเสียง"}</button>
              <button type="button" role="menuitem" className={s.danger} onClick={() => setMode("block")}><Ban size={20} aria-hidden />บล็อก</button>
            </>
          )}
        </div>
      )}
    </div>
      {(mode === "report" || mode === "block" || mode === "delete" || act.msg) && (
        <div className={s.panel}>
          {act.msg?.ok && <Notice kind="ok">{act.msg.ok}</Notice>}
          {act.msg?.error && <Notice kind="error">{act.msg.error}</Notice>}
          {mode === "block" && (
            <div className="stack">
              <Notice kind="warn">บล็อก {p.personName}? เขาจะไม่เห็นโพสต์ของคุณและติดต่อคุณไม่ได้ และการเชื่อมต่อจะถูกยกเลิก</Notice>
              <div className={s.actions}>
                <button type="button" className={`btn btn-danger ${s.small}`} disabled={act.pending}
                  onClick={() => { setMode(null); act.run(() => blockAction(p.personId), () => p.onGone?.("block", p.personId, p.targetId)); }}>
                  <Ban size={20} aria-hidden />ยืนยันบล็อก</button>
                <button type="button" className={`btn btn-secondary ${s.small}`} onClick={() => setMode(null)}>ยกเลิก</button>
              </div>
            </div>
          )}
          {mode === "delete" && (
            <div className="stack">
              <Notice kind="warn">ลบโพสต์นี้? ลบแล้วกู้คืนไม่ได้</Notice>
              <div className={s.actions}>
                <button type="button" className={`btn btn-danger ${s.small}`} disabled={act.pending}
                  onClick={() => { setMode(null); act.run(() => deletePostAction(p.targetId), () => p.onGone?.("delete", p.personId, p.targetId)); }}>
                  <Trash2 size={20} aria-hidden />ยืนยันลบ</button>
                <button type="button" className={`btn btn-secondary ${s.small}`} onClick={() => setMode(null)}>ยกเลิก</button>
              </div>
            </div>
          )}
          {mode === "report" && (
            <form action={rAct} className="stack" noValidate>
              <h3>รายงาน{label}นี้</h3>
              <p className="meta" style={{ margin: 0 }}>ผู้ดูแลจะตรวจสอบ เราจะไม่บอกคนที่ถูกรายงานว่าใครเป็นคนรายงาน</p>
              {rs.error && <Notice kind="error">{rs.error}</Notice>}
              {rs.ok && <Notice kind="ok">{rs.ok}</Notice>}
              <input type="hidden" name="kind" value={p.kind} />
              <input type="hidden" name="target" value={p.targetId} />
              <fieldset className={s.radios} aria-describedby={errOf(rs, "reason") ? "reason-err" : undefined}>
                <legend>เหตุผลที่รายงาน <span className="req">(จำเป็น)</span></legend>
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className={s.radio}>
                    <input type="radio" name="reason" value={r.value} defaultChecked={rs.values?.reason === r.value} /><span>{r.label}</span>
                  </label>
                ))}
                {errOf(rs, "reason") && <span className="field-error" id="reason-err" role="alert">{errOf(rs, "reason")}</span>}
              </fieldset>
              <Field id={`note-${p.targetId}`} label="รายละเอียดเพิ่มเติม" hint={`ไม่เกิน ${LIMITS.note} ตัวอักษร`} error={errOf(rs, "note")}>
                <textarea id={`note-${p.targetId}`} name="note" className="input" defaultValue={rs.values?.note} {...ariaOf(rs, "note")} />
              </Field>
              <div className={s.actions}>
                <SubmitButton pendingText="กำลังส่ง…" variant="secondary"><Flag size={20} aria-hidden />ส่งรายงาน</SubmitButton>
                <button type="button" className={`btn btn-secondary ${s.small}`} onClick={() => setMode(null)}><X size={20} aria-hidden />ปิด</button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
