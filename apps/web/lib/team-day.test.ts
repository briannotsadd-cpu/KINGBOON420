import { describe, it, expect } from "vitest";
import { dayBounds, groupTasks, taskGroup, type DayTask } from "./team-day";
const now = new Date("2026-10-08T16:00:00Z");
const task = (status: string, due_at: Date | null = null, title = "งาน"): DayTask => ({
  id: title, title, status, due_at, description: null, assignment_id: title,
  reason: null, event_id: null, event_title: null, venue: null, building_name: null, assignee_name: null,
});
describe("team day", () => {
  it("uses Bangkok midnight and an exclusive end", () => {
    const bounds = dayBounds("2026-10-08");
    expect(bounds.start.toISOString()).toBe("2026-10-07T17:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-10-08T17:00:00.000Z");
  });
  it("rejects nonexistent dates", () => expect(() => dayBounds("2026-02-30")).toThrow());
  it("does not label submitted or verified work overdue", () => {
    const past = new Date("2026-10-01");
    expect(taskGroup(task("SUBMITTED", past), now)).toBe("waiting");
    expect(taskGroup(task("COMPLETED", past), now)).toBe("done");
  });
  it("prioritizes blocked and overdue work without treating unknown due dates as overdue", () => {
    expect(taskGroup(task("BLOCKED"), now)).toBe("attention");
    expect(taskGroup(task("ASSIGNED", new Date(now.getTime() - 1)), now)).toBe("attention");
    expect(taskGroup(task("IN_PROGRESS", now), now)).toBe("active");
    expect(taskGroup(task("ASSIGNED"), now)).toBe("active");
  });
  it("sorts dated work first without mutating input", () => {
    const tasks = [task("ASSIGNED", null, "ไม่กำหนดวัน"), task("ASSIGNED", new Date(now.getTime() + 1000), "กำหนดวัน")];
    const grouped = groupTasks(tasks, now);
    expect(grouped.active.map(t => t.title)).toEqual(["กำหนดวัน", "ไม่กำหนดวัน"]);
    expect(tasks[0].title).toBe("ไม่กำหนดวัน");
  });
  it("keeps an empty day empty", () => expect(groupTasks([], now)).toEqual({ attention: [], active: [], waiting: [], done: [] }));
});
