import { isYmd } from "./monastic";

export interface DayTask {
  id: string; title: string; description: string | null; due_at: Date | null;
  assignment_id: string | null; status: string; reason: string | null;
  event_id: string | null; event_title: string | null; venue: string | null;
  building_name: string | null; assignee_name: string | null;
}
export type TaskGroup = "attention" | "active" | "waiting" | "done";
export function taskGroup(task: Pick<DayTask, "status" | "due_at">, now: Date): TaskGroup {
  if (task.status === "COMPLETED") return "done";
  if (task.status === "SUBMITTED") return "waiting";
  if (task.status === "BLOCKED" || (task.due_at && task.due_at < now)) return "attention";
  return "active";
}
export const GROUP_LABEL: Record<TaskGroup, string> = {
  attention: "ต้องดูแลก่อน", active: "งานที่ต้องทำ", waiting: "ส่งแล้ว · รอตรวจรับ", done: "ตรวจรับแล้วในวันที่เลือก",
};
export function groupTasks(tasks: DayTask[], now: Date): Record<TaskGroup, DayTask[]> {
  const groups: Record<TaskGroup, DayTask[]> = { attention: [], active: [], waiting: [], done: [] };
  for (const task of [...tasks].sort((a, b) => (a.due_at?.getTime() ?? Infinity) - (b.due_at?.getTime() ?? Infinity) || a.title.localeCompare(b.title, "th"))) {
    groups[taskGroup(task, now)].push(task);
  }
  return groups;
}
/** Bangkok boundaries, exclusive end. Never depend on the server's local timezone. */
export function dayBounds(day: string) {
  if (!isYmd(day)) throw new Error("Invalid day");
  const start = new Date(`${day}T00:00:00+07:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}
