import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ChevronRight, Flag, LayoutGrid, LogOut, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { signOutAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { ContactSection } from "@/components/contact/contact-section";

export const dynamic = "force-dynamic";
export default async function Me() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.displayName) redirect("/welcome");
  const temples = await asUser(s.authUserId, async (c) => (await c.query<{ id: string; name_th: string; province: string | null; status: string; member: boolean }>(
    "select id, name_th, province, status, app.is_member(id) as member from public.temples order by created_at desc")).rows).catch((e) => { console.error("[page]", e); return null; });
  return (
    <main className="stack">
      <div>
        <h1>สวัสดี {s.displayName}</h1>
        <p className="lead" style={{ margin: 0 }}>หน้านี้คือหน้าของคุณ แสดงวัดที่คุณดูแลหรือเป็นสมาชิก</p>
      </div>
      {s.isPlatformAdmin && <Link className="btn btn-secondary" href="/admin"><ShieldCheck aria-hidden />ตรวจสอบวัดที่รออนุมัติ</Link>}
      {s.isPlatformAdmin && <Link className="btn btn-secondary" href="/admin/moderation"><Flag aria-hidden />รายงานเนื้อหาในชุมชน</Link>}
      <section>
        <h2>วัดของฉัน</h2>
        {temples === null ? <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div>
        : temples.length === 0 ? (
          <div className="card empty"><h3>คุณยังไม่มีวัดในระบบ</h3><p>ถ้าคุณเป็นผู้ดูแลวัด กดปุ่มด้านล่างเพื่อลงทะเบียนวัด</p></div>
        ) : (
          <ul className="list">
            {temples.map((t) => (
              <li key={t.id}><Link className="card" href={`/me/temples/${t.id}`}>
                <div className="row"><div><h3>{t.name_th}</h3><p className="meta">{t.province ? `จังหวัด${t.province}` : ""}</p></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><StatusBadge status={t.status} /><ChevronRight aria-hidden /></div></div>
              </Link>
              {t.member && <Link className="btn btn-secondary btn-block" style={{ marginTop: 8 }} href={`/temple/${t.id}`} data-testid={`menu-link-${t.id}`}><LayoutGrid aria-hidden />เมนูของวัด</Link>}</li>
            ))}
          </ul>
        )}
      </section>
      <ContactSection authUserId={s.authUserId} />
      <Link className="btn btn-primary btn-block" href="/me/temples/new"><Plus aria-hidden />ลงทะเบียนวัดใหม่</Link>
      <form action={signOutAction}><SubmitButton pendingText="กำลังออกจากระบบ…" variant="secondary" block><LogOut aria-hidden />ออกจากระบบ</SubmitButton></form>
      <p className="meta">เข้าสู่ระบบด้วย {s.email}</p>
    </main>
  );
}
