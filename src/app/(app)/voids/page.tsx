import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { Badge } from "@/components/ui/badge";
import { approveVoid, rejectVoid } from "./actions";

export default async function VoidsPage() {
  await requirePermission("void.approve");
  const requests = await prisma.voidRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { orderItem: { include: { order: { select: { number: true } } } } },
  });
  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Void Requests</h1>
      <Card>
        <CardHeader><CardTitle>Pending ({pending.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
          {pending.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <div>
                <p className="font-medium">Order #{r.orderItem.order.number} — {r.orderItem.qty}× {r.orderItem.nameSnapshot}</p>
                <p className="text-muted-foreground">Reason: {r.reason}</p>
              </div>
              <div className="flex gap-2">
                <form action={approveVoid}><input type="hidden" name="id" value={r.id} /><ConfirmButton confirmMessage="Approve this void? Stock for served items will be restored." size="sm">Approve</ConfirmButton></form>
                <form action={rejectVoid}><input type="hidden" name="id" value={r.id} /><ConfirmButton confirmMessage="Reject this void request?" size="sm" variant="outline">Reject</ConfirmButton></form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Decided</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {requests.filter((r) => r.status !== "PENDING").map((r) => (
            <div key={r.id} className="flex justify-between border-b py-1">
              <span>#{r.orderItem.order.number} — {r.orderItem.nameSnapshot}</span>
              <Badge className={r.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}>{r.status.toLowerCase()}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
