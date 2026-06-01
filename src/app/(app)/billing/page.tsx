import Link from "next/link";
import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNPR } from "@/lib/nepal";

export default async function BillingPage() {
  const user = await requirePermission("bill.create");
  const branchWhere = user.branchId ? { branchId: user.branchId } : {};
  const [open, bills] = await Promise.all([
    prisma.order.findMany({ where: { status: "OPEN", ...branchWhere }, orderBy: { number: "desc" }, include: { table: true } }),
    prisma.bill.findMany({ where: branchWhere, orderBy: { createdAt: "desc" }, take: 10, include: { order: true } }),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Open Orders to Settle</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {open.length === 0 && <p className="text-sm text-muted-foreground">No open orders.</p>}
          {open.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <span>#{o.number} · {o.table ? o.table.name : o.type}</span>
              <Button asChild size="sm"><Link href={`/billing/${o.id}`}>Settle</Link></Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent Bills</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {bills.map((b) => (
            <Link key={b.id} href={`/billing/${b.orderId}/receipt`} className="flex justify-between rounded border p-2 hover:bg-accent">
              <span>{b.invoiceNumber}</span><span>{formatNPR(b.grandTotal)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
