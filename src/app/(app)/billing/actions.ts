"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac/can";
import { writeAudit } from "@/lib/audit";
import { computeBill } from "@/lib/billing";
import { formatInvoiceNumber } from "@/lib/invoice";
import { nepaliFiscalYear } from "@/lib/nepal";
import { reverseStockForItem } from "@/lib/stock";

const paymentSchema = z.object({
  method: z.enum(["CASH", "FONEPAY", "ESEWA", "KHALTI", "BANK", "CARD", "CREDIT"]),
  amount: z.coerce.number().min(0),
  reference: z.string().optional(),
});

const finalizeSchema = z.object({
  orderId: z.string(),
  discountType: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["PERCENT", "AMOUNT"]).optional().nullable()),
  discountValue: z.coerce.number().min(0).default(0),
  payments: z.string(), // JSON array
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

export async function finalizeBill(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const user = await authorize("bill.finalize");
  const raw = finalizeSchema.parse(Object.fromEntries(formData));
  let payments = z.array(paymentSchema).parse(JSON.parse(raw.payments)).filter((p) => p.amount > 0);

  if (raw.discountValue > 0 && !can(user.permissions, "discount.apply")) {
    return "You are not permitted to apply discounts.";
  }

  const order = await prisma.order.findUnique({
    where: { id: raw.orderId },
    include: { items: { include: { menuItem: { select: { taxable: true } } } }, bill: true, branch: true },
  });
  if (!order) return "Order not found.";
  if (order.bill) redirect(`/billing/${order.id}/receipt`);
  if (order.status === "CLOSED" || order.status === "CANCELLED") return "This order is already closed.";

  // Active-shift guard (no settlement without an open shift for this cashier)
  const shift = await prisma.shift.findFirst({ where: { cashierId: user.id, status: "OPEN" } });
  if (!shift) return "No active shift. Open a shift before settling bills.";

  const restaurant = await prisma.restaurant.findFirstOrThrow();
  const billable = order.items.filter((i) => i.state !== "VOIDED" && i.state !== "DRAFT");
  if (billable.length === 0) return "Nothing to bill. Send items to the kitchen first.";

  const packaging = order.type === "DINE_IN" ? 0 : restaurant.packaging;
  // Discounts above the policy cap require discount.approve.
  const effectiveMaxPct = can(user.permissions, "discount.approve") ? 100 : restaurant.maxDiscountPct;
  if (raw.discountValue > 0) {
    const subtotal = billable.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const requestedPct = raw.discountType === "PERCENT"
      ? raw.discountValue
      : (subtotal > 0 ? (raw.discountValue / subtotal) * 100 : 0);
    if (requestedPct > effectiveMaxPct) {
      return `Discount exceeds the ${restaurant.maxDiscountPct}% limit and needs manager approval.`;
    }
  }
  const totals = computeBill({
    lines: billable.map((i) => ({ unitPrice: i.unitPrice, qty: i.qty, taxable: i.menuItem.taxable })),
    discountType: raw.discountType ?? null,
    discountValue: raw.discountValue,
    serviceChargePct: order.type === "DINE_IN" ? restaurant.serviceCharge : 0,
    packaging,
    vatRate: restaurant.vatRate,
    maxDiscountPct: effectiveMaxPct,
  });

  const r2 = (n: number) => Math.round(n * 100) / 100;
  let paid = r2(payments.reduce((s, p) => s + p.amount, 0));
  // Change given back must not inflate the recorded cash (drawer reconciliation).
  let overpay = r2(paid - totals.grandTotal);
  if (overpay > 0) {
    for (const p of payments) {
      if (p.method === "CASH" && overpay > 0) {
        const d = Math.min(p.amount, overpay);
        p.amount = r2(p.amount - d);
        overpay = r2(overpay - d);
      }
    }
    payments = payments.filter((p) => p.amount > 0);
    paid = r2(payments.reduce((s, p) => s + p.amount, 0));
  }
  const outstanding = r2(Math.max(totals.grandTotal - paid, 0));

  // Credit balance must be attributed to a customer (tracked AR), not a phantom payment.
  if (outstanding > 0 && !raw.customerName?.trim()) {
    return `Unpaid balance ${outstanding}. Enter a customer name for the credit/house account, or collect full payment.`;
  }

  let customerId: string | null = null;
  if (outstanding > 0 && raw.customerName?.trim()) {
    const c = await prisma.customer.create({ data: { name: raw.customerName.trim(), phone: raw.customerPhone?.trim() || null } });
    customerId = c.id;
  }

  let billId: string;
  let invoiceNumber: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const fiscalYear = nepaliFiscalYear();
      const seqRow = await tx.invoiceSequence.upsert({
        where: { branchId_fiscalYear: { branchId: order.branchId, fiscalYear } },
        create: { branchId: order.branchId, fiscalYear, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      const invNo = formatInvoiceNumber(order.branch.invoicePrefix, fiscalYear, seqRow.lastNumber);
      const bill = await tx.bill.create({
        data: {
          branchId: order.branchId, orderId: order.id, invoiceNumber: invNo, cashierId: user.id, shiftId: shift.id,
          subtotal: totals.subtotal, discountType: raw.discountType ?? null, discountValue: raw.discountValue,
          discountAmt: totals.discountAmt, serviceCharge: totals.serviceCharge, packaging: totals.packaging,
          vatAmount: totals.vat, netAmount: totals.net, roundOff: totals.roundOff, grandTotal: totals.grandTotal,
          outstanding, customerId, receiptMode: restaurant.receiptMode, status: "FINALIZED",
          items: { create: billable.map((i) => ({ name: i.nameSnapshot, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.unitPrice * i.qty })) },
          payments: { create: payments.map((p) => ({ method: p.method, amount: p.amount, reference: p.reference || null })) },
        },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "CLOSED" } });
      if (order.tableId) await tx.table.update({ where: { id: order.tableId }, data: { state: "CLEANING" } });
      return { billId: bill.id, invoiceNumber: invNo };
    });
    billId = result.billId;
    invoiceNumber = result.invoiceNumber;
  } catch {
    return "Could not finalize the bill — it may have been settled already. Reload and check the receipt.";
  }

  if (raw.discountValue > 0) {
    await writeAudit({ userId: user.id, branchId: order.branchId, action: "discount.apply", entity: "Bill", entityId: billId, meta: { amount: totals.discountAmt } });
  }
  await writeAudit({ userId: user.id, branchId: order.branchId, action: "bill.finalize", entity: "Bill", entityId: billId, meta: { invoiceNumber, grandTotal: totals.grandTotal, outstanding } });

  redirect(`/billing/${order.id}/receipt`);
}


