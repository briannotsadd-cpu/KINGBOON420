import Link from "next/link";
import { Search, ChevronRight, MapPin } from "lucide-react";
import { listTemples, type TempleListItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let temples: TempleListItem[] | null = null;
  try { temples = await listTemples(q); } catch { temples = null; }
  return (
    <main>
      <h1>ค้นหาวัด</h1>
      <p className="lead">พิมพ์ชื่อวัดหรือจังหวัด แล้วกดค้นหา เพื่อดูข้อมูลวัดและที่จอดรถ</p>
      <form className="search" role="search" action="/">
        <label htmlFor="q" className="sr-only" style={{ position: "absolute", left: -9999 }}>ชื่อวัดหรือจังหวัด</label>
        <input id="q" name="q" className="input" defaultValue={q} placeholder="พิมพ์ชื่อวัด หรือ ชื่อจังหวัด" />
        <button className="btn btn-primary" type="submit"><Search aria-hidden />ค้นหา</button>
      </form>
      {temples === null ? (
        <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลวัดไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</div>
      ) : temples.length === 0 ? (
        <div className="card empty">
          <h2>{q ? `ไม่พบวัดที่ตรงกับ "${q}"` : "ยังไม่มีวัดในระบบ"}</h2>
          <p>{q ? "ลองพิมพ์ชื่อสั้นลง หรือค้นหาด้วยชื่อจังหวัด" : "วัดจะแสดงที่นี่หลังจากผู้ดูแลวัดลงทะเบียนและได้รับการอนุมัติ"}</p>
          {!q && <Link className="btn btn-secondary" href="/me/temples/new">ลงทะเบียนวัดของคุณ</Link>}
        </div>
      ) : (
        <ul className="list" aria-label="รายชื่อวัด">
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
    </main>
  );
}
