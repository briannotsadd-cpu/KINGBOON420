import Link from "next/link";
import { listTemples, type TempleListItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let temples: TempleListItem[] | null = null;
  try { temples = await listTemples(); } catch { temples = null; }
  return (
    <main>
      <h1>เลือกวัด</h1>
      <p className="sub">ดูข้อมูลสำหรับผู้มาเยือน เช่น ที่จอดรถ</p>
      {temples === null ? (
        <div className="card" role="alert">เชื่อมต่อข้อมูลไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</div>
      ) : temples.length === 0 ? (
        <div className="card">ยังไม่มีวัดที่เปิดให้ค้นหา</div>
      ) : (
        <ul className="list">
          {temples.map((t) => (
            <li key={t.slug}>
              <Link className="card" href={`/t/${encodeURIComponent(t.slug)}`}>
                <div className="row">
                  <h2>{t.name_th}</h2><span aria-hidden>›</span>
                </div>
                {t.name_en && <p className="meta">{t.name_en}</p>}
                {t.slug.startsWith("demo-") && <span className="demo">ข้อมูลตัวอย่าง</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
