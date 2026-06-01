import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac/can";
import { prisma } from "@/lib/prisma";
import { formatNPR, toBikramSambat } from "@/lib/nepal";
import { Input } from "@/components/ui/input";
import { PrintButton } from "@/components/print-button";
import { ConfirmButton } from "@/components/confirm-button";
import { refundBill } from "@/app/(app)/billing/actions";

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requirePermission("bill.create");
  const { orderId } = await params;
  const bill = await prisma.bill.findUnique({
    where: { orderId },
    include: { items: true, payments: true, branch: { include: { restaurant: true } }, order: { include: { table: true } }, cashier: true, refunds: true, customer: true },
  });
  if (!bill) notFound();
  const r = bill.branch.restaurant;
  const isTax = bill.receiptMode === "TAX";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 no-print">
        <PrintButton />
        {can(user.permissions, "bill.refund") && bill.status !== "REFUNDED" && (
          <form action={refundBill} className="flex items-end gap-1">
            <input type="hidden" name="billId" value={bill.id} />
            <Input name="amount" type="number" step="0.01" placeholder="Amount (blank = full)" aria-label="Refund amount" className="h-9 w-40" />
            <Input name="reason" placeholder="Refund reason" className="h-9 w-44" required />
            <ConfirmButton confirmMessage="Refund this bill? A full refund reverses stock for served items and cannot be undone." variant="destructive">Refund</ConfirmButton>
          </form>
        )}
        {bill.status === "REFUNDED" && <span className="self-center font-semibold text-destructive">REFUNDED</span>}
        {bill.status === "PARTIALLY_REFUNDED" && <span className="self-center font-semibold text-amber-600">PARTIALLY REFUNDED</span>}
      </div>

      <div className="receipt-print mx-auto w-[80mm] bg-white p-3 font-mono text-[11px] leading-tight text-black">
        <div className="text-center">
          <p className="text-sm font-bold">{r.displayName}</p>
          <p>{r.address}</p>
          <p>Tel: {r.phone}</p>
          <p>PAN/VAT: {r.panVat}</p>
          <p className="mt-1 font-bold">{isTax ? "TAX INVOICE" : "RECEIPT"}</p>
        </div>
        <hr className="my-1 border-dashed border-black" />
        <div className="flex justify-between"><span>Invoice:</span><span>{bill.invoiceNumber}</span></div>
        <div className="flex justify-between"><span>Date:</span><span>{new Date(bill.createdAt).toLocaleString("en-GB")}</span></div>
        <div className="flex justify-between"><span>Miti:</span><span>{toBikramSambat(new Date(bill.createdAt))}</span></div>
        <div className="flex justify-between"><span>Type:</span><span>{bill.order.table ? `Table ${bill.order.table.name}` : bill.order.type}</span></div>
        <div className="flex justify-between"><span>Cashier:</span><span>{bill.cashier.name}</span></div>
        <hr className="my-1 border-dashed border-black" />
        <table className="w-full">
          <thead>
            <tr className="border-b border-dashed border-black"><th className="text-left">Item</th><th className="text-center">Qty</th><th className="text-right">Amt</th></tr>
          </thead>
          <tbody>
            {bill.items.map((it) => (
              <tr key={it.id}><td className="text-left">{it.name}</td><td className="text-center">{it.qty}</td><td className="text-right">{it.lineTotal.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
        <hr className="my-1 border-dashed border-black" />
        <Line label="Subtotal" value={bill.subtotal} />
        {bill.discountAmt > 0 && <Line label="Discount" value={-bill.discountAmt} />}
        {bill.serviceCharge > 0 && <Line label="Service Charge" value={bill.serviceCharge} />}
        {bill.packaging > 0 && <Line label="Packaging" value={bill.packaging} />}
        {isTax && (<><Line label="Taxable (net)" value={bill.netAmount} /><Line label={`VAT ${r.vatRate}%`} value={bill.vatAmount} /></>)}
        {bill.roundOff !== 0 && <Line label="Round Off" value={bill.roundOff} />}
        <div className="flex justify-between border-t border-black pt-1 text-xs font-bold"><span>GRAND TOTAL</span><span>{formatNPR(bill.grandTotal)}</span></div>
        <hr className="my-1 border-dashed border-black" />
        <p className="font-bold">Payments:</p>
        {bill.payments.map((p) => (
          <div key={p.id} className="flex justify-between"><span>{p.method}{p.reference ? ` (${p.reference})` : ""}</span><span>{p.amount.toFixed(2)}</span></div>
        ))}
        {bill.outstanding > 0 && (
          <div className="flex justify-between font-bold"><span>CREDIT due{bill.customer ? ` (${bill.customer.name})` : ""}</span><span>{bill.outstanding.toFixed(2)}</span></div>
        )}
        {bill.refunds.length > 0 && <p className="mt-1 font-bold text-black">** REFUNDED: {bill.refunds.map((rf) => rf.reason).join("; ")} **</p>}
        <hr className="my-1 border-dashed border-black" />
        <p className="text-center">{r.receiptFooter}</p>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between"><span>{label}</span><span>{value.toFixed(2)}</span></div>;
}
