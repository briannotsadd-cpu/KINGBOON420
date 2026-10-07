"use client";
import { useEffect, useState } from "react";
import { Notice } from "@/components/ui";

const EVT = "inbox-flash";
/** Keeps a success message visible after router.refresh() moves the thread out of the current tab (its form unmounts). */
export function setFlash(msg: string) { window.dispatchEvent(new CustomEvent<string>(EVT, { detail: msg })); }
export function FlashNotice() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMsg((e as CustomEvent<string>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  return msg ? <div role="status" aria-live="polite"><Notice kind="ok">{msg}</Notice></div> : null;
}
