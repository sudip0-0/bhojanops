import Link from "next/link";
import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNPR } from "@/lib/nepal";
import { createCategory, createItem, updateItem, addVariant, addModifier, bulkAvailability } from "./actions";
import { cn } from "@/lib/utils";

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; avail?: string }> }) {
  await requirePermission("menu.manage");
  const { q, cat, avail } = await searchParams;
  const availableOnly = avail === "1";

  const itemWhere: Record<string, unknown> = {};
  if (q) itemWhere.name = { contains: q, mode: "insensitive" };
  if (availableOnly) itemWhere.available = true;

  const categories = await prisma.menuCategory.findMany({
    orderBy: { sort: "asc" },
    include: {
      items: {
        where: {
          ...itemWhere,
          ...(cat && cat !== "all" ? {} : {}),
        },
        orderBy: { name: "asc" },
        include: { variants: true, modifiers: { include: { modifiers: true } } },
      },
    },
  });

  // When a category chip is selected, only show that category.
  const visibleCategories = cat && cat !== "all" ? categories.filter((c) => c.id === cat) : categories;

  const buildHref = (next: { cat?: string | null; avail?: boolean | null; q?: string | null }) => {
    const u = new URLSearchParams();
    const nextQ = next.q !== undefined ? next.q : q;
    const nextCat = next.cat !== undefined ? next.cat : cat;
    const nextAvail = next.avail !== undefined ? next.avail : availableOnly;
    if (nextQ) u.set("q", nextQ);
    if (nextCat) u.set("cat", nextCat);
    if (nextAvail) u.set("avail", "1");
    const qs = u.toString();
    return qs ? `/menu?${qs}` : "/menu";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu</h1>
        <form className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Search items..." className="w-56" />
          {cat && <input type="hidden" name="cat" value={cat} />}
          {availableOnly && <input type="hidden" name="avail" value="1" />}
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref({ cat: "all" })}
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            (!cat || cat === "all") ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted",
          )}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={buildHref({ cat: c.id })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              cat === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted",
            )}
          >
            {c.name}
          </Link>
        ))}
        <Link
          href={buildHref({ avail: !availableOnly })}
          aria-pressed={availableOnly}
          className={cn(
            "ml-auto rounded-full border px-3 py-1 text-xs",
            availableOnly ? "border-primary bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted",
          )}
        >
          {availableOnly ? "Showing available only" : "Show available only"}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={createCategory} className="flex gap-2">
          <Input name="name" placeholder="New category" className="w-44" required />
          <Button type="submit" size="sm">Add category</Button>
        </form>
      </div>

      {visibleCategories.length === 0 && (
        <p className="text-sm text-muted-foreground">No categories match.</p>
      )}
      {visibleCategories.map((cat) => (
        <Card key={cat.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{cat.name}</CardTitle>
            <div className="flex gap-1">
              <form action={bulkAvailability}>
                <input type="hidden" name="categoryId" value={cat.id} />
                <input type="hidden" name="available" value="true" />
                <Button type="submit" size="sm" variant="outline">All available</Button>
              </form>
              <form action={bulkAvailability}>
                <input type="hidden" name="categoryId" value={cat.id} />
                <input type="hidden" name="available" value="" />
                <Button type="submit" size="sm" variant="outline">All off</Button>
              </form>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {cat.items.map((it) => (
              <div key={it.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{it.name}</span>
                    {it.nepaliName && <span className="ml-2 text-muted-foreground">{it.nepaliName}</span>}
                    {it.archived && <Badge className="ml-2 bg-muted">archived</Badge>}
                    {!it.available && !it.archived && <Badge className="ml-2 bg-muted">unavailable</Badge>}
                  </div>
                  <span className="font-semibold">{formatNPR(it.price)}</span>
                </div>
                {it.variants.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Variants: {it.variants.map((v) => `${v.name} (${v.priceDelta >= 0 ? "+" : ""}${v.priceDelta})`).join(", ")}
                  </p>
                )}
                {it.modifiers.map((g) => (
                  <p key={g.id} className="text-xs text-muted-foreground">{g.name}: {g.modifiers.map((m) => `${m.name} (+${m.price})`).join(", ")}</p>
                ))}
                <form action={updateItem} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={it.id} />
                  <label className="text-xs">Price<Input name="price" type="number" defaultValue={it.price} className="h-7 w-20" /></label>
                  <label className="text-xs">Station<Input name="station" defaultValue={it.station} className="h-7 w-24" /></label>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="available" value="true" defaultChecked={it.available} /> available</label>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="archived" value="true" defaultChecked={it.archived} /> archived</label>
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                </form>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={addVariant} className="flex items-end gap-1">
                    <input type="hidden" name="menuItemId" value={it.id} />
                    <Input name="name" placeholder="Variant" className="h-7 w-24" required />
                    <Input name="priceDelta" type="number" placeholder="±Rs" className="h-7 w-20" defaultValue={0} />
                    <Button type="submit" size="sm" variant="ghost">+Variant</Button>
                  </form>
                  <form action={addModifier} className="flex items-end gap-1">
                    <input type="hidden" name="menuItemId" value={it.id} />
                    <Input name="group" placeholder="Group" className="h-7 w-20" required />
                    <Input name="name" placeholder="Add-on" className="h-7 w-24" required />
                    <Input name="price" type="number" placeholder="Rs" className="h-7 w-16" defaultValue={0} />
                    <Button type="submit" size="sm" variant="ghost">+Add-on</Button>
                  </form>
                </div>
              </div>
            ))}
            <form action={createItem} className="flex flex-wrap items-end gap-2 border-t pt-3">
              <input type="hidden" name="categoryId" value={cat.id} />
              <Input name="name" placeholder="Item name" className="h-8 w-32" required />
              <Input name="nepaliName" placeholder="नेपाली नाम" className="h-8 w-28" />
              <Input name="price" type="number" placeholder="Price" className="h-8 w-20" required />
              <Input name="station" placeholder="Station" defaultValue="kitchen" className="h-8 w-24" />
              <Button type="submit" size="sm">Add item</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
