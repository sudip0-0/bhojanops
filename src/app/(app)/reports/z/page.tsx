import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { paymentMix, sum } from "@/lib/reports";
import { formatNPR } from "@/lib/nepal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { DatePicker } from "@/components/ui/date-range-picker";

export default async function ZReportPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requirePermission("reports.view");
  const sp = await searchParams;
  const day = sp.date ? new Date(sp.date) : new Date();
  const from = new Date(day); from.setHours(0, 0, 0, 0);
  const to = new Date(day); to.setHours(23, 59, 59, 999);
  const dayStr = from.toISOString().slice(0, 10);

  const billWhere: Record<string, unknown> = { createdAt: { gte: from, lte: to } };
  if (user.branchId) billWhere.branchId = user.branchId;
  const shiftWhere: Record<string, unknown> = { status: "CLOSED", closedAt: { gte: from, lte: to } };
  if (user.branchId) shiftWhere.branchId = user.branchId;
  const voidWhere: Record<string, unknown> = { status: "APPROVED", createdAt: { gte: from, lte: to } };
  if (user.branchId) voidWhere.orderItem = { order: { branchId: user.branchId } };

  const [bills, refunds, voids, shifts] = await Promise.all([
    prisma.bill.findMany({ where: billWhere, include: { payments: true } }),
    prisma.refund.findMany({ where: { createdAt: { gte: from, lte: to }, ...(user.branchId ? { bill: { branchId: user.branchId } } : {}) } }),
    prisma.voidRequest.count({ where: voidWhere }),
    prisma.shift.findMany({ where: shiftWhere, include: { cashier: { select: { name: true } } }, orderBy: { closedAt: "asc" } }),
  ]);

  const gross = sum(bills, (b) => b.grandTotal);
  const vat = sum(bills, (b) => b.vatAmount);
  const net = sum(bills, (b) => b.netAmount);
  const discounts = sum(bills, (b) => b.discountAmt);
  const outstanding = sum(bills, (b) => b.outstanding);
  const mix = paymentMix(bills.flatMap((b) => b.payments));
  const totalVariance = sum(shifts, (s) => s.variance ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Z Report (day-end)</h1>
        <DatePicker value={dayStr} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Kpi label="Gross" value={formatNPR(gross)} />
        <Kpi label="Net" value={formatNPR(net)} />
        <Kpi label="VAT" value={formatNPR(vat)} />
        <Kpi label="Discounts" value={formatNPR(discounts)} />
        <Kpi label="Bills" value={String(bills.length)} />
        <Kpi label="Credit due" value={formatNPR(outstanding)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payment Mix</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {mix.length === 0 && <p className="text-muted-foreground">No sales.</p>}
            {mix.map((m) => <div key={m.name} className="flex justify-between"><span>{m.name}</span><span>{formatNPR(m.value)}</span></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Voids / Refunds</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Approved voids</span><span>{voids}</span></div>
            <div className="flex justify-between"><span>Refunds</span><span>{refunds.length} · {formatNPR(sum(refunds, (r) => r.amount))}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Shift Cash Reconciliation · net variance {formatNPR(totalVariance)}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {shifts.length === 0 && <p className="text-muted-foreground">No shifts closed on this day.</p>}
          {shifts.map((s) => (
            <div key={s.id} className="flex justify-between border-b py-1">
              <span>{s.cashier.name}</span>
              <span>Expected {formatNPR(s.expectedCash ?? 0)} · Counted {formatNPR(s.countedCash ?? 0)} · Var {formatNPR(s.variance ?? 0)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

