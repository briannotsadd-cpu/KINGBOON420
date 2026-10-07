import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Ineligible } from "@/components/community/ineligible";
import { Notice } from "@/components/ui";
import { checkGate, searchPeople } from "../data";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const g = await checkGate();
  if (!g.ok) return <Ineligible reason={g.reason} detail={g.suspendedReason} />;
  const short = q.length > 0 && q.length < 2;
  const rows = q.length >= 2 ? await searchPeople(g.session.authUserId, q).catch((e) => { console.error("[community:search]", e); return null; }) : [];
  return (
    <>
      <div>
        <h1>ค้นหาผู้คน</h1>
        <p className="lead" style={{ margin: 0 }}>พิมพ์ชื่ออย่างน้อย 2 ตัวอักษร เพื่อหาสมาชิกที่เปิดให้ค้นหา</p>
      </div>
      <form className="search" action="/community/people" method="get" role="search">
        <label htmlFor="q" style={{ position: "absolute", left: -9999 }}>ชื่อที่ต้องการค้นหา</label>
        <input id="q" name="q" type="search" className="input" defaultValue={q} placeholder="เช่น สมชาย" autoComplete="off" />
        <button type="submit" className="btn btn-primary"><Search aria-hidden />ค้นหา</button>
      </form>
      {short && <Notice kind="warn">กรุณาพิมพ์ชื่ออย่างน้อย 2 ตัวอักษร แล้วกดค้นหาอีกครั้ง</Notice>}
      {rows === null && <Notice kind="error">ตอนนี้ค้นหาไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดค้นหาอีกครั้ง</Notice>}
      {rows && q.length >= 2 && rows.length === 0 && (
        <div className="card empty"><h3>ไม่พบผู้ที่ชื่อ “{q}”</h3><p>ลองพิมพ์ชื่อสั้นลง หรือเช็คตัวสะกด บางคนอาจปิดไม่ให้ค้นหา</p></div>
      )}
      {rows && rows.length > 0 && (
        <ul className="list" aria-label="ผลการค้นหา">
          {rows.map((r) => (
            <li key={r.person_id}><Link className="card" href={`/community/people/${r.person_id}`}>
              <div className="row"><h3>{r.display_name}</h3><ChevronRight aria-hidden /></div>
            </Link></li>
          ))}
        </ul>
      )}
    </>
  );
}
