import Link from "next/link";
import { notFound } from "next/navigation";
import { gate, LoadError } from "@/components/monastic/parts";
import { UUID, invitationDetail, suggestTeam } from "@/components/monastic/queries";
import { InvitationActions, type Cand, type Cands } from "@/components/monastic/invitation-actions";
import { Notice } from "@/components/ui";
import {
  INV_STATUS_TH, RESPONSE_TH, declineLabel, fmtDateTime, fmtDuration, groupSuggestions, invBadge, teamWarnings, transportLabel,
  type SuggestRow,
} from "@/lib/monastic";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ id: string; invId: string }> }) {
  const { id, invId } = await params;
  if (!UUID.test(invId)) notFound();
  const g = await gate(id);
  if (!g.ok) return g.page;
  const back = <Link className="back" href={`/temple/${id}/invitations`}>‹ กลับรายการกิจนิมนต์</Link>;
  let d;
  try { d = await invitationDetail(g.s.authUserId, id, invId); } catch (e) { console.error("[page:invitation]", e); return <LoadError id={id} />; }
  if (!d) return (
    <main className="stack">{back}<h1>กิจนิมนต์</h1>
      <Notice kind="info">ไม่พบกิจนิมนต์นี้ หรือบัญชีของคุณไม่ได้อยู่ในคณะของกิจนิมนต์นี้ จึงดูรายละเอียดไม่ได้</Notice></main>);
  const { inv, team, canManage } = d;

  // The system's suggestion (sma-v1), only while a team is being chosen / confirmed. Denied (42501) is shown as an explanation, not as "no one".
  let rows: SuggestRow[] = [], suggestDenied = false;
  if (canManage && (inv.status === "REVIEWING" || inv.status === "TEAM_PROPOSED")) {
    try { rows = await suggestTeam(g.s.authUserId, id, invId); }
    catch (e) {
      if ((e as { code?: string }).code === "42501") suggestDenied = true;
      else { console.error("[page:invitation:suggest]", e); return <LoadError id={id} />; }
    }
  }
  const grp = groupSuggestions(rows);
  const toCand = (r: SuggestRow): Cand => ({ id: r.person_id, name: r.display_name, codes: r.list === "excluded" ? r.violations : r.warnings });
  const cands: Cands | null = inv.status === "REVIEWING" && !suggestDenied
    ? { suggested: grp.suggested.map(toCand), needs: grp.needs.map(toCand), excluded: grp.excluded.map(toCand) } : null;
  const travelKnown = inv.travel_out_min != null && inv.travel_back_min != null;
  const warnings = inv.status === "TEAM_PROPOSED" ? teamWarnings(rows, team.map((t) => t.person_id), travelKnown) : [];
  const startsPassed = inv.starts_at.getTime() <= Date.now();
  const mine = team.find((t) => t.person_id === d.me);

  return (
    <main className="stack">
      {back}
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div><h1>{inv.rite_name ?? "กิจนิมนต์"}</h1><p className="lead" style={{ margin: 0 }}>{g.access.name_th}</p></div>
        <span className={`badge ${invBadge(inv.status)}`} data-testid="inv-status">{INV_STATUS_TH[inv.status]}</span>
      </div>

      <section className="card" aria-label="รายละเอียด" data-testid="inv-details">
        <ul className="details" style={{ color: "var(--text)" }}>
          <li><b>เจ้าภาพ</b> {inv.host_name}{inv.host_relation ? ` (${inv.host_relation})` : ""}</li>
          <li><b>เบอร์โทร</b> {inv.host_phone ? <a href={`tel:${inv.host_phone.replace(/\s/g, "")}`}>{inv.host_phone}</a> : "ไม่ได้ระบุ"}</li>
          <li><b>สถานที่</b> {inv.venue_text}</li>
          <li><b>เริ่ม</b> {fmtDateTime(inv.starts_at)} · ใช้เวลา {fmtDuration(inv.duration_min)}</li>
          <li><b>ขอนิมนต์</b> พระ {inv.monks_required} รูป</li>
          <li><b>การเดินทาง</b> {transportLabel(inv.transport)}</li>
          <li><b>เวลาเดินทาง</b> ไป {inv.travel_out_min != null ? `${inv.travel_out_min} นาที` : "ไม่ทราบ"} · กลับ {inv.travel_back_min != null ? `${inv.travel_back_min} นาที` : "ไม่ทราบ"}</li>
          {inv.note && <li><b>หมายเหตุ</b> {inv.note}</li>}
          {inv.status === "DECLINED" && <li><b>เหตุผลที่ไม่รับ</b> {declineLabel(inv.decline_reason)}</li>}
          {inv.status === "CANCELLED" && <li><b>เหตุผลที่ยกเลิก</b> {inv.cancel_reason}</li>}
        </ul>
      </section>

      {(team.length > 0) && (
        <section className="card" aria-label="คณะพระ" data-testid="inv-team">
          <h2>คณะพระ</h2>
          <ul className="list">
            {team.map((t) => (
              <li key={t.person_id} className="row">
                <span><b>{t.name || (t.person_id === d.me ? "ตัวท่านเอง" : "พระรูปหนึ่ง")}</b>{t.role === "LEAD" ? " · หัวหน้าคณะ" : ""}</span>
                <span className={`badge ${t.monk_response === "RELEASE_REQUESTED" ? "b-bad" : t.monk_response === "ACKNOWLEDGED" ? "b-ok" : "b-closed"}`}>{RESPONSE_TH[t.monk_response] ?? t.monk_response}</span>
              </li>
            ))}
          </ul>
          {team.some((t) => t.monk_response === "RELEASE_REQUESTED") && <p className="meta">มีพระแจ้งติดขัด กรุณาติดต่อท่านเพื่อหาทางออก การแจ้งนี้ไม่ได้ยกเลิกกิจนิมนต์</p>}
        </section>
      )}
      {mine && !canManage && inv.status === "CONFIRMED" && (
        <Notice kind="info">ท่านอยู่ในคณะของกิจนิมนต์นี้ รับทราบหรือแจ้งติดขัดได้ที่หน้า <Link href={`/temple/${id}/day`}>วันนี้ของฉัน</Link></Notice>
      )}

      {canManage && inv.status === "TEAM_PROPOSED" && suggestDenied && <Notice kind="info">บัญชีนี้ไม่มีสิทธิ์ดูคำเตือนของระบบ</Notice>}
      {canManage ? (
        <InvitationActions templeId={id} invId={invId} version={inv.version} status={inv.status} canManage={canManage} startsPassed={startsPassed}
          requiresLead={!!inv.requires_lead} monksRequired={inv.monks_required} cands={cands} suggestDenied={suggestDenied} warnings={warnings} />
      ) : null}
    </main>
  );
}
