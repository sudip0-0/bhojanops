"use client";

import { useMemo, useState } from "react";
import { useActionState, useEffect } from "react";
import { computeBill, trimOverpay, type PaymentMethod } from "@/lib/billing";
import { formatNPR } from "@/lib/nepal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { finalizeBill } from "@/app/(app)/billing/actions";

type Line = { name: string; unitPrice: number; qty: number; taxable?: boolean };
type Payment = { method: PaymentMethod; amount: number; reference?: string };
const METHODS: PaymentMethod[] = ["CASH", "FONEPAY", "ESEWA", "KHALTI", "BANK", "CARD", "CREDIT"];

export function BillSettle({
  orderId, lines, serviceChargePct, packaging, vatRate, canDiscount,
}: { orderId: string; lines: Line[]; serviceChargePct: number; packaging: number; vatRate: number; canDiscount: boolean }) {
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([{ method: "CASH", amount: 0, reference: "" }]);
  const [error, formAction, pending] = useActionState(finalizeBill, undefined);
  useEffect(() => { if (error) toast(error, "error"); }, [error]);

  const totals = useMemo(
    () => computeBill({
      lines, serviceChargePct, packaging, vatRate,
      discountType: (discountType || null) as "PERCENT" | "AMOUNT" | null,
      discountValue,
    }),
    [lines, discountType, discountValue, serviceChargePct, packaging, vatRate]
  );

  // Use the same trimOverpay helper the server action uses, so the UI's
  // "would this overpay?" check stays in lock-step with the action.
  const trimmed = useMemo(
    () => trimOverpay(
      payments.map((p) => ({ method: p.method, amount: Number(p.amount) || 0 })),
      totals.grandTotal,
    ),
    [payments, totals.grandTotal],
  );
  // trimOverpay returns { ok:false } only in a defensive case; fall back to
  // the raw overpay so the UI still warns correctly.
  const paid = trimmed.ok ? trimmed.paid : totals.grandTotal;
  const overpay = Math.max(0, paid - totals.grandTotal);
  const balance = Math.round((totals.grandTotal - paid) * 100) / 100;

  const setPayment = (i: number, patch: Partial<Payment>) =>
    setPayments((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const fillExactCash = () => setPayment(0, { amount: totals.grandTotal });

  const trimToExact = () => {
    // Walk payments in order, reduce each by the overpay until zero.
    let remaining = overpay;
    setPayments((ps) =>
      ps.map((p) => {
        if (remaining <= 0) return p;
        const d = Math.min(Number(p.amount) || 0, remaining);
        remaining = Math.round((remaining - d) * 100) / 100;
        return { ...p, amount: Math.max(0, Math.round(((Number(p.amount) || 0) - d) * 100) / 100) };
      }),
    );
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="discountType" value={discountType} />
      <input type="hidden" name="discountValue" value={discountValue} />
      <input type="hidden" name="payments" value={JSON.stringify(payments.filter((p) => Number(p.amount) > 0))} />

      <div className="rounded border p-3 text-sm">
        <Row label="Subtotal (incl. VAT)" value={totals.subtotal} />
        {totals.discountAmt > 0 && <Row label="Discount" value={-totals.discountAmt} />}
        {totals.serviceCharge > 0 && <Row label={`Service charge (${serviceChargePct}%)`} value={totals.serviceCharge} />}
        {totals.packaging > 0 && <Row label="Packaging" value={totals.packaging} />}
        <Row label={`VAT ${vatRate}% (incl.)`} value={totals.vat} muted />
        {totals.roundOff !== 0 && <Row label="Round off" value={totals.roundOff} muted />}
        <div className="mt-1 flex justify-between border-t pt-1 text-base font-bold">
          <span>Grand Total</span><span>{formatNPR(totals.grandTotal)}</span>
        </div>
      </div>

      {canDiscount && (
        <div className="flex items-end gap-2">
          <label className="text-xs">Discount type
            <Select value={discountType || "none"} onValueChange={(v) => setDiscountType(v === "none" ? "" : v)}>
              <SelectTrigger aria-label="Discount type" className="ml-1 mt-1 h-8 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="PERCENT">Percent</SelectItem>
                <SelectItem value="AMOUNT">Amount</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {discountType && <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="h-8 w-24" />}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Payments (split supported)</p>
        {payments.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select value={p.method} onValueChange={(v) => setPayment(i, { method: v as PaymentMethod })}>
              <SelectTrigger aria-label="Payment method" className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={p.amount}
              onChange={(e) => setPayment(i, { amount: Number(e.target.value) })}
              placeholder="Amount"
              aria-label="Payment amount"
              aria-invalid={overpay > 0 || undefined}
              className={`h-8 w-28 ${overpay > 0 ? "border-destructive" : ""}`}
            />
            <Input value={p.reference ?? ""} onChange={(e) => setPayment(i, { reference: e.target.value })} placeholder="Ref (optional)" aria-label="Payment reference" className="h-8" />
            {payments.length > 1 && <Button type="button" size="sm" variant="ghost" aria-label="Remove payment row" onClick={() => setPayments((ps) => ps.filter((_, idx) => idx !== i))}>✕</Button>}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setPayments((ps) => [...ps, { method: "CASH", amount: 0, reference: "" }])}>+ Payment</Button>
          <Button type="button" size="sm" variant="ghost" onClick={fillExactCash}>Exact cash</Button>
          {overpay > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={trimToExact}>
              Trim to exact
            </Button>
          )}
          <span
            aria-live="polite"
            className={`text-sm ${
              overpay > 0 ? "font-semibold text-destructive" : balance > 0 ? "text-amber-700" : "text-green-700"
            }`}
          >
            {overpay > 0
              ? `Overpayment of ${formatNPR(overpay)} is not allowed`
              : balance > 0
              ? `Balance ${formatNPR(balance)} (→ credit)`
              : "Settled"}
          </span>
        </div>
      </div>

      {balance > 0 && !overpay && (
        <div className="flex items-end gap-2 rounded border border-amber-300 bg-amber-50 p-2">
          <label className="text-xs">Customer name (credit)
            <Input name="customerName" className="h-8" placeholder="Required for unpaid balance" />
          </label>
          <label className="text-xs">Phone
            <Input name="customerPhone" className="h-8 w-32" placeholder="Optional" />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending || overpay > 0}>
        {pending ? "Finalizing…" : "Finalize & generate invoice"}
      </Button>
    </form>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span><span>{formatNPR(value)}</span>
    </div>
  );
}
