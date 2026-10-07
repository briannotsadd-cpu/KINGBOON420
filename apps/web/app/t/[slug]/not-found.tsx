import Link from "next/link";
export default function NotFound() {
  return <main><Link className="back" href="/">‹ กลับไปค้นหาวัด</Link><div className="card empty"><h2>ไม่พบวัดนี้</h2><p>วัดอาจยังตรวจสอบข้อมูลไม่ครบ หรือปิดการค้นหาไว้</p></div></main>;
}
