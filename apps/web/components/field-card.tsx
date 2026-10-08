import { CheckCircle2, Clock, AlertTriangle, XCircle, FileSearch, Lock, Link2, FileText, Bot } from "lucide-react";
import { CandidateActions, type CandidateOp } from "./forms";
import { STATUS_TH, TIER_TH, formatDateTh, formatValue, type Status } from "@/lib/verification";
import type { FieldRow } from "@/lib/db";

const TONE: Record<string, string> = { ok: "b-ok", warn: "b-warn", bad: "b-bad", closed: "b-closed", unknown: "b-unknown" };
const ICON: Record<string, typeof Clock> = { check: CheckCircle2, clock: Clock, alert: AlertTriangle, x: XCircle, search: FileSearch, file: FileSearch, "file-check": FileSearch };

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_TH[status as Status] ?? STATUS_TH.DISCOVERED;
  const I = ICON[m.icon] ?? Clock;
  return <span className={`badge ${TONE[m.tone]}`}><I size={18} aria-hidden />{m.label}</span>;
}

export function FieldCandidate({ r, back, canTemple, isAdmin }: { r: FieldRow; back: string; canTemple: boolean; isAdmin: boolean }) {
  const st = r.effective_status;
  const critical = r.risk === "critical";
  const ops: CandidateOp[] = [];
  if (canTemple && st === "WAITING_TEMPLE_CONFIRMATION")
    ops.push({ op: "confirm", label: critical && r.first_approved_by ? "เจ้าอาวาสยืนยัน (ขั้นที่ 2)" : critical ? "อนุมัติขั้นที่ 1" : "✓ ยืนยันว่าถูกต้อง" });
  if (canTemple && st === "CONFLICT") ops.push({ op: "resolve", label: "เลือกข้อมูลนี้" });
  if (canTemple && (["SOURCE_VERIFIED", "CROSS_CHECKED"].includes(st) || (st === "SOURCE_FOUND" && r.source_tier === 2)))
    ops.push({ op: "send", label: "ตรวจและยืนยันข้อมูลนี้", variant: "secondary" });
  if (canTemple && ["TEMPLE_CONFIRMED", "PUBLISHED", "VERIFICATION_EXPIRED"].includes(st)) {
    // critical fields: re-confirmation takes two people (step 1, then the abbot) — migration 0013
    const step2 = critical && r.first_approved_at && r.verified_at && new Date(r.first_approved_at) > new Date(r.verified_at);
    ops.push({ op: "reconfirm", label: step2 ? "เจ้าอาวาสยืนยันซ้ำ (ขั้นที่ 2)" : critical ? "ยืนยันซ้ำ ขั้นที่ 1" : "ยืนยันซ้ำว่ายังถูกต้อง", variant: "secondary" });
  }
  if (isAdmin && st === "SOURCE_FOUND" && r.source_tier === 1) ops.push({ op: "verify_source", label: "ตรวจหลักฐานแล้ว ถูกต้อง" });
  if (isAdmin && st === "SOURCE_VERIFIED") ops.push({ op: "cross_check", label: "ตรวจเทียบหลายแหล่งแล้ว", variant: "secondary" });
  return (
    <div className="card" style={{ boxShadow: "none" }} data-testid={`cand-${r.field_key}`}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <p className="big" style={{ margin: 0, wordBreak: "break-word" }}>{formatValue(r.value)}</p>
        <StatusPill status={st} />
      </div>
      <ul className="details">
        <li>{r.is_ai_assisted ? <Bot size={18} aria-hidden /> : <FileText size={18} aria-hidden />}
          ที่มา: {r.source_name} · {TIER_TH[r.source_tier]}{r.is_ai_assisted ? " · AI ช่วยหา (ยืนยันไม่ได้)" : ""}</li>
        {r.source_url && <li><Link2 size={18} aria-hidden /><a href={r.source_url} target="_blank" rel="noreferrer noopener">{r.source_url}</a></li>}
        {r.source_document && <li><FileText size={18} aria-hidden />เอกสาร: {r.source_document}</li>}
        {r.evidence && <li><FileSearch size={18} aria-hidden />หลักฐาน: “{r.evidence}”</li>}
        <li><Clock size={18} aria-hidden />บันทึกเมื่อ {formatDateTh(r.created_at)}
          {r.verified_at ? ` · ยืนยันล่าสุด ${formatDateTh(r.verified_at)}` : ""}
          {r.verification_expires_at ? ` · ต้องตรวจซ้ำก่อน ${formatDateTh(r.verification_expires_at)}` : ""}</li>
        {r.status_reason && <li><AlertTriangle size={18} aria-hidden />{r.status_reason}</li>}
        {critical && <li><Lock size={18} aria-hidden />ข้อมูลสำคัญ ต้องยืนยัน 2 ขั้น: ผู้ดูแลวัด แล้วเจ้าอาวาส (คนละคน)
          {r.first_approved_by ? " — ผ่านขั้นที่ 1 แล้ว" : ""}</li>}
      </ul>
      <CandidateActions valueId={r.id} back={back} ops={ops}
        needsReason={canTemple && st === "CONFLICT" ? "เหตุผลที่เลือกข้อมูลนี้" : undefined}
        canReject={(canTemple || isAdmin) && !["REJECTED", "OUTDATED", "SUSPENDED"].includes(st)} />
    </div>
  );
}
