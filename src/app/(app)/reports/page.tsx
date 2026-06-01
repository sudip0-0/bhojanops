import { requirePermission } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac/can";
import { prisma } from "@/lib/prisma";
import { paymentMix, topItems, sum } from "@/lib/reports";
import { formatNPR } from "@/lib/nepal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Kpi } from "@/components/ui/kpi";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requirePermission("reports.view");
  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : new Date();

  const where: Record<string, unknown> = { createdAt: { gte: from, lte: to } };
  if (user.branchId) where.branchId = user.branchId;
  if (user.role === "cashier") where.cashierId = user.id;

  // Scope used to match the parent bill of refunds (branch/cashier), independent of date.
  const billScope: Record<string, unknown> = {};
  if (user.branchId) billScope.branchId = user.branchId;
  if (user.role === "cashier") billScope.cashierId = user.id;

  // Voids are scoped via order -> branch.
  const voidWhere: Record<string, unknown> = { status: "APPROVED", createdAt: { gte: from, lte: to } };
  if (user.branchId) voidWhere.orderItem = { order: { branchId: user.branchId } };

  const [bills, refunds, voids] = await Promise.all([
    prisma.bill.findMany({ where, include: { payments: true, items: true } }),
    // Filter refunds by the refund's own date (not the bill's), within the branch/cashier scope.
    prisma.refund.findMany({ where: { createdAt: { gte: from, lte: to }, bill: billScope }, include: { bill: true } }),
    prisma.voidRequest.count({ where: voidWhere }),
  ]);

  const gross = sum(bills, (b) => b.grandTotal);
  const vat = sum(bills, (b) => b.vatAmount);
  const net = sum(bills, (b) => b.netAmount);
  const discounts = sum(bills, (b) => b.discountAmt);
  const mix = paymentMix(bills.flatMap((b) => b.payments));
  const items = topItems(bills.flatMap((b) => b.items.map((i) => ({ name: i.name, qty: i.qty }))), 10);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex flex-wrap items-end gap-2">
          <DateRangePicker from={fromStr} to={toStr} />
          {can(user.permissions, "reports.view") && (
            <Button asChild size="sm"><a href={`/api/reports/export?from=${fromStr}&to=${toStr}`}>Export CSV</a></Button>
          )}
          <Button asChild size="sm" variant="outline"><a href="/reports/z">Z report</a></Button>
        </div>
      </div>
      {user.role === "cashier" && <p className="text-xs text-muted-foreground">Showing your own bills only.</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Gross Sales" value={formatNPR(gross)} />
        <Kpi label="Net (excl. VAT)" value={formatNPR(net)} />
        <Kpi label="VAT Collected" value={formatNPR(vat)} />
        <Kpi label="Discounts" value={formatNPR(discounts)} />
        <Kpi label="Bills" value={String(bills.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payment Method Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {mix.length === 0 && <p className="text-muted-foreground">No data.</p>}
            {mix.map((m) => <div key={m.name} className="flex justify-between"><span>{m.name}</span><span>{formatNPR(m.value)}</span></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Item Sales (top 10)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {items.map((i) => <div key={i.name} className="flex justify-between"><span>{i.name}</span><span>{i.qty}</span></div>)}
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
    </div>
  );
}

