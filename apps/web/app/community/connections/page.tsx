import Link from "next/link";
import { Ineligible } from "@/components/community/ineligible";
import { ListActions } from "@/components/community/people";
import { Notice } from "@/components/ui";
import { shortId } from "@/lib/community";
import { checkGate, loadConnections, type ConnRow } from "../data";
import s from "@/components/community/community.module.css";

function Name({ id, name }: { id: string; name: string | null }) {
  return name ? <Link href={`/community/people/${id}`} className={s.itemName}>{name}</Link> : <span className={s.itemName}>บัญชีที่ใช้งานไม่ได้ในตอนนี้</span>;
}
function Group({ id, title, rows, kind, empty, sub }: { id: string; title: string; rows: ConnRow[]; kind: "incoming" | "outgoing" | "accepted"; empty: string; sub: (c: ConnRow) => string }) {
  return (
    <section className="stack" aria-labelledby={id}>
      <h2 id={id} style={{ margin: 0 }}>{title} ({rows.length})</h2>
      {rows.length === 0 ? <p className="lead" style={{ margin: 0 }}>{empty}</p> : (
        <ul className="list">{rows.map((c) => (
          <li key={c.other} className="card"><div className={s.item}>
            <div><Name id={c.other} name={c.name} /><p className={s.when}>{sub(c)}</p></div>
            <ListActions kind={kind} id={c.other} />
          </div></li>
        ))}</ul>
      )}
    </section>
  );
}

export default async function ConnectionsPage() {
  const g = await checkGate();
  if (!g.ok) return <Ineligible reason={g.reason} detail={g.suspendedReason} />;
  const data = await loadConnections(g.session.authUserId).catch((e) => { console.error("[community:connections]", e); return null; });
  if (!data) return <Notice kind="error">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้านี้ใหม่</Notice>;
  const incoming = data.conns.filter((c) => c.status === "pending" && !c.mine);
  const outgoing = data.conns.filter((c) => c.status === "pending" && c.mine);
  const accepted = data.conns.filter((c) => c.status === "accepted");
  return (
    <>
      <div>
        <h1>การเชื่อมต่อ</h1>
        <p className="lead" style={{ margin: 0 }}>คนที่เชื่อมต่อกันแล้วจึงจะแชทและเห็นข้อมูลระดับ “เฉพาะคนที่เชื่อมต่อ” ได้</p>
      </div>
      <Group id="in-h" title="คำขอที่รอคุณตอบ" rows={incoming} kind="incoming" empty="ไม่มีคำขอใหม่" sub={(c) => `ส่งมาเมื่อ ${c.when}`} />
      <Group id="out-h" title="คำขอที่คุณส่งไป" rows={outgoing} kind="outgoing" empty="ยังไม่มีคำขอที่รอการตอบรับ ค้นหาผู้คนเพื่อส่งคำขอเชื่อมต่อ" sub={(c) => `ส่งเมื่อ ${c.when} · รออีกฝ่ายตอบรับ`} />
      <Group id="ok-h" title="เชื่อมต่อกันแล้ว" rows={accepted} kind="accepted" empty="ยังไม่มีการเชื่อมต่อ" sub={(c) => `เชื่อมต่อเมื่อ ${c.when}`} />
      <section className="stack" aria-labelledby="bl-h">
        <h2 id="bl-h" style={{ margin: 0 }}>คนที่บล็อก ({data.blocked.length})</h2>
        {data.blocked.length === 0 ? <p className="lead" style={{ margin: 0 }}>คุณยังไม่ได้บล็อกใคร</p> : (
          <>
            <p className="meta" style={{ margin: 0 }}>เพื่อความเป็นส่วนตัว ระบบไม่แสดงชื่อของคนที่ถูกบล็อก แสดงเพียงรหัสสั้นและวันที่บล็อก</p>
            <ul className="list">{data.blocked.map((b) => (
              <li key={b.id} className="card"><div className={s.item}>
                <div><span className={s.itemName}>ผู้ใช้ที่ถูกบล็อก (รหัส {shortId(b.id)})</span><p className={s.when}>บล็อกเมื่อ {b.when}</p></div>
                <ListActions kind="blocked" id={b.id} />
              </div></li>
            ))}</ul>
          </>
        )}
      </section>
    </>
  );
}
