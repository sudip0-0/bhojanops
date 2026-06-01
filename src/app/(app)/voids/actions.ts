"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { assertSameBranch } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { reverseStockForItem } from "@/lib/stock";

export async function approveVoid(formData: FormData) {
  const user = await authorize("void.approve");
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const vr = await prisma.voidRequest.findUniqueOrThrow({
    where: { id },
    include: { orderItem: { include: { order: { select: { branchId: true } } } } },
  });
  await assertSameBranch(user, vr.orderItem.order.branchId);
  if (vr.status !== "PENDING") return;
  await prisma.voidRequest.update({ where: { id }, data: { status: "APPROVED", decidedById: user.id } });
  await prisma.orderItem.update({ where: { id: vr.orderItemId }, data: { state: "VOIDED" } });
  if (vr.orderItem.stockDeducted) await reverseStockForItem(vr.orderItemId); // restore stock if already served
  await writeAudit({ userId: user.id, action: "void.approve", entity: "OrderItem", entityId: vr.orderItemId, reason: vr.reason });
  revalidatePath("/voids");
}

export async function rejectVoid(formData: FormData) {
  const user = await authorize("void.approve");
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const vr = await prisma.voidRequest.findUniqueOrThrow({
    where: { id },
    include: { orderItem: { include: { order: { select: { branchId: true } } } } },
  });
  await assertSameBranch(user, vr.orderItem.order.branchId);
  if (vr.status !== "PENDING") return;
  await prisma.voidRequest.update({ where: { id }, data: { status: "REJECTED", decidedById: user.id } });
  await writeAudit({ userId: user.id, action: "void.reject", entity: "OrderItem", entityId: vr.orderItemId, reason: vr.reason });
  revalidatePath("/voids");
}
