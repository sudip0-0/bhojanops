import { describe, it, expect } from "vitest";
import { computeBill } from "./billing";

describe("computeBill (VAT-inclusive)", () => {
  it("back-calculates VAT from inclusive price", () => {
    const t = computeBill({ lines: [{ unitPrice: 113, qty: 1 }], vatRate: 13 });
    expect(t.subtotal).toBe(113);
    expect(t.base).toBe(113);
    expect(t.vat).toBe(13);
    expect(t.net).toBe(100);
    expect(t.grandTotal).toBe(113);
    expect(t.roundOff).toBe(0);
  });

  it("applies service charge to discounted base before VAT", () => {
    const t = computeBill({ lines: [{ unitPrice: 100, qty: 2 }], serviceChargePct: 10, vatRate: 13 });
    expect(t.subtotal).toBe(200);
    expect(t.serviceCharge).toBe(20);
    expect(t.base).toBe(220);
    expect(t.grandTotal).toBe(220);
  });

  it("percent discount reduces subtotal", () => {
    const t = computeBill({ lines: [{ unitPrice: 500, qty: 1 }], discountType: "PERCENT", discountValue: 10 });
    expect(t.discountAmt).toBe(50);
    expect(t.afterDiscount).toBe(450);
  });

  it("amount discount is capped at subtotal", () => {
    const t = computeBill({ lines: [{ unitPrice: 100, qty: 1 }], discountType: "AMOUNT", discountValue: 999 });
    expect(t.discountAmt).toBe(100);
    expect(t.afterDiscount).toBe(0);
  });

  it("enforces maxDiscountPct policy cap", () => {
    const t = computeBill({ lines: [{ unitPrice: 1000, qty: 1 }], discountType: "PERCENT", discountValue: 80, maxDiscountPct: 20 });
    expect(t.discountAmt).toBe(200); // capped to 20%
  });

  it("rounds grand total to nearest NPR 1 and records round-off", () => {
    const t = computeBill({ lines: [{ unitPrice: 99.4, qty: 1 }] });
    expect(t.grandTotal).toBe(99);
    expect(t.roundOff).toBeCloseTo(-0.4, 5);
  });

  it("adds packaging charge into base", () => {
    const t = computeBill({ lines: [{ unitPrice: 200, qty: 1 }], packaging: 15 });
    expect(t.base).toBe(215);
    expect(t.grandTotal).toBe(215);
  });

  it("excludes non-taxable items from the VAT base", () => {
    // 113 taxable (VAT 13) + 100 non-taxable (no VAT)
    const t = computeBill({ lines: [{ unitPrice: 113, qty: 1 }, { unitPrice: 100, qty: 1, taxable: false }], vatRate: 13 });
    expect(t.subtotal).toBe(213);
    expect(t.base).toBe(213);
    expect(t.vat).toBe(13); // only on the taxable 113
    expect(t.net).toBe(200);
  });

  it("is unchanged when all lines are taxable (default)", () => {
    const t = computeBill({ lines: [{ unitPrice: 226, qty: 1 }], vatRate: 13 });
    expect(t.vat).toBe(26);
    expect(t.base).toBe(226);
  });
});
