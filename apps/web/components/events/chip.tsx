import type { ReactNode } from "react";
import { READINESS_TH, READINESS_TONE, type ReadinessView, type Tone } from "@/lib/events";

/** Status pill. Text is at least 18px (the shared .badge is smaller). */
export function Chip({ tone, children, testid, state }: { tone: Tone; children: ReactNode; testid?: string; state?: string }) {
  return <span className={`badge b-${tone}`} style={{ fontSize: "1rem" }} data-testid={testid} data-state={state}>{children}</span>;
}

export const sub = { color: "var(--muted)", fontSize: "1rem", margin: "4px 0 0" } as const;

/** Readiness chip for lists: "พร้อม 100%" or nothing for a draft. */
export function ReadinessChip({ view }: { view: ReadinessView | null }) {
  if (!view?.state) return null;
  return (
    <Chip tone={READINESS_TONE[view.state]} testid="readiness-chip" state={view.state}>
      {READINESS_TH[view.state]}{view.percent !== null ? ` ${view.percent}%` : ""}
    </Chip>
  );
}
