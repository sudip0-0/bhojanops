import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth-helpers";
import { landingPath } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { isLowStock } from "@/lib/stock";
import { paymentMix, topItems, sum } from "@/lib/reports";
import { formatNPR } from "@/lib/nepal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentMixChart, TopItemsChart } from "@/components/dashboard-charts";

export default async function DashboardPage() {
  const user = await requirePermission();
  const target = landingPath(user.role);
  if (target !== "/dashboard") redirect(target);

  const branchWhere = user.branchId ? { branchId: user.branchId } : {};
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [bills, openOrders, stock] = await Promise.all([
    prisma.bill.findMany({ where: { createdAt: { gte: todayStart }, ...branchWhere }, include: { payments: true, items: true } }),
    prisma.order.count({ where: { status: "OPEN", ...branchWhere } }),
    prisma.stockItem.findMany({ where: branchWhere }),
  ]);

  const todaySales = sum(bills, (b) => b.grandTotal);
  const avg = bills.length ? Math.round(todaySales / bills.length) : 0;
  const mix = paymentMix(bills.flatMap((b) => b.payments));
  const top = topItems(bills.flatMap((b) => b.items.map((i) => ({ name: i.name, qty: i.qty }))));
  const lowCount = stock.filter(isLowStock).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Today's Sales" value={formatNPR(todaySales)} />
        <Kpi label="Bills Today" value={String(bills.length)} />
        <Kpi label="Open Orders" value={String(openOrders)} />
        <Kpi label="Avg Order Value" value={formatNPR(avg)} />
        <Kpi label="Low Stock Items" value={String(lowCount)} accent={lowCount > 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Payment Mix (today)</CardTitle></CardHeader>
          <CardContent><PaymentMixChart data={mix} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Items (today)</CardTitle></CardHeader>
          <CardContent><TopItemsChart data={top} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-destructive" : ""}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${accent ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
