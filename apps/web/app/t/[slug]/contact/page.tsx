import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { templePublic } from "@/lib/db";
import { formatValue } from "@/lib/verification";
import { ContactForm } from "@/components/contact/contact-form";
import { Notice } from "@/components/ui";

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let fields = null, failed = false;
  try { fields = await templePublic(slug); } catch (e) { console.error("[contact page]", e); failed = true; }
  if (!failed && !fields) notFound();
  const name = fields?.find((f) => f.field_key === "temple.name_th");
  return (
    <main className="stack">
      <Link className="back" href={`/t/${encodeURIComponent(slug)}`}><ChevronLeft aria-hidden />กลับไปหน้าวัด</Link>
      <h1>ติดต่อ{name ? formatValue(name.value) : "วัด"}</h1>
      {failed ? <Notice kind="error">ตอนนี้โหลดหน้านี้ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</Notice> : <ContactForm slug={slug} />}
    </main>
  );
}
