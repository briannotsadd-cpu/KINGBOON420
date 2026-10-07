import { CommunityNav } from "@/components/community/nav";
import s from "@/components/community/community.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "ชุมชน — KINGBOON" };

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div className={s.scope}>
        <CommunityNav />
        {children}
      </div>
    </main>
  );
}
