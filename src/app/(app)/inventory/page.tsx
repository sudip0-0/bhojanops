import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isLowStock } from "@/lib/stock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatNPR } from "@/lib/nepal";
import { createStockItem, recordPurchase, recordMovement, addRecipe } from "./actions";

export default async function InventoryPage() {
  const user = await requirePermission("stock.manage");
  const where = user.branchId ? { branchId: user.branchId } : {};
  const [items, movements, menuItems] = await Promise.all([
    prisma.stockItem.findMany({ where, orderBy: { name: "asc" } }),
    prisma.stockMovement.findMany({
      where: { stockItem: where },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { stockItem: true },
    }),
    prisma.menuItem.findMany({ where: { archived: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const low = items.filter(isLowStock);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory</h1>

      {low.length > 0 && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">Low Stock ({low.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {low.map((i) => <Badge key={i.id} className="bg-red-100 text-red-700">{i.name}: {i.quantity}{i.unit} (≤{i.reorderLevel})</Badge>)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Stock Items</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className={`rounded border p-2 text-sm ${isLowStock(i) ? "border-destructive" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{i.name}</span>
                <span>{i.quantity.toFixed(2)} {i.unit} · {formatNPR(i.cost)}/{i.unit}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <form action={recordPurchase} className="flex items-end gap-1">
                  <input type="hidden" name="stockItemId" value={i.id} />
                  <Input name="qty" type="number" step="0.01" placeholder="Buy qty" className="h-7 w-20" required />
                  <Input name="cost" type="number" step="0.01" placeholder="Cost" defaultValue={i.cost} className="h-7 w-20" />
                  <Input name="supplier" placeholder="Supplier" className="h-7 w-24" />
                  <Button type="submit" size="sm" variant="outline">Purchase</Button>
                </form>
                <form action={recordMovement} className="flex items-end gap-1">
                  <input type="hidden" name="stockItemId" value={i.id} />
                  <Select name="type" defaultValue="WASTAGE">
                    <SelectTrigger aria-label="Movement type" className="h-7 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WASTAGE">Wastage</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjust</SelectItem>
                      <SelectItem value="RETURN">Return</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input name="qty" type="number" step="0.01" placeholder="Qty" className="h-7 w-20" required />
                  <Input name="note" placeholder="Note" className="h-7 w-24" />
                  <Button type="submit" size="sm" variant="ghost">Record</Button>
                </form>
              </div>
            </div>
          ))}
          <form action={createStockItem} className="flex flex-wrap items-end gap-2 border-t pt-3">
            <Input name="name" placeholder="Item name" className="h-8 w-32" required />
            <Input name="unit" placeholder="Unit" className="h-8 w-16" required />
            <Input name="quantity" type="number" step="0.01" placeholder="Opening" className="h-8 w-20" defaultValue={0} />
            <Input name="reorderLevel" type="number" step="0.01" placeholder="Reorder" className="h-8 w-20" defaultValue={0} />
            <Input name="cost" type="number" step="0.01" placeholder="Cost" className="h-8 w-20" defaultValue={0} />
            <Button type="submit" size="sm">Add stock item</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Movements</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {movements.map((m) => (
              <div key={m.id} className="flex justify-between border-b py-1">
                <span>{m.stockItem.name} <Badge className="ml-1">{m.type.toLowerCase()}</Badge></span>
                <span className={m.qty < 0 ? "text-destructive" : "text-green-600"}>{m.qty > 0 ? "+" : ""}{m.qty}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recipe (BOM)</CardTitle></CardHeader>
          <CardContent>
            <form action={addRecipe} className="flex flex-wrap items-end gap-2">
              <Select name="menuItemId" defaultValue={menuItems[0]?.id} required>
                <SelectTrigger aria-label="Menu item" className="h-8 w-40"><SelectValue placeholder="Menu item" /></SelectTrigger>
                <SelectContent>
                  {menuItems.map((mi) => <SelectItem key={mi.id} value={mi.id}>{mi.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select name="stockItemId" defaultValue={items[0]?.id} required>
                <SelectTrigger aria-label="Stock item" className="h-8 w-40"><SelectValue placeholder="Stock item" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input name="qtyPerUnit" type="number" step="0.001" placeholder="Qty/unit" className="h-8 w-24" required />
              <Button type="submit" size="sm">Map ingredient</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
