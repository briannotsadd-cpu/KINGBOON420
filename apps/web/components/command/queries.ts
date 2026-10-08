import "server-only";
import { asUser } from "@/lib/db";
import { parseCommand, type CommandJson } from "@/lib/command";
import type { ChecklistRow } from "@/components/helpers/event-checklist";

export interface SummaryLine { line: string; severity: string }
export interface ConflictRow {
  person_id: string; display_name: string; code: string; severity: string; a_title: string; a_start: Date; b_title: string; b_start: Date;
}
export interface NextEvent { id: string; title: string; starts_at: Date }

export interface CommandData {
  cc: CommandJson | null; summary: SummaryLine[]; fullConflicts: boolean;
  conflicts: ConflictRow[] | null;          // null = this part could not be loaded
  nextEvent: NextEvent | null; checklist: ChecklistRow[] | null;
}
const denied = (e: unknown) => (e as { code?: string }).code === "42501";

/** Each panel loads in its own transaction: one failing source degrades one card, not the page. */
export async function commandData(authUserId: string, templeId: string): Promise<CommandData> {
  const cc = parseCommand((await asUser(authUserId, (c) => c.query<{ j: unknown }>("select app.command_center($1) as j", [templeId]))).rows[0]?.j);
  const summary = await asUser(authUserId, async (c) => (await c.query<SummaryLine>("select * from app.daily_summary($1)", [templeId])).rows).catch((e) => { console.error("[command:summary]", e); return [] as SummaryLine[]; });
  let conflicts: ConflictRow[] | null = null, fullConflicts = false;
  try {
    const r = await asUser(authUserId, async (c) => ({
      full: (await c.query<{ f: boolean }>("select app.has_permission($1, 'availability.view', 'T') as f", [templeId])).rows[0].f,
      rows: (await c.query<ConflictRow>("select * from app.schedule_conflicts($1, now(), now() + interval '7 days')", [templeId])).rows,
    }));
    conflicts = r.rows; fullConflicts = r.full;
  } catch (e) { if (!denied(e)) console.error("[command:conflicts]", e); }
  let nextEvent: NextEvent | null = null, checklist: ChecklistRow[] | null = null;
  try {
    nextEvent = (await asUser(authUserId, async (c) => (await c.query<NextEvent>(
      `select id, title, starts_at from public.events
        where temple_id = $1 and status in ('PLANNING','APPROVED','LIVE') and ends_at > now() and app.has_permission($1, 'event.manage')
        order by starts_at limit 1`, [templeId])).rows[0])) ?? null;
    if (nextEvent) {
      const ev = nextEvent;
      checklist = await asUser(authUserId, async (c) => (await c.query<ChecklistRow>("select * from app.event_checklist($1, $2)", [templeId, ev.id])).rows);
    }
  } catch (e) { console.error("[command:checklist]", e); }
  return { cc, summary, fullConflicts, conflicts, nextEvent, checklist };
}
