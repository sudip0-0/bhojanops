export type BillLine = { unitPrice: number; qty: number; taxable?: boolean };
export type DiscountType = "PERCENT" | "AMOUNT";

export type BillInput = {
  lines: BillLine[];
  discountType?: DiscountType | null;
  discountValue?: number;
  serviceChargePct?: number;
  packaging?: number;
  vatRate?: number; // default 13
  maxDiscountPct?: number; // policy cap, default 100
};

export type BillTotals = {
  subtotal: number;
  discountAmt: number;
  afterDiscount: number;
  serviceCharge: number;
  packaging: number;
  base: number; // VAT-inclusive taxable base
  vat: number;
  net: number;
  roundOff: number;
  grandTotal: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * VAT-inclusive billing. Menu prices already include VAT.
 * base = (subtotal - discount) + serviceCharge + packaging; VAT = base * rate/(100+rate).
 * grandTotal rounded to nearest NPR 1; difference recorded as roundOff.
 */
export function computeBill(input: BillInput): BillTotals {
  const vatRate = input.vatRate ?? 13;
  const maxDiscountPct = input.maxDiscountPct ?? 100;

  const subtotal = r2(input.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0));

  let discountAmt = 0;
  if (input.discountType === "PERCENT") {
    const pct = Math.min(Math.max(input.discountValue ?? 0, 0), maxDiscountPct);
    discountAmt = subtotal * (pct / 100);
  } else if (input.discountType === "AMOUNT") {
    discountAmt = Math.max(input.discountValue ?? 0, 0);
  }
  // cap discount so it never exceeds subtotal or the policy percentage
  discountAmt = Math.min(discountAmt, subtotal, subtotal * (maxDiscountPct / 100));
  discountAmt = r2(discountAmt);

  const afterDiscount = r2(subtotal - discountAmt);

  // Split taxable vs non-taxable. Discount is allocated proportionally; service charge
  // and packaging are taxable and added to the taxable base.
  const taxableSubtotal = r2(input.lines.filter((l) => l.taxable !== false).reduce((s, l) => s + l.unitPrice * l.qty, 0));
  const taxableShare = subtotal > 0 ? taxableSubtotal / subtotal : 1;
  const taxableAfterDiscount = r2(afterDiscount * taxableShare);
  const nonTaxableAfterDiscount = r2(afterDiscount - taxableAfterDiscount);

  const serviceCharge = r2(afterDiscount * ((input.serviceChargePct ?? 0) / 100));
  const packaging = r2(input.packaging ?? 0);
  const taxableBase = r2(taxableAfterDiscount + serviceCharge + packaging);
  const base = r2(taxableBase + nonTaxableAfterDiscount);
  const vat = r2((taxableBase * vatRate) / (100 + vatRate));
  const net = r2(base - vat);
  const grandTotal = Math.round(base);
  const roundOff = r2(grandTotal - base);

  return { subtotal, discountAmt, afterDiscount, serviceCharge, packaging, base, vat, net, roundOff, grandTotal };
}

export type PaymentMethod = "CASH" | "FONEPAY" | "ESEWA" | "KHALTI" | "BANK" | "CARD" | "CREDIT";
export type PaymentRow = { method: PaymentMethod; amount: number; reference?: string };

export type TrimResult =
  | { ok: true; payments: PaymentRow[]; paid: number; overpay: number }
  | { ok: false; overpay: number };

/**
 * Trim overpay from any payment method, in submission order. The previous
 * implementation only trimmed CASH, which silently kept Fonepay overpays
 * as recorded revenue (P0-5). When the customer genuinely overpays and
 * no method has enough room to absorb the change, we return ok:false so
 * the caller can reject the bill.
 */
export function trimOverpay(payments: PaymentRow[], grandTotal: number): TrimResult {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const total = r2(payments.reduce((s, p) => s + p.amount, 0));
  let overpay = r2(total - grandTotal);
  if (overpay <= 0) {
    const normalized = payments.map((p) => ({
      method: p.method,
      amount: r2(p.amount),
      ...(p.reference ? { reference: p.reference } : {}),
    }));
    return { ok: true, payments: normalized, paid: total, overpay: 0 };
  }
  const next: PaymentRow[] = payments.map((p) => ({ ...p, amount: r2(p.amount) }));
  for (const p of next) {
    if (overpay > 0 && p.amount > 0) {
      const d = Math.min(p.amount, overpay);
      p.amount = r2(p.amount - d);
      overpay = r2(overpay - d);
    }
  }
  const kept = next.filter((p) => p.amount > 0);
  const paid = r2(kept.reduce((s, p) => s + p.amount, 0));
  if (paid > grandTotal) return { ok: false, overpay: r2(paid - grandTotal) };
  return { ok: true, payments: kept, paid, overpay: 0 };
}
