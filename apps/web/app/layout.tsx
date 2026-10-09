import "./globals.css";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { Landmark } from "lucide-react";
import { getSession } from "@/lib/auth";
import { IncomingCallBanner } from "@/components/call/incoming-call-banner";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic"; // every page depends on the signed-in user
export const metadata: Metadata = { title: "KINGBOON — ระบบวัด", description: "ค้นหาวัด ดูข้อมูลวัดและที่จอดรถ" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#7a2e0e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let s = null;
  try { s = await getSession(); } catch (e) { console.error("[layout] session lookup failed", e); }
  return (
    <html lang="th">
      <body>
        <a className="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a>
        <header className="topbar">
          <div className="topbar-in">
            <Link href="/" className="brand"><span className="brand-mark"><Landmark size={22} aria-hidden /></span><span>KINGBOON<span className="brand-caption">พื้นที่ของวัดและชุมชน</span></span></Link>
            <AppNav signedIn={Boolean(s)} />
          </div>
        </header>
        {s && <IncomingCallBanner />}
        <div id="main-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
