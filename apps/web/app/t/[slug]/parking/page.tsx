import Link from "next/link";
import { notFound } from "next/navigation";
import { Car, ChevronLeft } from "lucide-react";
import { templeParking, templePublic } from "@/lib/db";
import { presentParking } from "@/lib/parking";
import { formatValue } from "@/lib/verification";
import { ParkingExperience } from "@/components/parking/parking-experience";
import s from "@/components/parking/parking.module.css";

export const dynamic = "force-dynamic";

export default async function ParkingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data: Awaited<ReturnType<typeof templePublic>> = null;
  let parking = presentParking([]);
  let failed = false;
  try {
    const [fields, rows] = await Promise.all([templePublic(slug), templeParking(slug)]);
    data = fields;
    parking = presentParking(rows);
  } catch (error) { console.error("[parking]", error); failed = true; }
  if (!failed && data === null) notFound();
  const name = data?.find((field) => field.field_key === "temple.name_th");
  return <main className={`stack spatial-page ${s.page}`}>
    <Link className="back" href={`/t/${encodeURIComponent(slug)}`}><ChevronLeft size={19} aria-hidden />กลับหน้าวัด</Link>
    {failed ? <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลที่จอดรถไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div> : <>
      <div className={s.intro}><p className={s.eyebrow}><Car size={18} aria-hidden />{name ? formatValue(name.value) : "การเดินทางไปวัด"}</p><h1>จอดอย่างเข้าใจ<br />กลับมาหารถได้ง่าย</h1><p>ตรวจข้อมูลลานจอดก่อนเดินทาง และบันทึกตำแหน่งรถไว้เมื่อถึงวัด</p></div>
      <ParkingExperience slug={slug} view={parking} />
      <Link className={s.link} href={`/t/${encodeURIComponent(slug)}/contact`}>สอบถามการเดินทางกับวัด</Link>
    </>}
  </main>;
}
