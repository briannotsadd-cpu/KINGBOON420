"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/ui";
import type { PointsState } from "@/app/temple/[id]/points-actions";

const EVT = "points-flash";
/** Keeps a success message visible after router.refresh() removes the row that was acted on (its form unmounts). */
export function setFlash(msg: string) { window.dispatchEvent(new CustomEvent<string>(EVT, { detail: msg })); }
export function FlashNotice() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMsg((e as CustomEvent<string>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return msg ? <div role="status" aria-live="polite" data-testid="flash"><Notice kind="ok">{msg}</Notice></div> : null;
}

/** After a successful action: re-render the server parts, and (flash) keep the message at page level. */
export function useRefreshOnOk(s: PointsState, flash = false) {
  const router = useRouter();
  const [last, setLast] = useState<PointsState | null>(null);
  useEffect(() => {
    if (s.ok && last !== s) { setLast(s); if (flash) setFlash(s.ok); router.refresh(); }
  }, [s, last, flash, router]);
}

export const err = (s: PointsState, k: string) => s.fieldErrors?.[k];
export const aria = (s: PointsState, k: string) => ({
  "aria-invalid": err(s, k) ? true : undefined, "aria-describedby": err(s, k) ? `${k}-err` : `${k}-hint`,
});
/** React resets uncontrolled <select>/checkbox after an action; remounting on the kept value keeps the user's choice. */
export const kv = (s: PointsState, k: string) => `${k}:${s.values?.[k] ?? ""}`;
