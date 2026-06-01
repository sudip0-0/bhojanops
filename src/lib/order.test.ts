import { describe, it, expect } from "vitest";
import { isValidItemTransition, canModifyItem, lineTotal, orderSubtotal } from "./order";

describe("item state machine", () => {
  it("DRAFT -> SENT allowed", () => expect(isValidItemTransition("DRAFT", "SENT")).toBe(true));
  it("SERVED is terminal", () => expect(isValidItemTransition("SERVED", "DRAFT")).toBe(false));
  it("cannot delete sent item", () => expect(canModifyItem("SENT")).toBe(false));
  it("can modify draft item", () => expect(canModifyItem("DRAFT")).toBe(true));
});

describe("totals", () => {
  it("lineTotal includes modifiers", () => {
    expect(lineTotal({ unitPrice: 100, qty: 2, modifiers: [{ price: 20 }] })).toBe(240);
  });
  it("orderSubtotal excludes voided", () => {
    const lines = [
      { unitPrice: 100, qty: 1 },
      { unitPrice: 50, qty: 2, state: "VOIDED" as const },
    ];
    expect(orderSubtotal(lines)).toBe(100);
  });
});
