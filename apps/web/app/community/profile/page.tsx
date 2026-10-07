import { ProfileForm } from "@/components/community/profile-form";
import { Notice } from "@/components/ui";
import { loadMyProfile, requireSession } from "../data";

export default async function ProfilePage() {
  const s = await requireSession();
  const profile = await loadMyProfile(s.authUserId).catch((e) => { console.error("[community:profile]", e); return undefined; });
  if (profile === undefined) return <Notice kind="error">ตอนนี้ดึงโปรไฟล์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้านี้ใหม่</Notice>;
  return (
    <>
      <div>
        <h1>{profile ? "แก้ไขโปรไฟล์ชุมชน" : "สร้างโปรไฟล์ชุมชน"}</h1>
        <p className="lead" style={{ margin: 0 }}>เลือกได้ว่าข้อมูลแต่ละอย่างให้ใครเห็น ชื่อของคุณเห็นได้เสมอ ส่วนอื่นเริ่มต้นเป็น “เฉพาะคนที่เชื่อมต่อ”</p>
      </div>
      <ProfileForm profile={profile} defaultName={s.displayName} />
    </>
  );
}
