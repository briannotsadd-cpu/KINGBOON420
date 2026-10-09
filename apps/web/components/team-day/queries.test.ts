import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), user: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ asUser: mocks.user }));
import { teamDay } from "./queries";

beforeEach(() => {
  mocks.query.mockReset().mockResolvedValue({ rows: [] });
  mocks.user.mockReset().mockImplementation((_id, fn) => fn({ query: mocks.query }));
});
describe("team day query boundaries (mocked database)", () => {
  it("runs through the signed-in user, never the owner connection", async () => {
    await teamDay("user", "temple", "2026-10-08");
    expect(mocks.user).toHaveBeenCalledWith("user", expect.any(Function));
    expect(mocks.query).toHaveBeenCalledTimes(3);
  });
  it("limits own rows to the current person and selected Bangkok day", async () => {
    await teamDay("user", "temple", "2026-10-08");
    const [sql, args] = mocks.query.mock.calls[0];
    expect(sql).toContain("a.assignee_person_id = app.current_person_id()");
    expect(sql).toContain("a.updated_at < $3");
    expect(args.map((v: string | Date) => v instanceof Date ? v.toISOString() : v)).toEqual([
      "temple", "2026-10-07T17:00:00.000Z", "2026-10-08T17:00:00.000Z",
    ]);
  });
  it("requires full assignment visibility per department before labeling unassigned", async () => {
    await teamDay("user", "temple", "2026-10-08");
    const [sql, args] = mocks.query.mock.calls[1];
    expect(sql).toContain("'quest.assign', null, q.department_id");
    expect(sql).toContain("'quest.verify', null, q.department_id");
    expect(sql).toContain("a.status in ('BLOCKED','SUBMITTED')");
    expect(args).toHaveLength(2);
    expect(sql).not.toContain("$3");
  });
  it("shows truncation explicitly instead of pretending the count is complete", async () => {
    const rows = Array.from({ length: 101 }, (_, id) => ({ id }));
    mocks.query.mockResolvedValueOnce({ rows }).mockResolvedValueOnce({ rows }).mockResolvedValueOnce({ rows: [] });
    const data = await teamDay("user", "temple", "2026-10-08");
    expect(data.own).toHaveLength(100);
    expect(data.team).toHaveLength(100);
    expect(data.ownLimited).toBe(true);
    expect(data.teamLimited).toBe(true);
  });
  it("propagates failures, never substitutes an empty day", async () => {
    mocks.query.mockRejectedValueOnce(new Error("unavailable"));
    await expect(teamDay("user", "temple", "2026-10-08")).rejects.toThrow("unavailable");
  });
});
