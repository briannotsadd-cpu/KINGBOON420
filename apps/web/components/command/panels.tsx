import type { ReactNode } from "react";
import { countText } from "@/lib/command";
import { stateLabel } from "@/lib/monastic";

/** One count. Unknown (null) renders "ไม่ทราบ" plus the reason the database gave, never 0. */
export function Tile({ label, value, note, id }: { label: string; value: unknown; note?: string | null; id?: string }) {
  const c = countText(value, note);
  return (
    <div className="kpi" data-testid={id ? `tile-${id}` : undefined} data-unknown={c.unknown ? "1" : "0"}>
      <b style={c.unknown ? { color: "var(--unknown)", fontSize: "1.25rem" } : undefined}>{c.text}</b>
      {label}
      {c.unknown && c.note && <span className="meta" style={{ display: "block" }}>เหตุผล: {c.note}</span>}
    </div>
  );
}

export const Panel = ({ title, id, children }: { title: string; id: string; children: ReactNode }) => (
  <section className="card" aria-label={title} data-testid={`panel-${id}`}>
    <h2>{title}</h2>
    {children}
  </section>
);

type J = Record<string, unknown> | null | undefined;
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function MonasticPanel({ m, inv }: { m: J; inv: J }) {
  const states = rec(rec(m).by_state);
  const order = ["AVAILABLE", "IN_TEMPLE", "ON_INVITATION", "CEREMONY", "TEACHING", "TRAVELING", "UNAVAILABLE", "PERSONAL", "REST"];
  const present = order.filter((k) => k in states);
  const other = Object.keys(states).filter((k) => !order.includes(k) && k !== "UNKNOWN");
  return (
    <Panel title="พระและสามเณร" id="monastic">
      <div className="kpis">
        <Tile label="รวมทั้งหมด" value={rec(m).total} id="monastic-total" />
        <Tile label="พระภิกษุ" value={rec(m).bhikkhu} />
        <Tile label="สามเณร" value={rec(m).samanera} />
      </div>
      <h3 style={{ marginTop: 16 }}>สถานะตอนนี้ (นับจำนวน ไม่แสดงรายบุคคล)</h3>
      <div className="kpis" style={{ marginTop: 8 }}>
        {[...present, ...other].map((k) => <Tile key={k} label={stateLabel(k)} value={states[k]} />)}
        <Tile label="ไม่ทราบสถานะ" value={states.UNKNOWN ?? 0} id="monastic-unknown" />
      </div>
      <h3 style={{ marginTop: 16 }}>กิจนิมนต์</h3>
      <div className="kpis" style={{ marginTop: 8 }}>
        <Tile label="วันนี้ยืนยันแล้ว" value={rec(inv).today_confirmed} />
        <Tile label="รอตัดสินใจ" value={rec(inv).waiting_decision} />
        <Tile label="พระแจ้งติดขัด" value={rec(inv).release_requests} />
      </div>
    </Panel>
  );
}

export const StaffPanel = ({ s }: { s: J }) => (
  <Panel title="เจ้าหน้าที่" id="staff">
    <div className="kpis">
      <Tile label="เจ้าหน้าที่ทั้งหมด" value={rec(s).total} />
      <Tile label="เช็คอินวันนี้" value={rec(s).checked_in_today} />
      <Tile label="ลา/ติดเวร" value={rec(s).on_leave} note={rec(s).note as string} id="staff-leave" />
    </div>
  </Panel>
);

export const QuestPanel = ({ q }: { q: J }) => (
  <Panel title="ภารกิจ (งานที่มอบหมาย)" id="quests">
    <div className="kpis">
      <Tile label="ทั้งหมด" value={rec(q).all} /><Tile label="เปิดอยู่" value={rec(q).active} /><Tile label="เสร็จแล้ว" value={rec(q).completed} />
      <Tile label="เลยกำหนด" value={rec(q).overdue} /><Tile label="ยังไม่มีคนรับ" value={rec(q).unassigned} /><Tile label="ติดขัด" value={rec(q).blocked} />
    </div>
  </Panel>
);

export const EventPanel = ({ e }: { e: J }) => (
  <Panel title="งานบุญและกิจกรรม" id="events">
    <div className="kpis">
      <Tile label="งานวันนี้" value={rec(e).today} /><Tile label="งานใน 48 ชั่วโมง" value={rec(e).next_48h} />
      <Tile label="งานที่ยังไม่พร้อม" value={rec(e).not_ready} /><Tile label="ยังขาดอาสาสมัคร (คน)" value={rec(e).volunteers_missing} />
    </div>
  </Panel>
);

export const FacilityPanel = ({ f }: { f: J }) => {
  const note = rec(f).note as string | undefined;
  return (
    <Panel title="อาคารและสถานที่" id="facility">
      <div className="kpis">
        <Tile label="อาคารที่ลงทะเบียน" value={rec(f).buildings} /><Tile label="อาคารที่ปิดอยู่" value={rec(f).buildings_closed} />
        <Tile label="ลานจอดรถ" value={rec(f).parking_lots} />
        <Tile label="งานซ่อม" value={rec(f).maintenance} note={note} id="maintenance" />
        <Tile label="ทรัพย์สิน" value={rec(f).assets} note={note} /><Tile label="ยานพาหนะ" value={rec(f).vehicles} note={note} />
        <Tile label="ครัว" value={rec(f).kitchen} note={note} /><Tile label="คลังพัสดุ" value={rec(f).inventory} note={note} />
      </div>
    </Panel>
  );
};

export const CommunityPanel = ({ c }: { c: J }) => (
  <Panel title="ชุมชน" id="community">
    <div className="kpis">
      <Tile label="ผู้ติดตามวัด" value={rec(c).followers} /><Tile label="อาสาสมัครที่ยืนยันแล้ว (งานข้างหน้า)" value={rec(c).volunteers_confirmed_upcoming} />
      <Tile label="แต้มที่มอบรวม 30 วัน" value={rec(c).points_issued_30d} /><Tile label="รอมอบของที่ระลึก" value={rec(c).redemptions_waiting} />
      <Tile label="แต้มรอตรวจ" value={rec(c).points_on_hold} /><Tile label="ข้อความถึงวัดที่ยังไม่ตอบ" value={rec(c).contact_unanswered} />
    </div>
    <p className="meta">ตัวเลขทั้งหมดเป็นยอดรวม ไม่แสดงแต้มรายบุคคล และไม่มีการจัดอันดับ</p>
  </Panel>
);
