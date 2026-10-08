"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setFlash } from "@/components/contact/flash";
import type { MonasticState } from "@/app/temple/[id]/monastic-actions";

/** After a successful action on the same page, re-render the server parts (statuses, lists) while this form stays
 *  mounted so its success message stays visible. (Same hook as components/forms.tsx; no revalidatePath anywhere.) */
export function useRefreshOnOk(s: MonasticState) {
  const router = useRouter();
  const last = useRef<MonasticState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; router.refresh(); } }, [s, router]);
}

/** For forms whose row leaves the page after refresh (e.g. clearing a status): the message moves to the page-level <FlashNotice/>. */
export function useFlashRefreshOnOk(s: MonasticState) {
  const router = useRouter();
  const last = useRef<MonasticState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; setFlash(s.ok); router.refresh(); } }, [s, router]);
}

export const err = (s: MonasticState, k: string) => s.fieldErrors?.[k];
export const aria = (s: MonasticState, k: string) => ({
  "aria-invalid": err(s, k) ? true : undefined, "aria-describedby": err(s, k) ? `${k}-err` : `${k}-hint`,
});

/** React resets an uncontrolled <select>/<checkbox> to its initial option after an action; remounting it when the kept value changes
 *  makes "keep input on error" work for them too (text inputs and textareas already follow defaultValue). */
export const kv = (s: MonasticState, k: string) => `${k}:${s.values?.[k] ?? ""}`;
