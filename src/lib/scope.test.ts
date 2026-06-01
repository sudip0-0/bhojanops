import { describe, it, expect } from "vitest";
import { assertSameBranch } from "./scope";
import type { SessionUser } from "./auth-helpers";

function user(over: Partial<SessionUser>): SessionUser {
  return {
    id: "u1",
    name: "Test",
    email: "test@example.com",
    role: "cashier",
    branchId: "b1",
    permissions: [],
    ...over,
  };
}

describe("assertSameBranch", () => {
  it("owner can touch any branch", async () => {
    await expect(assertSameBranch(user({ role: "owner" }), "b2")).resolves.toBeUndefined();
  });
  it("auditor can touch any branch", async () => {
    await expect(assertSameBranch(user({ role: "auditor" }), "b2")).resolves.toBeUndefined();
  });
  it("cashier same branch is allowed", async () => {
    await expect(assertSameBranch(user({ role: "cashier", branchId: "b1" }), "b1")).resolves.toBeUndefined();
  });
  it("cashier different branch is rejected", async () => {
    await expect(assertSameBranch(user({ role: "cashier", branchId: "b1" }), "b2")).rejects.toThrow("FORBIDDEN_BRANCH");
  });
  it("waiter with null branch is allowed (owner-fallback path)", async () => {
    await expect(assertSameBranch(user({ role: "waiter", branchId: null }), "b1")).resolves.toBeUndefined();
  });
  it("null record branchId is allowed (only owner/auditor are privileged)", async () => {
    await expect(assertSameBranch(user({ role: "cashier", branchId: "b1" }), null)).rejects.toThrow("FORBIDDEN_BRANCH");
  });
});
