import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/print-button";
import { MenuItemPicker, type PickerCategory } from "@/components/menu-item-picker";
import { formatNPR } from "@/lib/nepal";
import { orderSubtotal } from "@/lib/order";
import { addLine, removeOrderItem, sendToKitchen, requestVoid, setGuests } from "../actions";
import { KotAutoPrint } from "@/components/kot-auto-print";

const STATE_VARIANT: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
  DRAFT: "neutral", SENT: "info", PREPARING: "warning",
  READY: "success", SERVED: "success", VOIDED: "danger",
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const user = await requirePermission("order.create");
  const { id } = await params;
  const { sent } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: "asc" }, include: { voidRequests: true } }, table: true },
  });
  if (!order) notFound();

  const categoriesRaw = await prisma.menuCategory.findMany({
    orderBy: { sort: "asc" },
    include: {
      items: {
        where: { available: true, archived: false },
        orderBy: { name: "asc" },
        include: { variants: true, modifiers: { include: { modifiers: true } } },
      },
    },
  });
  const categories: PickerCategory[] = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    items: c.items.map((mi) => ({
      id: mi.id,
      name: mi.name,
      nepaliName: mi.nepaliName,
      price: mi.price,
      variants: mi.variants.map((v) => ({ id: v.id, name: v.name, priceDelta: v.priceDelta })),
      modifierGroups: mi.modifiers.map((g) => ({
        id: g.id,
        name: g.name,
        modifiers: g.modifiers.map((m) => ({ id: m.id, name: m.name, price: m.price })),
      })),
    })),
  }));

  const subtotal = orderSubtotal(order.items.map((i) => ({ unitPrice: i.unitPrice, qty: i.qty, state: i.state })));
  const canBill = order.items.some((i) => i.state !== "VOIDED" && i.state !== "DRAFT");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.number} <Badge>{order.type.replace("_", " ")}</Badge></h1>
          <p className="text-sm text-muted-foreground">{order.table ? `Table ${order.table.name}` : "—"} · Status {order.status}</p>
        </div>
        <div className="flex gap-2">
          <form action={sendToKitchen}>
            <input type="hidden" name="orderId" value={order.id} />
            <Button type="submit" disabled={!order.items.some((i) => i.state === "DRAFT")}>Send to kitchen</Button>
          </form>
          <PrintButton label="Print KOT" />
          {canBill && <Button asChild variant="outline"><Link href={`/billing/${order.id}`}>Go to billing</Link></Button>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Items</CardTitle>
            <form action={setGuests} className="flex items-center gap-1 text-xs">
              <input type="hidden" name="orderId" value={order.id} />
              Guests <Input name="guests" type="number" defaultValue={order.guests} className="h-7 w-16" />
              <Button type="submit" size="sm" variant="ghost">Set</Button>
            </form>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
            {order.items.map((it) => {
              const pendingVoid = it.voidRequests.some((v) => v.status === "PENDING");
              return (
                <div key={it.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <span className="font-medium">{it.qty}× {it.nameSnapshot}</span>
                    <Badge className="ml-2" variant={STATE_VARIANT[it.state] ?? "neutral"}>{it.state.toLowerCase()}</Badge>
                    {it.notes && <p className="text-xs text-muted-foreground">Note: {it.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatNPR(it.unitPrice * it.qty)}</span>
                    {it.state === "DRAFT" && (
                      <form action={removeOrderItem}><input type="hidden" name="id" value={it.id} /><ConfirmButton confirmMessage="Remove this draft item?" size="sm" variant="ghost" aria-label={`Remove ${it.nameSnapshot}`}>✕</ConfirmButton></form>
                    )}
                    {it.state !== "DRAFT" && it.state !== "VOIDED" && !pendingVoid && (
                      <form action={requestVoid} className="flex items-center gap-1">
                        <input type="hidden" name="orderItemId" value={it.id} />
                        <Input name="reason" placeholder="void reason" className="h-7 w-28" required />
                        <Button type="submit" size="sm" variant="destructive">Void</Button>
                      </form>
                    )}
                    {pendingVoid && <Badge className="bg-amber-100 text-amber-800">void pending</Badge>}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Subtotal</span><span>{formatNPR(subtotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add Item</CardTitle></CardHeader>
          <CardContent>
            <form id="menu-picker-form" action={addLine} className="space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <MenuItemPicker categories={categories} />
              <div className="flex gap-2">
                <Input name="qty" type="number" defaultValue={1} className="w-20" />
                <Input name="notes" placeholder="Kitchen note (optional)" />
              </div>
              <Button type="submit" className="w-full" data-picker-submit>Add to order</Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">Waiter: {user.name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-print KOT when navigated with ?sent=1 */}
      <KotAutoPrint />

      {/* Print-only Kitchen Order Ticket */}
      <div className="receipt-print mx-auto hidden w-[80mm] bg-white p-3 font-mono text-[12px] leading-tight text-black print:block">
        <p className="text-center text-sm font-bold">KITCHEN ORDER TICKET</p>
        <div className="flex justify-between"><span>Order:</span><span>#{order.number}</span></div>
        <div className="flex justify-between"><span>{order.table ? "Table" : "Type"}:</span><span>{order.table ? order.table.name : order.type}</span></div>
        <div className="flex justify-between"><span>Time:</span><span>{new Date().toLocaleString("en-GB")}</span></div>
        <hr className="my-1 border-dashed border-black" />
        {order.items.filter((i) => i.state !== "VOIDED").length === 0 && <p>No items.</p>}
        {order.items.filter((i) => i.state !== "VOIDED").map((it) => (
          <div key={it.id}>
            <div className="flex justify-between font-bold"><span>{it.qty}× {it.nameSnapshot}</span><span>[{it.station}]</span></div>
            {it.notes && <p className="pl-2 text-[11px]">» {it.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
