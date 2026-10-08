import { GATES, GATE_RESULT_TH, GATE_RESULT_TONE, GATE_TH, READINESS_REASON_TH, READINESS_TH, READINESS_TONE, type ReadinessView } from "@/lib/events";
import { Chip, sub } from "./chip";

/** Readiness. Gates / staffing / task weight are shown only if the database returned them (managers and staff). */
export function ReadinessPanel({ view, status }: { view: ReadinessView | null; status: string }) {
  if (!view) return null;
  const d = view.detail;
  return (
    <section className="card" aria-labelledby="ready-h" data-testid="readiness-panel">
      <h2 id="ready-h">ความพร้อมของงาน</h2>
      {!view.state ? (
        <p style={{ margin: 0 }}>{status === "CANCELLED" ? "งานนี้ถูกยกเลิก จึงไม่วัดความพร้อม" : READINESS_REASON_TH[view.reason ?? "NOT_PLANNED"]}</p>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <Chip tone={READINESS_TONE[view.state]} testid="readiness-state" state={view.state}>{READINESS_TH[view.state]}</Chip>
            {view.percent !== null && <b style={{ fontSize: "1.35rem" }} data-testid="readiness-percent">{view.percent}%</b>}
          </div>
          {view.percent !== null && (
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={view.percent} aria-label="ความพร้อม"
              style={{ height: 14, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden", border: "1px solid var(--line)" }}>
              <div style={{ width: `${view.percent}%`, height: "100%", background: "var(--primary)" }} />
            </div>
          )}
          {view.reason && READINESS_REASON_TH[view.reason] && <p style={{ margin: 0 }}>{READINESS_REASON_TH[view.reason]}</p>}
          {view.frozen && <p style={sub}>ค่านี้ถูกบันทึกไว้ ณ ตอนเริ่มงาน ไม่เปลี่ยนอีก</p>}
          {d ? (
            <>
              <ul className="list" style={{ gap: 8 }} aria-label="เงื่อนไขบังคับ">
                {GATES.map((g) => (
                  <li key={g} className="row" data-testid={`gate-${g}`} data-result={d.gates[g]}>
                    <span>{GATE_TH[g]}</span>
                    <Chip tone={GATE_RESULT_TONE[d.gates[g]]}>{GATE_RESULT_TH[d.gates[g]]}</Chip>
                  </li>
                ))}
              </ul>
              <ul className="details" style={{ fontSize: "1rem" }}>
                {d.staffing !== null && <li data-testid="staffing-pct">กำลังคน: {d.staffing}% ของที่ต้องการ</li>}
                {d.tasksTotal !== null && <li data-testid="task-weight">งานย่อยที่ตรวจรับแล้ว: {d.tasksDone ?? 0} จาก {d.tasksTotal} คะแนนความสำคัญ</li>}
                {d.volunteerGap !== null && <li data-testid="volunteer-gap">ยังขาดอาสาสมัคร: {d.volunteerGap} คน</li>}
              </ul>
            </>
          ) : (
            <p style={sub}>แสดงเฉพาะสถานะและเปอร์เซ็นต์ รายละเอียดเงื่อนไขเห็นได้เฉพาะทีมจัดการงาน</p>
          )}
        </div>
      )}
    </section>
  );
}
