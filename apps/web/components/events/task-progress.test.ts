import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), user: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ asUser: mocks.user }));
import { progressTask } from "./task-progress";
beforeEach(() => {
  mocks.query.mockReset().mockResolvedValue({ rowCount: 1 });
  mocks.user.mockReset().mockImplementation((_id, fn) => fn({ query: mocks.query }));
});
describe("task progress application boundary (mocked database)", () => {
  it.each([["start", "ASSIGNED"], ["submit", "IN_PROGRESS"], ["verify", "SUBMITTED"], ["reject", "SUBMITTED"]])("binds %s to its expected state", async (action, expected) => {
    expect(await progressTask("user", "temple", "event", "assignment", action)).toBe(true);
    expect(mocks.user).toHaveBeenCalledWith("user", expect.any(Function));
    const [sql, params] = mocks.query.mock.calls[0];
    expect(params).toEqual(["temple", "assignment", action, "event", expected]);
    expect(sql).toContain("app.is_member($1::uuid)");
    expect(sql).toContain("q.event_id = $4::uuid");
    expect(sql).toContain("q.status = 'OPEN'");
  });
  it("does not report success for stale, denied or mismatched rows", async () => {
    mocks.query.mockResolvedValueOnce({ rowCount: 0 });
    expect(await progressTask("user", "temple", "event", "assignment", "start")).toBe(false);
  });
  it("rejects invalid operations before querying", async () => {
    await expect(progressTask("user", "temple", "event", "assignment", "complete")).rejects.toThrow();
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("propagates database denial and failure", async () => {
    mocks.query.mockRejectedValueOnce(new Error("denied"));
    await expect(progressTask("user", "temple", "event", "assignment", "submit")).rejects.toThrow("denied");
  });
});
