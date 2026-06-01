export type MenuItemLike = { available: boolean; archived: boolean };

/** Items shown to waiter/cashier: available and not archived. */
export function orderableItems<T extends MenuItemLike>(items: T[]): T[] {
  return items.filter((i) => i.available && !i.archived);
}

/** Effective price = base price + variant delta. */
export function effectivePrice(base: number, variantDelta = 0): number {
  return base + variantDelta;
}
