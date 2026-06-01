import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/confirm-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNPR } from "@/lib/nepal";
import { openShift, closeShift } from "./actions";

export default async function ShiftsPage() {
  const user = await requirePermission("shift.open");
  const open = await prisma.shift.findFirst({
    where: { cashierId: user.id, status: "OPEN" },
    include: { bills: { include: { payments: true, refunds: true } } },
  });
  const history = await prisma.shift.findMany({
    where: { cashierId: user.id, status: "CLOSED" }, orderBy: { closedAt: "desc" }, take: 8,
  });

  let summary = null as null | { mix: Record<string, number>; refunds: number; discounts: number; count: number };
  if (open) {
    const mix: Record<string, number> = {};
    for (const b of open.bills) for (const p of b.payments) mix[p.method] = (mix[p.method] ?? 0) + p.amount;
    summary = {
      mix,
      refunds: open.bills.flatMap((b) => b.refunds).reduce((s, r) => s + r.amount, 0),
      discounts: open.bills.reduce((s, b) => s + b.discountAmt, 0),
      count: open.bills.length,
    };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shifts & Cash Drawer</h1>

      {!open ? (
        <Card>
          <CardHeader><CardTitle>Open a Shift</CardTitle></CardHeader>
          <CardContent>
            <form action={openShift} className="flex items-end gap-2">
              <label className="text-sm">Opening cash<Input name="openingCash" type="number" defaultValue={0} className="h-8 w-28" /></label>
              <Button type="submit">Open shift</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Current Shift</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Opened: {new Date(open.openedAt).toLocaleString("en-GB")} · Opening cash {formatNPR(open.openingCash)}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Bills" value={String(summary!.count)} />
              <Stat label="Discounts" value={formatNPR(summary!.discounts)} />
              <Stat label="Refunds" value={formatNPR(summary!.refunds)} />
              {Object.entries(summary!.mix).map(([m, v]) => <Stat key={m} label={m} value={formatNPR(v)} />)}
            </div>
            <form action={closeShift} className="flex flex-wrap items-end gap-2 border-t pt-3">
              <input type="hidden" name="shiftId" value={open.id} />
              <label className="text-sm">Counted cash<Input name="countedCash" type="number" className="h-8 w-28" required /></label>
              <Input name="reason" placeholder="Variance reason (if any)" className="h-8 w-56" />
              <ConfirmButton confirmMessage="Close this shift? Expected cash and variance will be locked in." variant="destructive">Close shift</ConfirmButton>
            </form>
            <p className="text-xs text-muted-foreground">Expected cash & variance are computed on close. Variance &gt; NPR 500 requires a reason and manager review.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Shift History</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {history.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b py-1">
              <span>{s.closedAt ? new Date(s.closedAt).toLocaleString("en-GB") : ""}</span>
              <span>Expected {formatNPR(s.expectedCash ?? 0)} · Counted {formatNPR(s.countedCash ?? 0)}</span>
              <Badge className={Math.abs(s.variance ?? 0) > 500 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800"}>
                Var {formatNPR(s.variance ?? 0)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border p-2"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>;
}
