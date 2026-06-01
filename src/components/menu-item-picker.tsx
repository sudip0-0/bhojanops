"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNPR } from "@/lib/nepal";

export type PickerModifier = { id: string; name: string; price: number };
export type PickerGroup = { id: string; name: string; modifiers: PickerModifier[] };
export type PickerVariant = { id: string; name: string; priceDelta: number };
export type PickerItem = {
  id: string;
  name: string;
  nepaliName?: string | null;
  price: number;
  variants: PickerVariant[];
  modifierGroups: PickerGroup[];
};
export type PickerCategory = { id: string; name: string; items: PickerItem[] };

export interface MenuItemPickerProps {
  categories: PickerCategory[];
  /** Visible name of the currently selected item, if any. */
  selectedLabel?: string;
  /** Form name for the selection (default "selection"). */
  selectionName?: string;
  /** Form name for the qty (default "qty"). */
  qtyName?: string;
  /** Form name for notes (default "notes"). */
  notesName?: string;
  /** Form name for modifiers JSON (default "modifiers"). */
  modifiersName?: string;
  className?: string;
}

/**
 * Server-friendly menu picker. Renders category tabs + a list of items in the
 * active category. Picking an item opens a Radix Dialog with variant (radio)
 * and modifier (checkbox) selectors, then writes the selection into hidden
 * inputs of the surrounding form so the existing server action signature is
 * preserved.
 */
export function MenuItemPicker({
  categories,
  selectedLabel,
  selectionName = "selection",
  qtyName = "qty",
  notesName = "notes",
  modifiersName = "modifiers",
  className,
}: MenuItemPickerProps) {
  const [activeCat, setActiveCat] = React.useState<string>(categories[0]?.id ?? "");
  const [open, setOpen] = React.useState<PickerItem | null>(null);
  const [variantId, setVariantId] = React.useState<string>("");
  const [pickedMods, setPickedMods] = React.useState<Set<string>>(new Set());

  // Hidden form values, written to inputs in the parent <form>.
  const selectionValue = React.useMemo(() => {
    if (!open) return "";
    return variantId ? `${open.id}|${variantId}` : `${open.id}|`;
  }, [open, variantId]);

  const selectedModifiers = React.useMemo(() => {
    if (!open) return [] as Array<{ name: string; price: number }>;
    const out: Array<{ name: string; price: number }> = [];
    for (const g of open.modifierGroups) {
      for (const m of g.modifiers) {
        if (pickedMods.has(m.id)) out.push({ name: m.name, price: m.price });
      }
    }
    return out;
  }, [open, pickedMods]);

  const openItem = (item: PickerItem) => {
    setOpen(item);
    setVariantId(item.variants[0]?.id ?? "");
    setPickedMods(new Set());
  };

  const closeItem = () => setOpen(null);

  const toggleMod = (id: string) => {
    setPickedMods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPrice = React.useMemo(() => {
    if (!open) return 0;
    const v = open.variants.find((x) => x.id === variantId);
    return open.price + (v?.priceDelta ?? 0) + selectedModifiers.reduce((s, m) => s + m.price, 0);
  }, [open, variantId, selectedModifiers]);

  const onAdd = () => {
    // Trigger the surrounding form's submit. The parent <form> will pick up
    // the hidden inputs we render below.
    const form = document.getElementById("menu-picker-form") as HTMLFormElement | null;
    if (form) {
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"][data-picker-submit]');
      if (btn) form.requestSubmit(btn);
    }
    setOpen(null);
  };

  const active = categories.find((c) => c.id === activeCat);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Menu categories">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === activeCat}
            onClick={() => setActiveCat(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              c.id === activeCat ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
      {/* Item grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {active?.items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => openItem(it)}
            className="rounded-md border bg-card p-2 text-left text-sm hover:bg-muted"
          >
            <div className="font-medium">{it.name}</div>
            {it.nepaliName && <div className="text-xs text-muted-foreground">{it.nepaliName}</div>}
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{formatNPR(it.price)}</span>
              {it.modifierGroups.length > 0 && (
                <span className="rounded bg-muted px-1 text-[10px]">{it.modifierGroups.length} opt</span>
              )}
            </div>
          </button>
        ))}
        {active?.items.length === 0 && <p className="text-xs text-muted-foreground">No items in this category.</p>}
      </div>

      {selectedLabel && (
        <p className="text-xs text-muted-foreground">Selected: {selectedLabel}</p>
      )}

      {/* Hidden inputs bound to the surrounding <form id="menu-picker-form">. */}
      <input type="hidden" name={selectionName} value={selectionValue} form="menu-picker-form" />
      <input type="hidden" name={modifiersName} value={JSON.stringify(selectedModifiers)} form="menu-picker-form" />

      {/* Item dialog */}
      <Dialog open={!!open} onOpenChange={(o) => (o ? undefined : closeItem())}>
        <DialogContent className="max-w-md">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription>
                  Pick a variant, add-ons, and quantity. Price: {formatNPR(totalPrice)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {open.variants.length > 0 && (
                  <fieldset className="space-y-1">
                    <legend className="text-xs font-semibold">Variant</legend>
                    {open.variants.map((v) => (
                      <label key={v.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="variant"
                          value={v.id}
                          checked={variantId === v.id}
                          onChange={() => setVariantId(v.id)}
                        />
                        <span className="flex-1">{v.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {v.priceDelta > 0 ? `+${formatNPR(v.priceDelta)}` : v.priceDelta < 0 ? `-${formatNPR(-v.priceDelta)}` : "—"}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                )}
                {open.modifierGroups.map((g) => (
                  <fieldset key={g.id} className="space-y-1">
                    <legend className="text-xs font-semibold">{g.name}</legend>
                    {g.modifiers.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pickedMods.has(m.id)}
                          onChange={() => toggleMod(m.id)}
                        />
                        <span className="flex-1">{m.name}</span>
                        <span className="text-xs text-muted-foreground">+{formatNPR(m.price)}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeItem}>Cancel</Button>
                <Button type="button" onClick={onAdd}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add to order
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
