"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

async function resolveBranchId(userBranchId: string | null): Promise<string> {
  if (userBranchId) return userBranchId;
  return (await prisma.branch.findFirstOrThrow()).id;
}

export async function createStockItem(formData: FormData) {
  const user = await authorize("stock.manage");
  const d = z.object({
    name: z.string().min(1), unit: z.string().min(1),
    quantity: z.coerce.number().min(0), reorderLevel: z.coerce.number().min(0), cost: z.coerce.number().min(0),
  }).parse(Object.fromEntries(formData));
  const branchId = await resolveBranchId(user.branchId);
  const item = await prisma.stockItem.create({ data: { ...d, branchId } });
  if (d.quantity > 0) await prisma.stockMovement.create({ data: { stockItemId: item.id, type: "ADJUSTMENT", qty: d.quantity, note: "Opening stock" } });
  await writeAudit({ userId: user.id, branchId, action: "stock.create", entity: "StockItem", entityId: item.id });
  revalidatePath("/inventory");
}

export async function recordPurchase(formData: FormData) {
  const user = await authorize("purchase.manage");
  const { stockItemId, qty, cost, supplier } = z.object({
    stockItemId: z.string(), qty: z.coerce.number().min(0.0001), cost: z.coerce.number().min(0), supplier: z.string().optional(),
  }).parse(Object.fromEntries(formData));
  const item = await prisma.stockItem.findUniqueOrThrow({ where: { id: stockItemId } });
  const sup = supplier ? await prisma.supplier.create({ data: { name: supplier } }) : null;
  const purchase = await prisma.purchase.create({
    data: { branchId: item.branchId, supplierId: sup?.id, total: qty * cost, items: { create: [{ stockItemId, qty, cost }] } },
  });
  await prisma.stockMovement.create({ data: { stockItemId, type: "PURCHASE", qty, refId: purchase.id, note: "Purchase" } });
  await prisma.stockItem.update({ where: { id: stockItemId }, data: { quantity: { increment: qty }, cost } });
  await writeAudit({ userId: user.id, branchId: item.branchId, action: "purchase.create", entity: "Purchase", entityId: purchase.id });
  revalidatePath("/inventory");
}

export async function recordMovement(formData: FormData) {
  const user = await authorize("wastage.record");
  const { stockItemId, type, qty, note } = z.object({
    stockItemId: z.string(), type: z.enum(["WASTAGE", "ADJUSTMENT", "RETURN"]), qty: z.coerce.number(), note: z.string().optional(),
  }).parse(Object.fromEntries(formData));
  // wastage reduces stock (store negative); adjustment/return use signed value as entered
  const signedQty = type === "WASTAGE" ? -Math.abs(qty) : qty;
  const item = await prisma.stockItem.findUniqueOrThrow({ where: { id: stockItemId } });
  await prisma.stockMovement.create({ data: { stockItemId, type, qty: signedQty, note: note || null } });
  await prisma.stockItem.update({ where: { id: stockItemId }, data: { quantity: { increment: signedQty } } });
  await writeAudit({ userId: user.id, branchId: item.branchId, action: `stock.${type.toLowerCase()}`, entity: "StockItem", entityId: stockItemId, meta: { qty: signedQty } });
  revalidatePath("/inventory");
}

export async function addRecipe(formData: FormData) {
  const user = await authorize("stock.manage");
  const { menuItemId, stockItemId, qtyPerUnit } = z.object({
    menuItemId: z.string(), stockItemId: z.string(), qtyPerUnit: z.coerce.number().min(0.0001),
  }).parse(Object.fromEntries(formData));
  await prisma.recipeItem.upsert({
    where: { menuItemId_stockItemId: { menuItemId, stockItemId } },
    create: { menuItemId, stockItemId, qtyPerUnit },
    update: { qtyPerUnit },
  });
  await writeAudit({ userId: user.id, action: "recipe.upsert", entity: "MenuItem", entityId: menuItemId });
  revalidatePath("/inventory");
}
