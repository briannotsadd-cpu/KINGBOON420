import Link from "next/link";
import { notFound } from "next/navigation";
import { templeParking } from "@/lib/db";
import { presentParking, type ParkingView } from "@/lib/parking";

export const dynamic = "force-dynamic";

export default async function TemplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let view: ParkingView | null = null;
  try { view = presentParking(await templeParking(slug)); } catch { view = null; }
  if (view?.kind === "not_found") notFound();
  return (
    <main>
      <Link className="back" href="/">‹ เลือกวัดอื่น</Link>
      {view === null ? (
        <div className="card" role="alert">เชื่อมต่อข้อมูลไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</div>
      ) : (
        <>
          <h1>{view.templeName}</h1>
          {slug.startsWith("demo-") && <span className="demo">ข้อมูลตัวอย่าง</span>}
          <section aria-labelledby="parking-h" style={{ marginTop: 16 }}>
            <h2 id="parking-h" style={{ marginBottom: 12 }}>ที่จอดรถ</h2>
            {view.kind === "none" && <div className="card">วัดนี้ไม่มีที่จอดรถของวัด</div>}
            {view.kind === "no_info" && <div className="card">วัดยังไม่ได้ให้ข้อมูลที่จอดรถ</div>}
            {view.kind === "lots" && (
              <ul className="list">
                {view.lots.map((l) => (
                  <li key={l.code} className="card" data-testid={`lot-${l.code}`}>
                    <div className="row">
                      <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{l.name}</h3>
                      <span className={`badge ${l.tone}`}>{l.label}</span>
                    </div>
                    {l.freeText && <p className="big">{l.freeText}</p>}
                    {l.updatedText && <p className="meta">{l.updatedText}</p>}
                    <ul className="details">{l.details.map((d) => <li key={d}>{d}</li>)}</ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
