"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, MessageCircle, UserMinus, UserPlus, X, Undo2 } from "lucide-react";
import { Notice } from "@/components/ui";
import {
  removeConnectionAction, requestConnectionAction, respondConnectionAction, unblockAction, liftSuspensionAction,
  type ActResult,
} from "@/app/community/actions";
import type { Card } from "@/app/community/data";
import { useAct } from "./hooks";
import { ContentMenu } from "./content-menu";
import s from "./community.module.css";

function Msg({ r }: { r: ActResult | null }) {
  if (!r) return null;
  return r.error ? <Notice kind="error">{r.error}</Notice> : r.ok ? <Notice kind="ok">{r.ok}</Notice> : null;
}
const btn = (primary: boolean) => `btn ${primary ? "btn-primary" : "btn-secondary"}`;

/** Connection buttons + menu for someone else's profile. Exactly one primary action at a time. */
export function PersonActions({ card }: { card: Card }) {
  const act = useAct(true);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const id = card.person_id;
  const status = card.connection_status;
  return (
    <div className="stack">
      <Msg r={act.msg} />
      <div className={s.actions}>
        {!status && (
          <button type="button" className={btn(true)} disabled={act.pending} onClick={() => act.run(() => requestConnectionAction(id))}>
            <UserPlus aria-hidden />ขอเชื่อมต่อ</button>
        )}
        {status === "pending" && card.i_requested && (
          <>
            <span className="badge b-warn">ส่งคำขอแล้ว รออีกฝ่ายตอบรับ</span>
            <button type="button" className={btn(false)} disabled={act.pending} onClick={() => act.run(() => removeConnectionAction(id))}>
              <Undo2 aria-hidden />ยกเลิกคำขอ</button>
          </>
        )}
        {status === "pending" && !card.i_requested && (
          <>
            <button type="button" className={btn(true)} disabled={act.pending} onClick={() => act.run(() => respondConnectionAction(id, true))}>
              <Check aria-hidden />ยอมรับ</button>
            <button type="button" className={btn(false)} disabled={act.pending} onClick={() => act.run(() => respondConnectionAction(id, false))}>
              <X aria-hidden />ปฏิเสธ</button>
          </>
        )}
        {status === "accepted" && (
          <>
            {card.can_message && <Link className={btn(false)} href={`/chat/new?with=${id}`}><MessageCircle aria-hidden />แชท</Link>}
            {!confirmRemove
              ? <button type="button" className={btn(false)} onClick={() => setConfirmRemove(true)}><UserMinus aria-hidden />ยกเลิกการเชื่อมต่อ</button>
              : <>
                  <button type="button" className="btn btn-danger" disabled={act.pending} onClick={() => { setConfirmRemove(false); act.run(() => removeConnectionAction(id)); }}>
                    <UserMinus aria-hidden />ยืนยันยกเลิกการเชื่อมต่อ</button>
                  <button type="button" className={btn(false)} onClick={() => setConfirmRemove(false)}>ไม่ยกเลิก</button>
                </>}
          </>
        )}
        <ContentMenu kind="person" targetId={id} personId={id} personName={card.display_name} muted={card.is_muted} />
      </div>
    </div>
  );
}

/** A small action button used inside connection lists. */
export function ListActions({ kind, id }: { kind: "incoming" | "outgoing" | "accepted" | "blocked"; id: string }) {
  const act = useAct(true);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <Msg r={act.msg} />
      <div className={s.actions}>
        {kind === "incoming" && (
          <>
            <button type="button" className={`${btn(false)} ${s.small}`} disabled={act.pending} onClick={() => act.run(() => respondConnectionAction(id, true))}><Check size={20} aria-hidden />ยอมรับ</button>
            <button type="button" className={`${btn(false)} ${s.small}`} disabled={act.pending} onClick={() => act.run(() => respondConnectionAction(id, false))}><X size={20} aria-hidden />ปฏิเสธ</button>
          </>
        )}
        {kind === "outgoing" && (
          <button type="button" className={`${btn(false)} ${s.small}`} disabled={act.pending} onClick={() => act.run(() => removeConnectionAction(id))}><Undo2 size={20} aria-hidden />ยกเลิกคำขอ</button>
        )}
        {kind === "accepted" && (
          <button type="button" className={`${btn(false)} ${s.small}`} disabled={act.pending} onClick={() => act.run(() => removeConnectionAction(id))}><UserMinus size={20} aria-hidden />ยกเลิกการเชื่อมต่อ</button>
        )}
        {kind === "blocked" && (
          <button type="button" className={`${btn(false)} ${s.small}`} disabled={act.pending} onClick={() => act.run(() => unblockAction(id))}><Undo2 size={20} aria-hidden />ยกเลิกการบล็อก</button>
        )}
      </div>
    </div>
  );
}

export function LiftButton({ id }: { id: string }) {
  const act = useAct(false); // keep the confirmation visible; the list updates on the next visit
  return (
    <div className="stack" style={{ gap: 8 }}>
      <Msg r={act.msg} />
      {!act.msg?.ok && (
        <button type="button" className={`${btn(false)} ${s.small}`} disabled={act.pending} onClick={() => act.run(() => liftSuspensionAction(id))}>ยกเลิกการระงับ</button>
      )}
    </div>
  );
}
