"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActResult, CState } from "@/app/community/actions";

/** Copy of the forms.tsx pattern: after a successful save on the same page, re-render the server parts while keeping this
 *  form mounted so its success message stays visible. */
export function useRefreshOnOk(s: CState) {
  const router = useRouter();
  const last = useRef<CState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; router.refresh(); } }, [s, router]);
}

/** Run a no-form server action (button click) and keep its message; refresh the server parts on success when asked. */
export function useAct(refreshOnOk = true) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActResult | null>(null);
  const last = useRef<ActResult | null>(null);
  // Same idea as useRefreshOnOk: refresh from an effect (after the message has rendered), not from inside the action transition.
  useEffect(() => { if (refreshOnOk && msg?.ok && last.current !== msg) { last.current = msg; router.refresh(); } }, [msg, refreshOnOk, router]);
  const run = (fn: () => Promise<ActResult>, after?: (r: ActResult) => void) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r);
      if (r.ok) after?.(r);
    });
  };
  return { pending, msg, run, clear: () => setMsg(null) };
}

export const errOf = (s: CState, k: string) => s.fieldErrors?.[k];
export const ariaOf = (s: CState, k: string) => ({ "aria-invalid": errOf(s, k) ? true : undefined, "aria-describedby": errOf(s, k) ? `${k}-err` : `${k}-hint` });
