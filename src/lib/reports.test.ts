import { describe, it, expect } from "vitest";
import { paymentMix, topItems, sum, toCSV } from "./reports";

describe("paymentMix", () => {
  it("aggregates by method", () => {
    const r = paymentMix([{ method: "CASH", amount: 100 }, { method: "CASH", amount: 50 }, { method: "ESEWA", amount: 30 }]);
    expect(r).toEqual([{ name: "CASH", value: 150 }, { name: "ESEWA", value: 30 }]);
  });
});

describe("topItems", () => {
  it("sums qty and sorts desc", () => {
    const r = topItems([{ name: "Momo", qty: 2 }, { name: "Tea", qty: 5 }, { name: "Momo", qty: 3 }], 2);
    expect(r).toEqual([{ name: "Momo", qty: 5 }, { name: "Tea", qty: 5 }].sort((a, b) => b.qty - a.qty));
    expect(r[0].name).toBe("Momo");
  });
});

describe("sum", () => {
  it("sums a picked field", () => expect(sum([{ a: 1 }, { a: 2.5 }], (r) => r.a)).toBe(3.5));
});

describe("toCSV", () => {
  it("escapes commas and quotes", () => {
    const csv = toCSV(["name", "amt"], [["Veg, Momo", 130], ['He said "hi"', 5]]);
    expect(csv).toBe('name,amt\n"Veg, Momo",130\n"He said ""hi""",5');
  });
});
