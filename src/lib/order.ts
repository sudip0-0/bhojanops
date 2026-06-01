export type ItemState = "DRAFT" | "SENT" | "PREPARING" | "READY" | "SERVED" | "VOIDED";

const ITEM_TRANSITIONS: Record<ItemState, ItemState[]> = {
  DRAFT: ["SENT", "VOIDED"],
  SENT: ["PREPARING", "READY", "VOIDED"],
  PREPARING: ["READY", "VOIDED"],
  READY: ["SERVED"],
  SERVED: [],
  VOIDED: [],
};

export function isValidItemTransition(from: ItemState, to: ItemState): boolean {
  return ITEM_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Only unsent (DRAFT) items can be edited or deleted directly. */
export function canModifyItem(state: ItemState): boolean {
  return state === "DRAFT";
}

export type OrderLine = { unitPrice: number; qty: number; modifiers?: { price: number }[]; state?: ItemState };

export function lineTotal(line: OrderLine): number {
  const mods = (line.modifiers ?? []).reduce((s, m) => s + m.price, 0);
  return (line.unitPrice + mods) * line.qty;
}

/** Subtotal of non-voided lines. */
export function orderSubtotal(lines: OrderLine[]): number {
  return lines.filter((l) => l.state !== "VOIDED").reduce((s, l) => s + lineTotal(l), 0);
}
