"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { assertSameBranch } from "@/lib/scope";
import { can } from "@/lib/rbac/can";
import { writeAudit } from "@/lib/audit";
import { expectedCash, variance, isLargeVariance } from "@/lib/shift";

async function resolveBranchId(userBranchId: string | null): Promise<string> {
  if (userBranchId) return userBranchId;
  return (await prisma.branch.findFirstOrThrow()).id;
}

export async function openShift(formData: FormData) {
  const user = await authorize("shift.open");
  const { openingCash } = z.object({ openingCash: z.coerce.number().min(0) }).parse(Object.fromEntries(formData));
  const existing = await prisma.shift.findFirst({ where: { cashierId: user.id, status: "OPEN" } });
  if (existing) throw new Error("You already have an open shift.");
  const branchId = await resolveBranchId(user.branchId);
  await assertSameBranch(user, branchId);
  const shift = await prisma.shift.create({ data: { branchId, cashierId: user.id, openingCash, status: "OPEN" } });
  await writeAudit({ userId: user.id, branchId, action: "shift.open", entity: "Shift", entityId: shift.id, meta: { openingCash } });
  revalidatePath("/shifts");
}

export async function closeShift(formData: FormData) {
  const user = await authorize("shift.close");
  const { shiftId, countedCash, reason } = z
    .object({ shiftId: z.string(), countedCash: z.coerce.number().min(0), reason: z.string().optional() })
    .parse(Object.fromEntries(formData));
  const shift = await prisma.shift.findUniqueOrThrow({ where: { id: shiftId }, include: { bills: { include: { payments: true, refunds: true } } } });
  await assertSameBranch(user, shift.branchId);
  // Only the cashier who opened the shift, or a manager who can approve variance, may close it.
  if (shift.cashierId !== user.id && !can(user.permissions, "shift.approve")) {
    throw new Error("FORBIDDEN_SHIFT");
  }
  if (shift.status === "CLOSED") return;

  const cashPayments = shift.bills.flatMap((b) => b.payments).filter((p) => p.method === "CASH").reduce((s, p) => s + p.amount, 0);
  const refunds = shift.bills.flatMap((b) => b.refunds).reduce((s, r) => s + r.amount, 0);
  const expected = expectedCash(shift.openingCash, cashPayments, refunds);
  const v = variance(countedCash, expected);

  if (isLargeVariance(v) && !reason) throw new Error("Large variance requires a reason (and manager approval).");

  await prisma.shift.update({
    where: { id: shiftId },
    data: { status: "CLOSED", countedCash, expectedCash: expected, variance: v, varianceReason: reason || null, closedAt: new Date() },
  });
  await writeAudit({ userId: user.id, branchId: shift.branchId, action: "shift.close", entity: "Shift", entityId: shiftId, reason, meta: { expected, countedCash, variance: v, large: isLargeVariance(v) } });
  revalidatePath("/shifts");
}
