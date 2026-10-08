import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, type Session } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { UUID, pointsAccess, type PAccess } from "./queries";

export const LoadError = () => (
  <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
    <Notice kind="error">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่ ถ้ายังไม่ได้ให้ลองอีกครั้งในอีกสักครู่</Notice></main>
);
export const NotMember = () => (
  <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
    <Notice kind="info">คุณยังไม่ได้เป็นสมาชิกของวัดนี้ หรือไม่พบวัดนี้ กรุณาตรวจสอบลิงก์ หรือติดต่อเจ้าหน้าที่วัด</Notice></main>
);

export type PGate = { ok: true; s: Session; access: PAccess } | { ok: false; page: React.ReactNode };
/** Start of every page: signed in, valid temple id, member of the temple. */
export async function pgate(id: string): Promise<PGate> {
  const s = await getSession(); if (!s) redirect("/login");
  if (!UUID.test(id)) notFound();
  let access: PAccess | undefined;
  try { access = await pointsAccess(s.authUserId, id); } catch (e) { console.error("[page:points-gate]", e); return { ok: false, page: <LoadError /> }; }
  if (!access?.is_member) return { ok: false, page: <NotMember /> };
  return { ok: true, s, access };
}

export const fmtWhen = (d: Date) => d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
export const fmtDay = (d: Date) => d.toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
