import type { SummaryLine, ConflictRow } from "./queries";
import { DAILY_SUMMARY_NOTE, DAILY_SUMMARY_TITLE, conflictLabel, conflictSuggestion, severityLabel, severityTone, sortConflicts } from "@/lib/command";
import { fmtDateTime } from "@/lib/monastic";

const SEV_TONE: Record<string, string> = { warn: "b-warn", info: "b-unknown" };

export function DailySummary({ lines }: { lines: SummaryLine[] }) {
  return (
    <section className="card" aria-label={DAILY_SUMMARY_TITLE} data-testid="daily-summary">
      <h2>{DAILY_SUMMARY_TITLE}</h2>
      <p className="meta" style={{ marginTop: 0 }}>{DAILY_SUMMARY_NOTE}</p>
      {lines.length === 0 ? <p>วันนี้ยังไม่มีเรื่องที่ต้องแจ้ง จากข้อมูลที่ระบบมี</p> : (
        <ul className="check-list" style={{ marginTop: 8 }}>
          {lines.map((l, i) => (
            <li key={i}><span className={`badge ${SEV_TONE[l.severity] ?? "b-closed"}`}>{l.severity === "warn" ? "ควรดู" : "ข้อมูล"}</span><span>{l.line}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ConflictsCard({ rows, full }: { rows: ConflictRow[] | null; full: boolean }) {
  return (
    <section className="card" aria-label="ตารางที่ซ้อนกันใน 7 วันข้างหน้า" data-testid="conflicts">
      <h2>ตารางที่ซ้อนกัน ใน 7 วันข้างหน้า</h2>
      <p className="meta" style={{ marginTop: 0 }}>เป็นข้อเสนอแนะให้คนตัดสินใจ ระบบไม่ได้แก้ตารางให้เอง{full ? "" : " · แสดงเฉพาะส่วนที่คุณมีสิทธิ์เห็น"}</p>
      {rows === null ? <p>ตอนนี้ดึงข้อมูลส่วนนี้ไม่ได้ กรุณาโหลดหน้านี้ใหม่</p>
        : rows.length === 0 ? <p data-testid="no-conflicts">ไม่พบตารางที่ซ้อนกันใน 7 วันข้างหน้า</p> : (
          <ul className="list" style={{ marginTop: 8 }}>
            {sortConflicts(rows).map((r, i) => (
              <li key={i} data-testid="conflict-row" style={{ borderTop: i ? "1px solid var(--line)" : undefined, paddingTop: i ? 14 : 0 }}>
                <div className="row">
                  <h3>{conflictLabel(r.code)}</h3>
                  <span className={`badge ${severityTone(r.severity)}`}>{severityLabel(r.severity)}</span>
                </div>
                <p style={{ margin: "4px 0" }}>{r.display_name}: {r.a_title} ({fmtDateTime(new Date(r.a_start))}) กับ {r.b_title} ({fmtDateTime(new Date(r.b_start))})</p>
                <p className="meta">{conflictSuggestion(r.code)}</p>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
