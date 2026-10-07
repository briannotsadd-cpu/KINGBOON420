import Link from "next/link";
export default function NotFound() {
  return (
    <main>
      <Link className="back" href="/">‹ เลือกวัด</Link>
      <div className="card">ไม่พบวัดนี้ หรือวัดยังไม่เปิดให้ค้นหา</div>
    </main>
  );
}
