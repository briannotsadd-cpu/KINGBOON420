import { Lock, AlertTriangle, PencilLine } from "lucide-react";
import { FieldCandidate } from "./field-card";
import { RecordFieldForm } from "./forms";
import type { CatalogRow, FieldRow } from "@/lib/db";

const CAT_TH: Record<string, string> = { identity: "ตัวตนของวัด", location: "ที่ตั้ง", about: "ประวัติ", people: "บุคคล", contact: "การติดต่อ", schedule: "เวลาและตาราง", finance: "การเงิน" };

export function FieldList({ templeId, catalog, rows, back, canTemple, isAdmin, officialOnly }:
  { templeId: string; catalog: CatalogRow[]; rows: FieldRow[]; back: string; canTemple: boolean; isAdmin: boolean; officialOnly?: boolean }) {
  const cats = [...new Set(catalog.map((c) => c.category))];
  return (
    <div>
      {cats.map((cat) => (
        <section key={cat} aria-label={CAT_TH[cat]}>
          <h2 className="group-h">{CAT_TH[cat] ?? cat}</h2>
          <div className="stack">
            {catalog.filter((c) => c.category === cat).map((c) => {
              const live = rows.filter((r) => r.field_key === c.field_key && !["REJECTED", "OUTDATED", "SUSPENDED"].includes(r.effective_status));
              const old = rows.filter((r) => r.field_key === c.field_key && ["REJECTED", "OUTDATED", "SUSPENDED"].includes(r.effective_status));
              return (
                <article key={c.field_key} className="card field-block" id={c.field_key}>
                  <div className="row">
                    <h3>{c.label_th}</h3>
                    <span className="meta" style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
                      {c.risk === "critical" && <><Lock size={18} aria-hidden />ต้องยืนยันเป็นพิเศษ</>}
                      {c.required_for_publish && <>จำเป็นก่อนเปิดใช้งาน</>}
                    </span>
                  </div>
                  {live.length === 0 ? (
                    <p className="meta" style={{ margin: 0 }}><AlertTriangle size={18} aria-hidden /> ยังไม่มีข้อมูล — ยังไม่ได้ตรวจสอบ (NOT VERIFIED)
                      {c.official_source_expected ? " · ควรตรวจกับทะเบียนวัด" : " · ต้องให้วัดเป็นผู้ให้ข้อมูล"}</p>
                  ) : live.map((r) => <FieldCandidate key={r.id} r={r} back={back} canTemple={canTemple} isAdmin={isAdmin} />)}
                  {old.length > 0 && (
                    <details className="more"><summary>ข้อมูลที่ไม่ใช้แล้ว ({old.length})</summary>
                      <div className="stack">{old.map((r) => <FieldCandidate key={r.id} r={r} back={back} canTemple={false} isAdmin={false} />)}</div>
                    </details>
                  )}
                  {(canTemple || isAdmin) && (
                    <details className="more">
                      <summary><PencilLine size={18} aria-hidden style={{ marginRight: 6 }} />{officialOnly ? "บันทึกข้อมูลจากแหล่งทางราชการ" : live.length ? "แก้ไข / เพิ่มข้อมูลจากแหล่งอื่น" : "เพิ่มข้อมูล"}</summary>
                      <RecordFieldForm templeId={templeId} fieldKey={c.field_key} label={c.label_th} back={back} officialOnly={officialOnly} />
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ReadinessList({ checks }: { checks: { check_key: string; label_th: string; passed: boolean; detail: string }[] }) {
  return (
    <ul className="check-list">
      {checks.map((c) => (
        <li key={c.check_key}><span className={`badge ${c.passed ? "b-ok" : "b-bad"}`}>{c.passed ? "ผ่าน" : "ยังไม่ผ่าน"}</span>
          <span><b>{c.label_th}</b>{c.detail ? <><br /><span className="hint">{c.detail}</span></> : null}</span></li>
      ))}
    </ul>
  );
}
