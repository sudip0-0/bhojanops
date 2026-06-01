import { describe, it, expect } from "vitest";
import { can, canAny } from "./can";

describe("can", () => {
  const perms = ["bill.create", "payment.settle"];
  it("grants held permission", () => expect(can(perms, "bill.create")).toBe(true));
  it("denies missing permission", () => expect(can(perms, "settings.manage")).toBe(false));
  it("canAny matches one", () => expect(canAny(perms, ["x", "payment.settle"])).toBe(true));
  it("canAny denies none", () => expect(canAny(perms, ["x", "y"])).toBe(false));
});
