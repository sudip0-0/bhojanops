import { prisma } from "@/lib/prisma";

export type RecipeLine = { stockItemId: string; qtyPerUnit: number };

export type StockLike = { quantity: number; reorderLevel: number };

/** A stock item is low when at or below its reorder level. */
export function isLowStock(item: StockLike): boolean {
  return item.quantity <= item.reorderLevel;
}

export function lowStockItems<T extends StockLike>(items: T[]): T[] {
  return items.filter(isLowStock);
}

/** Pure: compute signed stock movements for a recipe given quantity sold. sign -1 deduct, +1 reverse. */
export function recipeMovements(recipe: RecipeLine[], qty: number, sign: -1 | 1): { stockItemId: string; qty: number }[] {
  return recipe.map((r) => ({ stockItemId: r.stockItemId, qty: Math.round(sign * r.qtyPerUnit * qty * 10000) / 10000 }));
}

/** Deduct stock for a served order item (idempotent via stockDeducted flag). */
export async function deductStockForItem(orderItemId: string) {
  const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: orderItemId } });
  if (item.stockDeducted) return;
  const recipe = await prisma.recipeItem.findMany({ where: { menuItemId: item.menuItemId } });
  const moves = recipeMovements(recipe, item.qty, -1);
  await prisma.$transaction([
    ...moves.flatMap((m) => [
      prisma.stockMovement.create({ data: { stockItemId: m.stockItemId, type: "SALE", qty: m.qty, refId: orderItemId, note: "Serve deduction" } }),
      prisma.stockItem.update({ where: { id: m.stockItemId }, data: { quantity: { increment: m.qty } } }),
    ]),
    prisma.orderItem.update({ where: { id: orderItemId }, data: { stockDeducted: true } }),
  ]);
}

/** Reverse a previous deduction (for void/refund of a served item). */
export async function reverseStockForItem(orderItemId: string) {
  const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: orderItemId } });
  if (!item.stockDeducted) return;
  const recipe = await prisma.recipeItem.findMany({ where: { menuItemId: item.menuItemId } });
  const moves = recipeMovements(recipe, item.qty, 1);
  await prisma.$transaction([
    ...moves.flatMap((m) => [
      prisma.stockMovement.create({ data: { stockItemId: m.stockItemId, type: "REVERSAL", qty: m.qty, refId: orderItemId, note: "Void/refund reversal" } }),
      prisma.stockItem.update({ where: { id: m.stockItemId }, data: { quantity: { increment: m.qty } } }),
    ]),
    prisma.orderItem.update({ where: { id: orderItemId }, data: { stockDeducted: false } }),
  ]);
}
