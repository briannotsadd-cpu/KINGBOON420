"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./community.module.css";

const ITEMS = [
  { href: "/community", label: "ชุมชน", exact: true },
  { href: "/community/people", label: "ผู้คน" },
  { href: "/community/connections", label: "เชื่อมต่อ" },
  { href: "/community/profile", label: "โปรไฟล์" },
];
export function CommunityNav() {
  const path = usePathname();
  return (
    <nav className={s.subnav} aria-label="เมนูชุมชน">
      {ITEMS.map((i) => {
        const on = i.exact ? path === i.href || path.startsWith("/community/posts") : path.startsWith(i.href);
        return <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined}>{i.label}</Link>;
      })}
    </nav>
  );
}
