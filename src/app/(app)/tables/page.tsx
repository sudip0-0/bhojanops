import Link from "next/link";
import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createOrder } from "@/app/(app)/orders/actions";

const STATE_COLOR: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-amber-100 text-amber-800",
  ORDERED: "bg-blue-100 text-blue-800",
  BILL_REQUESTED: "bg-purple-100 text-purple-800",
  CLEANING: "bg-gray-100 text-gray-800",
  DISABLED: "bg-red-100 text-red-700",
};

export default async function TablesPage() {
  const user = await requirePermission("order.create");
  const where = user.branchId ? { id: user.branchId } : {};
  const branches = await prisma.branch.findMany({
    where,
    include: {
      floors: {
        orderBy: { name: "asc" },
        include: {
          tables: {
            where: { state: { not: "DISABLED" } },
            orderBy: { name: "asc" },
            include: { orders: { where: { status: { in: ["DRAFT", "OPEN"] } }, select: { id: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tables & Orders</h1>
        <div className="flex gap-2">
          <form action={createOrder}><input type="hidden" name="type" value="TAKEAWAY" /><Button type="submit" size="sm" variant="outline">New Takeaway</Button></form>
          <form action={createOrder}><input type="hidden" name="type" value="DELIVERY" /><Button type="submit" size="sm" variant="outline">New Delivery</Button></form>
        </div>
      </div>

      {branches.map((branch) => (
        <Card key={branch.id}>
          <CardHeader><CardTitle>{branch.name}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {branch.floors.length === 0 && <p className="text-sm text-muted-foreground">No floors/tables yet. Add them in Floors &amp; Tables.</p>}
            {branch.floors.map((floor) => (
              <div key={floor.id} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">{floor.name}</h2>
                {floor.tables.length === 0 && <p className="text-xs text-muted-foreground">No tables on this floor.</p>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {floor.tables.map((t) => {
                    const open = t.orders[0];
                    return (
                      <div key={t.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{t.name}</span>
                          <Badge className={STATE_COLOR[t.state]}>{t.state.toLowerCase().replace("_", " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.seats} seats</p>
                        {open ? (
                          <Button asChild size="sm" className="mt-2 w-full"><Link href={`/orders/${open.id}`}>Open order</Link></Button>
                        ) : (
                          <form action={createOrder} className="mt-2">
                            <input type="hidden" name="type" value="DINE_IN" />
                            <input type="hidden" name="tableId" value={t.id} />
                            <Button type="submit" size="sm" variant="outline" className="w-full">New order</Button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
