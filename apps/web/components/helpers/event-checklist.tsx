import { Check, X } from "lucide-react";

export interface ChecklistRow { item: string; done: boolean; detail: string | null }

/** Rule-based checklist of what an event still needs (rows come from app.event_checklist). Display only: it never changes the event. */
export function EventChecklist({ rows, title }: { rows: ChecklistRow[]; title?: string }) {
  const missing = rows.filter((r) => !r.done).length;
  return (
    <div data-testid="event-checklist">
      {title && <h3>{title}</h3>}
      <p className="meta" style={{ margin: "4px 0 8px" }}>
        {missing === 0 ? "ครบทุกข้อตามรายการตรวจ" : `ยังไม่ครบ ${missing} ข้อ จากทั้งหมด ${rows.length} ข้อ`} · สร้างจากการนับข้อมูลตามกฎ ไม่ได้ใช้ AI
      </p>
      <ul className="check-list">
        {rows.map((r) => (
          <li key={r.item} data-done={r.done ? "1" : "0"}>
            {r.done ? <Check size={24} aria-label="ครบแล้ว" style={{ color: "var(--ok)", flexShrink: 0 }} /> : <X size={24} aria-label="ยังไม่ครบ" style={{ color: "var(--bad)", flexShrink: 0 }} />}
            <span>{r.item}{r.detail ? <span className="meta"> — {r.detail}</span> : null}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
