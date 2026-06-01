import { requirePermission } from "@/lib/auth-helpers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const KNOWN_ACTIONS = [
  "all",
  "order.create",
  "order.send",
  "bill.finalize",
  "bill.refund",
  "bill.refund.partial",
  "discount.apply",
  "kds.advance",
  "shift.open",
  "shift.close",
  "void.request",
  "void.approve",
  "void.reject",
  "menu.update",
  "user.create",
  "user.toggle",
  "settings.update",
  "branch.create",
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; userId?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requirePermission("audit.view");
  const sp = await searchParams;
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Record<string, unknown> = {};
  if (sp.action && sp.action !== "all") where.action = { contains: sp.action, mode: "insensitive" };
  if (sp.userId && sp.userId !== "all") where.userId = sp.userId;
  if (sp.from || sp.to) {
    where.createdAt = {
      ...(sp.from ? { gte: new Date(sp.from) } : {}),
      ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}),
    };
  }
  if (user.branchId) where.branchId = user.branchId;

  const [logs, users, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { user: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.auditLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.action) u.set("action", sp.action);
    if (sp.userId) u.set("userId", sp.userId);
    if (sp.from) u.set("from", sp.from);
    if (sp.to) u.set("to", sp.to);
    u.set("page", String(p));
    return `?${u.toString()}`;
  };

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs <span className="text-sm font-normal text-muted-foreground">(read-only)</span></h1>
      <form className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-0.5 text-xs">
          <span>Action</span>
          <select
            name="action"
            defaultValue={sp.action || "all"}
            className="h-8 w-48 rounded-md border bg-background px-2 text-sm"
            aria-label="Filter by action"
          >
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All actions" : a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span>User</span>
          <select
            name="userId"
            defaultValue={sp.userId || "all"}
            className="h-8 w-44 rounded-md border bg-background px-2 text-sm"
            aria-label="Filter by user"
          >
            <option value="all">All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span>From</span>
          <Input type="date" name="from" defaultValue={sp.from} className="h-8" />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          <span>To</span>
          <Input type="date" name="to" defaultValue={sp.to} className="h-8" />
        </label>
        <Button type="submit" size="sm" variant="outline">Filter</Button>
        <Link
          href={`/audit?from=${today}&to=${today}`}
          className="rounded-full border bg-muted/40 px-3 py-1 text-xs hover:bg-muted"
        >
          Today
        </Link>
        <Link
          href="/audit"
          className="rounded-full border bg-muted/40 px-3 py-1 text-xs hover:bg-muted"
        >
          Clear
        </Link>
      </form>

      <Card>
        <CardHeader><CardTitle>{total} entries · page {page}/{totalPages}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {logs.length === 0 && <p className="text-muted-foreground">No matching entries.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between border-b py-1">
              <div>
                <Badge className="mr-2">{l.action}</Badge>
                <span className="text-muted-foreground">{l.user?.name ?? "system"}</span>
                {l.entity && <span className="ml-2 text-xs text-muted-foreground">{l.entity} {l.entityId?.slice(0, 6)}</span>}
                {l.reason && <span className="ml-2 text-xs italic">“{l.reason}”</span>}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString("en-GB")}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            {page > 1 ? <Link className="text-primary underline" href={qs(page - 1)}>← Previous</Link> : <span />}
            {page < totalPages ? <Link className="text-primary underline" href={qs(page + 1)}>Next →</Link> : <span />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
