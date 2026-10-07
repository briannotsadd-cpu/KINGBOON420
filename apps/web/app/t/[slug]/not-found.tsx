import Link from "next/link";
export default function NotFound() {
  return <main><Link className="back" href="/">‹ กลับไปค้นหาวัด</Link><div className="card empty"><h2>ไม่พบวัดนี้</h2><p>วัดอาจยังไม่ได้รับการอนุมัติ หรือปิดการค้นหาไว้</p></div></main>;
}
