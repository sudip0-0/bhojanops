import { describe, it, expect } from "vitest";
import { expectedCash, variance, isLargeVariance } from "./shift";

describe("shift cash", () => {
  it("expectedCash = opening + cash - refunds", () => {
    expect(expectedCash(5000, 13600, 0)).toBe(18600);
  });
  it("variance is counted minus expected", () => {
    expect(variance(18500, 18600)).toBe(-100);
  });
  it("small variance not flagged", () => expect(isLargeVariance(-100)).toBe(false));
  it("large variance flagged", () => expect(isLargeVariance(-600)).toBe(true));
});
