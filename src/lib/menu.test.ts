import { describe, it, expect } from "vitest";
import { orderableItems, effectivePrice } from "./menu";

describe("orderableItems", () => {
  const items = [
    { id: "a", available: true, archived: false },
    { id: "b", available: false, archived: false },
    { id: "c", available: true, archived: true },
  ];
  it("returns only available + non-archived", () => {
    expect(orderableItems(items).map((i) => i.id)).toEqual(["a"]);
  });
  it("archived item excluded even if available", () => {
    expect(orderableItems(items).some((i) => i.id === "c")).toBe(false);
  });
});

describe("effectivePrice", () => {
  it("adds variant delta", () => expect(effectivePrice(160, -60)).toBe(100));
  it("defaults delta to 0", () => expect(effectivePrice(160)).toBe(160));
});
