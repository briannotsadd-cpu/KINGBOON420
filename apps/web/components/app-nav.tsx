"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, UserRound, LogIn, Users, MessageCircle } from "lucide-react";

export function AppNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "ค้นหาวัด", icon: Search },
    ...(signedIn ? [{ href: "/community", label: "ชุมชน", icon: Users }, { href: "/chat", label: "แชท", icon: MessageCircle }] : []),
    signedIn ? { href: "/me", label: "ของฉัน", icon: UserRound } : { href: "/login", label: "เข้าสู่ระบบ", icon: LogIn },
  ];
  return <nav className="nav" aria-label="เมนูหลัก">{items.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={19} aria-hidden />{label}</Link>;
  })}</nav>;
}
