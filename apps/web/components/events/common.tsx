"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Notice } from "@/components/ui";
import { setFlash } from "@/components/contact/flash";
import { eventOpAction, type EventState } from "@/app/temple/[id]/events/actions";

/** After a successful save on the same page, re-render the server parts (lists, readiness) while this form stays
 *  mounted so its success message stays visible. */
export function useRefreshOnOk(s: EventState) {
  const router = useRouter();
  const last = useRef<EventState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; setFlash(s.ok); router.refresh(); } }, [s, router]);
}

/** Labelled field with hint (18px) and error. Same look as the shared Field, with larger hint text. */
export function EField({ id, label, required, hint, error, children }:
  { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} {required ? <span className="req">(จำเป็น)</span> : <span className="hint" style={{ fontSize: "1rem" }}>(ไม่บังคับ)</span>}</label>
      {hint && <span className="hint" style={{ fontSize: "1rem" }} id={`${id}-hint`}>{hint}</span>}
      {children}
      {error && <span className="field-error" id={`${id}-err`} role="alert"><AlertCircle size={20} aria-hidden />{error}</span>}
    </div>
  );
}
export const aria = (id: string, error?: string) => ({ "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-err` : `${id}-hint` });

/** A form that posts to eventOpAction with fixed hidden fields. Stays mounted after success (message stays, lists refresh). */
export function OpForm({ hidden, children, noticeAbove = true }: { hidden: Record<string, string>; children: (s: EventState) => ReactNode; noticeAbove?: boolean }) {
  const [s, act] = useActionState(eventOpAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack" noValidate>
      {noticeAbove && s.error && <Notice kind="error">{s.error}</Notice>}
      {noticeAbove && s.ok && <Notice kind="ok">{s.ok}</Notice>}
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children(s)}
    </form>
  );
}
