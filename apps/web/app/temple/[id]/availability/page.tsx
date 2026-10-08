import { FlashNotice } from "@/components/contact/flash";
import { gate, LoadError, BackToHub } from "@/components/monastic/parts";
import { loadBoard, loadCoarse } from "@/components/monastic/queries";
import { ClearRowButton, SetOtherForm } from "@/components/monastic/availability-forms";
import { Notice } from "@/components/ui";
import {
  COARSE_TH, MONASTIC_KIND_TH, bkkYmd, coarseBadge, countStates, fmtDateTime, reasonLabel, stateBadge, stateLabel, UNAVAIL_REASONS,
} from "@/lib/monastic";

export const dynamic = "force-dynamic";

export default async function Availability({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if (!g.ok) return g.page;
  const head = <><BackToHub id={id} /><div><h1>สถานะพระ</h1><p className="lead" style={{ margin: 0 }}>{g.access.name_th}</p></div></>;
  // Which view you get is decided by the database: the full board raises 42501 without availability.view at temple scope,
  // the coarse list raises 42501 without the coarse scope. The UI never guesses roles.
  let board, coarse = null;
  try {
    board = await loadBoard(g.s.authUserId, id);
    if (board.kind === "denied") coarse = await loadCoarse(g.s.authUserId, id);
  } catch (e) { console.error("[page:availability]", e); return <LoadError id={id} />; }

  if (board.kind === "board") {
    const counts = countStates(board.rows);
    const manualOf = new Map<string, typeof board.manual>();
    for (const m of board.manual) manualOf.set(m.person_id, [...(manualOf.get(m.person_id) ?? []), m]);
    const reasonOf = (c: string | null) => UNAVAIL_REASONS.find((r) => r.value === c)?.label ?? "";
    return (
      <main className="stack">
        {head}
        <FlashNotice />
        <section className="card" aria-label="จำนวนตามสถานะ" data-testid="counters">
          <h2>สรุปตามสถานะ · พระและสามเณร {board.rows.length} รูป</h2>
          <div className="kpis">
            {counts.map((c) => <div key={c.state} className="kpi" data-testid={`count-${c.state}`}><b>{c.n}</b><span className={`badge ${stateBadge(c.state)}`}>{stateLabel(c.state)}</span></div>)}
          </div>
          <p className="meta">ไม่ทราบ หมายถึงยังไม่มีเช็คอิน การตั้งสถานะ หรือตารางในช่วงนี้ ไม่ได้แปลว่าว่าง</p>
        </section>
        <section className="stack" aria-label="รายรูป" data-testid="board">
          <h2 style={{ margin: 0 }}>รายรูป</h2>
          {board.rows.length === 0 ? <div className="card empty"><h3>ยังไม่มีพระหรือสามเณรในทะเบียนของวัดนี้</h3></div> : (
            <ul className="list">
              {board.rows.map((r) => (
                <li key={r.person_id} className="card" data-testid={`board-${r.display_name}`}>
                  <div className="row"><h3>{r.display_name || "(ไม่มีชื่อ)"}</h3><span className={`badge ${stateBadge(r.state)}`}>{stateLabel(r.state)}</span></div>
                  <p className="meta">{MONASTIC_KIND_TH[r.monastic_kind] ?? ""}{reasonLabel(r.reason) ? ` · ${reasonLabel(r.reason)}` : ""}{r.until_at ? ` · ถึง ${fmtDateTime(r.until_at)}` : ""}</p>
                  {(manualOf.get(r.person_id) ?? []).map((m) => (
                    <div key={m.id} className="stack" style={{ marginTop: 8 }}>
                      <p className="meta" style={{ margin: 0 }}>ตั้งไม่ว่างไว้ ({reasonOf(m.reason_code)}) ถึง {fmtDateTime(m.valid_until)} · โดย{m.set_by_kind === "ADMIN" ? "เจ้าหน้าที่" : "ตัวท่านเอง"}</p>
                      <ClearRowButton templeId={id} rowId={m.id} />
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card stack" aria-label="ตั้งสถานะ ไม่ว่าง ให้พระรูปอื่น">
          <h2 style={{ margin: 0 }}>ตั้งว่า ไม่ว่าง ให้พระรูปอื่น</h2>
          <p className="meta">ตั้งให้รูปอื่นได้เฉพาะ ไม่ว่าง เท่านั้น ต้องระบุวันสุดท้าย และพระรูปนั้นจะเห็นสถานะนี้ในหน้า วันนี้ของฉัน</p>
          <SetOtherForm templeId={id} minDate={bkkYmd(new Date())} monks={board.rows.map((r) => ({ id: r.person_id, name: r.display_name }))} />
        </section>
      </main>
    );
  }

  if (coarse) {
    return (
      <main className="stack">
        {head}
        <Notice kind="info">บัญชีของคุณดูได้เฉพาะ ว่าง / ไม่ว่าง / ไม่ทราบ ไม่แสดงเหตุผลหรือสถานที่ของพระแต่ละรูป</Notice>
        <section className="stack" data-testid="coarse">
          {coarse.length === 0 ? <div className="card empty"><h3>ยังไม่มีพระหรือสามเณรในทะเบียนของวัดนี้</h3></div> : (
            <ul className="list">
              {coarse.map((r) => (
                <li key={r.person_id} className="card row" data-testid={`coarse-${r.display_name}`}>
                  <h3>{r.display_name || "(ไม่มีชื่อ)"}</h3><span className={`badge ${coarseBadge(r.coarse)}`}>{COARSE_TH[r.coarse] ?? "ไม่ทราบ"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="stack">
      {head}
      <Notice kind="info" >หน้านี้สำหรับเจ้าอาวาส เลขาฯ และพระที่ได้รับสิทธิ์ดูสถานะของพระ บัญชีของคุณยังไม่มีสิทธิ์นี้ ถ้าต้องการนิมนต์พระ กรุณาติดต่อเจ้าหน้าที่วัด</Notice>
    </main>
  );
}
