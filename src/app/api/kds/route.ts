import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac/can";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !can(user.permissions, "kds.view")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const where = user.branchId ? { order: { branchId: user.branchId } } : {};
  const tickets = await prisma.kitchenTicket.findMany({
    where: { state: { not: "SERVED" }, ...where },
    orderBy: { createdAt: "asc" },
    include: {
      order: { select: { number: true, type: true, table: { select: { name: true } } } },
      items: { where: { state: { not: "VOIDED" } }, select: { id: true, nameSnapshot: true, qty: true, notes: true, state: true } },
    },
  });

  // ETag is a stable hash of the ticket set; if the client passes an
  // If-None-Match header and the set is unchanged, respond 304 to avoid
  // pushing a duplicate JSON body every poll cycle.
  const etagInput = JSON.stringify(
    tickets.map((t) => [t.id, t.state, t.createdAt.toISOString(), t.items.map((i) => [i.id, i.state, i.qty])]),
  );
  const etag = `"${createHash("sha1").update(etagInput).digest("hex")}"`;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ tickets }, { headers: { ETag: etag, "Cache-Control": "no-store" } });
}
