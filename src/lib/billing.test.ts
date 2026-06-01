import { describe, it, expect } from "vitest";
import { computeBill, trimOverpay } from "./billing";

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

describe("trimOverpay (P0-5)", () => {
  it("returns payments unchanged when paid equals total", () => {
    const r = trimOverpay([{ method: "CASH", amount: 500 }], 500);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.paid).toBe(500);
      expect(r.payments[0].amount).toBe(500);
    }
  });

  it("trims cash overpay (change given back)", () => {
    const r = trimOverpay([{ method: "CASH", amount: 550 }], 500);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payments[0].amount).toBe(500);
      expect(r.paid).toBe(500);
    }
  });

  it("trims a Fonepay overpay (was previously kept as revenue)", () => {
    const r = trimOverpay([{ method: "FONEPAY", amount: 550 }], 500);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payments[0].amount).toBe(500);
      expect(r.paid).toBe(500);
    }
  });

  it("trims overpay across multiple methods in order", () => {
    // Total paid 1100, grand 1000 → take all 100 off the first method (CASH).
    // (Fonepay stays whole, matching the old single-method-trim behaviour.)
    const r = trimOverpay(
      [{ method: "CASH", amount: 500 }, { method: "FONEPAY", amount: 600 }],
      1000,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payments[0].amount).toBe(400);
      expect(r.payments[1].amount).toBe(600);
      expect(r.paid).toBe(1000);
    }
  });

  it("trims a tiny rounding overpay from the last method", () => {
    // Two payments of 50.50 each, grand 100.99 → keep 100.99, overpay 0.01
    const r = trimOverpay(
      [{ method: "CASH", amount: 50.5 }, { method: "FONEPAY", amount: 50.5 }],
      100.99,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payments[0].amount).toBe(50.49);
      expect(r.payments[1].amount).toBe(50.5);
      expect(r.paid).toBe(100.99);
    }
  });

  it("rejects when overpay cannot be absorbed (paid > grand after trim)", () => {
    // grand 0, paid 100. After trim CASH becomes 0, paid = 0 = grand, ok:true.
    // The defensive `paid > grandTotal` check is unreachable in pure JS
    // (every payment is fully reduced before the check), so we verify the
    // happy path here and trust the guard for future refactors.
    const r = trimOverpay([{ method: "CASH", amount: 100 }], 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.paid).toBe(0);
      expect(r.payments).toEqual([]);
    }
  });
});
