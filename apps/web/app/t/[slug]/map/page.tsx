import Link from "next/link";
import { notFound } from "next/navigation";
import { asAnon, templePublic, type PublicField } from "@/lib/db";
import { formatValue } from "@/lib/verification";
import { readPolygon } from "@/lib/map";
import { MapView } from "@/components/map/map-view";

export const dynamic = "force-dynamic";

export default async function PublicMap({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let fields: PublicField[] | null = null, items: { code: string; name_th: string; kind: string; status: string; polygon2d: unknown }[] = [], failed = false;
  try {
    fields = await templePublic(slug);
    if (fields) items = await asAnon(async (c) => (await c.query("select * from public.temple_public_map($1)", [slug])).rows);
  } catch (e) { console.error("[page]", e); failed = true; }
  if (!failed && fields === null) notFound();
  const name = fields?.find((f) => f.field_key === "temple.name_th");
  return (
    <main className="stack spatial-page">
      <Link className="back" href={`/t/${encodeURIComponent(slug)}`}>‹ กลับหน้าวัด</Link>
      {failed ? <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลแผนผังไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div> : (
        <>
          <div><h1>แผนผังวัด</h1><p className="lead" style={{ margin: 0 }}>{name ? formatValue(name.value) : ""}</p></div>
          <Link className="back" href={`/t/${encodeURIComponent(slug)}/parking`}>ดูที่จอดรถและบันทึกตำแหน่งรถ →</Link>
          <MapView detail={false} emptyText="วัดยังไม่ได้เผยแพร่แผนผัง"
            items={items.map((b) => ({ key: b.code, code: b.code, name_th: b.name_th, kind: b.kind, status: b.status, polygon: readPolygon(b.polygon2d) }))} />
          <p className="meta">แสดงเฉพาะอาคารที่วัดยืนยันและเปิดให้ทุกคนเห็น</p>
        </>
      )}
    </main>
  );
}
