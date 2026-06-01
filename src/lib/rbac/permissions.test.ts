import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "./permissions";

describe("permission catalog", () => {
  it("every role permission key exists in catalog", () => {
    for (const keys of Object.values(ROLE_PERMISSIONS)) {
      for (const k of keys) expect(PERMISSIONS[k], `missing ${k}`).toBeDefined();
    }
  });
  it("owner has all permissions", () => {
    expect(ROLE_PERMISSIONS.owner.length).toBe(Object.keys(PERMISSIONS).length);
  });
  it("has all 7 demo roles", () => {
    expect(Object.keys(ROLES)).toEqual(["owner", "manager", "cashier", "waiter", "kitchen", "inventory", "auditor"]);
  });
  it("kitchen cannot finalize bills", () => {
    expect(ROLE_PERMISSIONS.kitchen).not.toContain("bill.finalize");
  });
  it("cashier cannot manage settings", () => {
    expect(ROLE_PERMISSIONS.cashier).not.toContain("settings.manage");
  });
});
