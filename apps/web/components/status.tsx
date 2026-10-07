import { Clock, CheckCircle2, XCircle, PauseCircle } from "lucide-react";
const MAP: Record<string, { cls: string; label: string; I: typeof Clock }> = {
  pending: { cls: "b-warn", label: "รออนุมัติ", I: Clock },
  approved: { cls: "b-ok", label: "อนุมัติแล้ว", I: CheckCircle2 },
  rejected: { cls: "b-bad", label: "ไม่อนุมัติ", I: XCircle },
  suspended: { cls: "b-closed", label: "ระงับชั่วคราว", I: PauseCircle },
};
export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? MAP.pending;
  return <span className={`badge ${m.cls}`}><m.I size={18} aria-hidden />{m.label}</span>;
}
