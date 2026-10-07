import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, type Session } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { UUID, monasticAccess, type Access } from "./queries";

export const BackToHub = ({ id }: { id: string }) => <Link className="back" href={`/temple/${id}/monastic`}>‹ กลับเมนูพระและกิจนิมนต์</Link>;

/** A load failure is an error, never an empty list. */
export const LoadError = ({ id }: { id: string }) => (
  <main className="stack"><BackToHub id={id} />
    <Notice kind="error">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่ ถ้ายังไม่ได้ให้ลองอีกครั้งในอีกสักครู่ (ข้อมูลที่เห็นก่อนหน้านี้อาจไม่เป็นปัจจุบัน)</Notice>
  </main>
);

export const NotMember = () => (
  <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
    <Notice kind="info">คุณยังไม่ได้เป็นสมาชิกของวัดนี้ หรือไม่พบวัดนี้ กรุณาตรวจสอบลิงก์ หรือติดต่อเจ้าหน้าที่วัด</Notice>
  </main>
);

export type Gate = { ok: true; s: Session; access: Access } | { ok: false; page: React.ReactNode };
/** Common start of every page: signed in, valid temple id, member of the temple. Redirects/404 as needed. */
export async function gate(id: string): Promise<Gate> {
  const s = await getSession(); if (!s) redirect("/login");
  if (!UUID.test(id)) notFound();
  let access: Access | undefined;
  try { access = await monasticAccess(s.authUserId, id); } catch (e) { console.error("[page:monastic-gate]", e); return { ok: false, page: <LoadError id={id} /> }; }
  if (!access?.is_member) return { ok: false, page: <NotMember /> };
  return { ok: true, s, access };
}
