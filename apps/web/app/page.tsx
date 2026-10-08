import Link from "next/link";
import { Search, ChevronRight, MapPin, BadgeCheck, Landmark, Box } from "lucide-react";
import { listTemples, type TempleListItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let temples: TempleListItem[] | null = null;
  try { temples = await listTemples(q); } catch { temples = null; }
  return (
    <main className="home-page">
      <div className="discovery-head">
      <p className="eyebrow"><BadgeCheck size={18} aria-hidden />ข้อมูลที่ยืนยันโดยวัด</p>
      <h1>ค้นหาวัด</h1>
      <p className="lead">พิมพ์ชื่อวัดหรือจังหวัด แล้วกดค้นหา เพื่อดูข้อมูลวัดและที่จอดรถ</p>
      <form className="search" role="search" action="/">
        <label htmlFor="q" className="sr-only">ชื่อวัดหรือจังหวัด</label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="พิมพ์ชื่อวัด หรือ ชื่อจังหวัด" />
        <button className="btn btn-primary" type="submit"><Search aria-hidden />ค้นหา</button>
      </form>
      </div>
      <div className="discovery-grid">
      <section aria-labelledby="results-heading">
      <div className="section-heading"><h2 id="results-heading">{q ? "ผลการค้นหา" : "วัดในระบบ"}</h2>{temples && temples.length > 0 && <p className="meta">{temples.length} วัด</p>}</div>
      {temples === null ? (
        <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลวัดไม่ได้ กรุณาลองใหม่ภายหลัง หรือติดต่อผู้ดูแลระบบ</div>
      ) : temples.length === 0 ? (
        <div className="card empty">
          <Landmark className="empty-icon" size={36} strokeWidth={1.4} aria-hidden />
          <h2>{q ? `ไม่พบวัดที่ตรงกับ "${q}"` : "ยังไม่มีวัดในระบบ"}</h2>
          <p>{q ? "ลองพิมพ์ชื่อสั้นลง หรือค้นหาด้วยชื่อจังหวัด" : "วัดจะแสดงที่นี่เมื่อตรวจกับทะเบียนวัดแล้ว และวัดยืนยันข้อมูลของตัวเองครบ"}</p>
          {!q && <Link className="btn btn-secondary" href="/me/temples/new">ลงทะเบียนวัดของคุณ</Link>}
        </div>
      ) : (
        <ul className="list temple-results" aria-label="รายชื่อวัด">
          {temples.map((t) => (
            <li key={t.slug}>
              <Link className="card" href={`/t/${encodeURIComponent(t.slug)}`}>
                <div className="row">
                  <div><h3>{t.name_th}</h3>{t.province && <p className="meta"><MapPin size={16} aria-hidden /> จังหวัด{t.province}</p>}</div>
                  <span className="meta" style={{ display: "flex", alignItems: "center" }}>ดูข้อมูล<ChevronRight aria-hidden /></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </section>
      <aside className="spatial-intro" aria-labelledby="spatial-heading">
        <p className="eyebrow"><Box size={18} aria-hidden />มุมมองเชิงพื้นที่</p>
        <h2 id="spatial-heading">มองพื้นที่จากทุกมุม</h2>
        {/* This is explicitly an illustration, never a photograph or a verified temple map. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="spatial-thumbnail"><img src="/3d/wat-arun-illustration.png" alt="ภาพประกอบแบบจำลองเชิงศิลป์ ไม่ใช่แผนผังวัดจริง" width={640} height={480} loading="lazy" /></div>
        <p className="hint">ทดลองหมุนและเลือกอาคารในแบบจำลองเชิงศิลป์ แยกจากข้อมูลวัดที่ยืนยันแล้ว</p>
        <Link className="btn btn-secondary" href="/showcase/3d">เปิดมุมมอง 3 มิติ<ChevronRight size={18} aria-hidden /></Link>
      </aside>
      </div>
    </main>
  );
}
