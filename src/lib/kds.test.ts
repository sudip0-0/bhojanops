import { describe, it, expect } from "vitest";
import { recipeMovements, isLowStock, lowStockItems } from "./stock";
import { nextTicketState, elapsedMinutes, groupByStation } from "./kds";

describe("low stock", () => {
  it("flags at or below reorder level", () => {
    expect(isLowStock({ quantity: 5, reorderLevel: 5 })).toBe(true);
    expect(isLowStock({ quantity: 6, reorderLevel: 5 })).toBe(false);
  });
  it("filters low items", () => {
    const items = [{ quantity: 1, reorderLevel: 5 }, { quantity: 10, reorderLevel: 5 }];
    expect(lowStockItems(items).length).toBe(1);
  });
});

describe("recipeMovements", () => {
  const recipe = [{ stockItemId: "a", qtyPerUnit: 0.1 }, { stockItemId: "b", qtyPerUnit: 2 }];
  it("deducts (negative) scaled by qty", () => {
    expect(recipeMovements(recipe, 3, -1)).toEqual([{ stockItemId: "a", qty: -0.3 }, { stockItemId: "b", qty: -6 }]);
  });
  it("reverses (positive)", () => {
    expect(recipeMovements(recipe, 1, 1)).toEqual([{ stockItemId: "a", qty: 0.1 }, { stockItemId: "b", qty: 2 }]);
  });
});

describe("kds helpers", () => {
  it("advances ticket state", () => {
    expect(nextTicketState("NEW")).toBe("PREPARING");
    expect(nextTicketState("READY")).toBe("SERVED");
    expect(nextTicketState("SERVED")).toBeNull();
  });
  it("elapsedMinutes computes whole minutes", () => {
    const now = new Date("2025-01-01T10:10:00Z");
    expect(elapsedMinutes("2025-01-01T10:00:00Z", now)).toBe(10);
  });
  it("groups by station", () => {
    const g = groupByStation([{ station: "momo" }, { station: "grill" }, { station: "momo" }]);
    expect(g.momo.length).toBe(2);
    expect(g.grill.length).toBe(1);
  });
});
