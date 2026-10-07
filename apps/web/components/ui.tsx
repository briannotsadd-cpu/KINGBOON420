"use client";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function SubmitButton({ children, pendingText, variant = "primary", block, name, value }:
  { children: ReactNode; pendingText: string; variant?: "primary" | "secondary" | "danger"; block?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} className={`btn btn-${variant}${block ? " btn-block" : ""}`} disabled={pending} aria-busy={pending}>
      {pending ? <><span className="spinner" aria-hidden style={{ width: 22, height: 22 }} />{pendingText}</> : children}
    </button>
  );
}

export function Field({ id, label, required, hint, error, children }:
  { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} {required ? <span className="req">(จำเป็น)</span> : <span className="hint">(ไม่บังคับ)</span>}</label>
      {hint && <span className="hint" id={`${id}-hint`}>{hint}</span>}
      {children}
      {error && <span className="field-error" id={`${id}-err`} role="alert"><AlertCircle size={20} aria-hidden />{error}</span>}
    </div>
  );
}

const ICON = { info: Info, ok: CheckCircle2, error: AlertCircle, warn: TriangleAlert };
export function Notice({ kind, children }: { kind: keyof typeof ICON; children: ReactNode }) {
  const Icon = ICON[kind];
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={24} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
      <div>{children}</div>
    </div>
  );
}