export async function refundBill(formData: FormData) {
  const user = await authorize("bill.refund");
  const { billId, reason, amount } = z
    .object({ billId: z.string(), reason: z.string().min(1), amount: z.coerce.number().min(0).optional() })
    .parse(Object.fromEntries(formData));
  const bill = await prisma.bill.findUniqueOrThrow({ where: { id: billId }, include: { order: { include: { items: true } }, refunds: true } });
  if (bill.status === "REFUNDED") return;

  const alreadyRefunded = bill.refunds.reduce((s, r) => s + r.amount, 0);
  const remaining = Math.round((bill.grandTotal - alreadyRefunded) * 100) / 100;
  if (remaining <= 0) return;
  // Default to a full refund of the remaining balance when no amount is given.
  const refundAmount = Math.min(amount && amount > 0 ? amount : remaining, remaining);
  const isFull = Math.round((alreadyRefunded + refundAmount) * 100) / 100 >= bill.grandTotal;

  await prisma.refund.create({ data: { billId, amount: refundAmount, reason, approvedById: user.id } });
  await prisma.bill.update({ where: { id: billId }, data: { status: isFull ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  // Reverse stock only on a full refund (line-level reversal would require line selection).
  if (isFull) {
    for (const it of bill.order.items) {
      if (it.stockDeducted) await reverseStockForItem(it.id);
    }
  }
  await writeAudit({ userId: user.id, branchId: bill.branchId, action: isFull ? "bill.refund" : "bill.refund.partial", entity: "Bill", entityId: billId, reason, meta: { amount: refundAmount, full: isFull } });
  redirect(`/billing/${bill.orderId}/receipt`);
}
