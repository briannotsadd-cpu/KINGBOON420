export const TOPICS = [
  { value: "invite_monk", label: "ขอนิมนต์พระ" },
  { value: "activity", label: "สอบถามกิจกรรม" },
  { value: "donate_items", label: "ขอบริจาคสิ่งของ" },
  { value: "other", label: "อื่น ๆ" },
] as const;
export type Topic = (typeof TOPICS)[number]["value"];
export const topicLabel = (v: string) => TOPICS.find((t) => t.value === v)?.label ?? "อื่น ๆ";

export const MSG_MIN = 5, MSG_MAX = 2000, NAME_MAX = 80, REPLY_MAX = 2000;
export const EXPLAINER = "ข้อความส่งถึงเจ้าหน้าที่ของวัด ไม่ได้ส่งถึงพระโดยตรง";

const len = (s: string) => [...s].length;

export interface ContactInput { topic: string; message: string; name: string; phone: string }
export type ContactParse =
  | { ok: true; value: { topic: Topic; message: string; name: string; phone: string } }
  | { ok: false; fieldErrors: Record<string, string> };

export function parseContact(i: ContactInput): ContactParse {
  const topic = i.topic.trim(), message = i.message.trim(), name = i.name.trim(), phone = i.phone.trim();
  const fe: Record<string, string> = {};
  if (!TOPICS.some((t) => t.value === topic)) fe.topic = "กรุณาเลือกเรื่องที่ต้องการติดต่อ";
  if (len(message) < MSG_MIN) fe.message = `กรุณาพิมพ์ข้อความอย่างน้อย ${MSG_MIN} ตัวอักษร เช่น ขอนิมนต์พระมาทำบุญบ้านวันที่ 12 ต.ค.`;
  else if (len(message) > MSG_MAX) fe.message = `ข้อความยาวเกินไป กรุณาย่อให้ไม่เกิน ${MSG_MAX} ตัวอักษร`;
  if (len(name) > NAME_MAX) fe.name = `ชื่อยาวเกินไป กรุณาใช้ไม่เกิน ${NAME_MAX} ตัวอักษร`;
  if (phone) {
    const compact = phone.replace(/\s/g, "");
    if (!/^[0-9+\- ]+$/.test(phone) || phone.length > 20 || compact.length < 6)
      fe.phone = "เบอร์โทรใช้ได้เฉพาะตัวเลข เครื่องหมาย + - และเว้นวรรค ยาว 6–20 ตัว ตัวอย่าง: 081 234 5678";
  }
  if (Object.keys(fe).length) return { ok: false, fieldErrors: fe };
  return { ok: true, value: { topic: topic as Topic, message, name, phone } };
}

export function validReply(text: string): string | null {
  const t = text.trim();
  if (len(t) < 1) return "กรุณาพิมพ์ข้อความตอบกลับ";
  if (len(t) > REPLY_MAX) return `ข้อความตอบกลับยาวเกินไป กรุณาย่อให้ไม่เกิน ${REPLY_MAX} ตัวอักษร`;
  return null;
}

export const STATUS_TH: Record<string, string> = { NEW: "ใหม่", ASSIGNED: "มอบหมายแล้ว", REPLIED: "ตอบแล้ว", CLOSED: "ปิด" };
export const TABS = [
  { key: "new", status: "NEW", label: "ใหม่" },
  { key: "assigned", status: "ASSIGNED", label: "มอบหมายแล้ว" },
  { key: "replied", status: "REPLIED", label: "ตอบแล้ว" },
  { key: "closed", status: "CLOSED", label: "ปิด" },
] as const;
