import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac/can";

export async function GET() {
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
  return NextResponse.json({ tickets });
}
