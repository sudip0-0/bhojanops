import { requirePermission } from "@/lib/auth-helpers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; userId?: string; from?: string; to?: string; page?: string }> }) {
  const user = await requirePermission("audit.view");
  const sp = await searchParams;
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Record<string, unknown> = {};
  if (sp.action) where.action = { contains: sp.action, mode: "insensitive" };
  if (sp.userId && sp.userId !== "all") where.userId = sp.userId;
  if (sp.from || sp.to) {
    where.createdAt = {
      ...(sp.from ? { gte: new Date(sp.from) } : {}),
      ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59`) } : {}),
    };
  }
  if (user.branchId) where.branchId = user.branchId; // branch-scoped unless owner/auditor (null branch)

  const [logs, users, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, include: { user: true } }),
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs <span className="text-sm font-normal text-muted-foreground">(read-only)</span></h1>
      <form className="flex flex-wrap items-end gap-2">
        <label className="text-xs">Action<Input name="action" defaultValue={sp.action} placeholder="e.g. bill.finalize" className="h-8 w-44" /></label>
        <label className="text-xs">User
          <Select name="userId" defaultValue={sp.userId || "all"}>
            <SelectTrigger aria-label="Filter by user" className="ml-1 mt-1 h-8 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs">From<Input type="date" name="from" defaultValue={sp.from} className="h-8" /></label>
        <label className="text-xs">To<Input type="date" name="to" defaultValue={sp.to} className="h-8" /></label>
        <Button type="submit" size="sm" variant="outline">Filter</Button>
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
