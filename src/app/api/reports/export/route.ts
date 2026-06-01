import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac/can";
import { toCSV } from "@/lib/reports";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || !can(user.permissions, "reports.view")) {
    return new Response("Forbidden", { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  const where: Record<string, unknown> = { createdAt: { gte: from, lte: to } };
  if (user.branchId) where.branchId = user.branchId;
  if (user.role === "cashier") where.cashierId = user.id; // cashiers: own bills only

  const bills = await prisma.bill.findMany({ where, include: { payments: true, order: true }, orderBy: { createdAt: "asc" } });

  const headers = ["Invoice", "Date", "Type", "Subtotal", "Discount", "Service", "VAT", "Net", "GrandTotal", "Status", "Payments"];
  const rows = bills.map((b) => [
    b.invoiceNumber,
    new Date(b.createdAt).toISOString(),
    b.order.type,
    b.subtotal, b.discountAmt, b.serviceCharge, b.vatAmount, b.netAmount, b.grandTotal, b.status,
    b.payments.map((p) => `${p.method}:${p.amount}`).join(" "),
  ]);

  const csv = toCSV(headers, rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="sales-${from.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
