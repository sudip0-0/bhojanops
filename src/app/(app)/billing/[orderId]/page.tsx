import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac/can";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNPR } from "@/lib/nepal";
import { BillSettle } from "@/components/bill-settle";

export default async function BillOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const user = await requirePermission("bill.create");
  const { orderId } = await params;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { include: { menuItem: { select: { taxable: true } } } }, table: true, bill: true } });
  if (!order) redirect("/billing");
  if (order.bill) redirect(`/billing/${orderId}/receipt`);

  const restaurant = await prisma.restaurant.findFirstOrThrow();
  const billable = order.items.filter((i) => i.state !== "VOIDED" && i.state !== "DRAFT");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settle Order #{order.number} {order.table ? `· ${order.table.name}` : `· ${order.type}`}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {billable.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>{i.qty}× {i.nameSnapshot}</span><span>{formatNPR(i.unitPrice * i.qty)}</span>
              </div>
            ))}
            {billable.length === 0 && <p className="text-muted-foreground">No billable items (send to kitchen first).</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Settlement</CardTitle></CardHeader>
          <CardContent>
            {billable.length > 0 && (
              <BillSettle
                orderId={order.id}
                lines={billable.map((i) => ({ name: i.nameSnapshot, unitPrice: i.unitPrice, qty: i.qty, taxable: i.menuItem.taxable }))}
                serviceChargePct={order.type === "DINE_IN" ? restaurant.serviceCharge : 0}
                packaging={order.type === "DINE_IN" ? 0 : restaurant.packaging}
                vatRate={restaurant.vatRate}
                canDiscount={can(user.permissions, "discount.apply")}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
