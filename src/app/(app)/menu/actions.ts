"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

export async function createCategory(formData: FormData) {
  const user = await authorize("menu.manage");
  const { name } = z.object({ name: z.string().min(1) }).parse(Object.fromEntries(formData));
  const cat = await prisma.menuCategory.create({ data: { name } });
  await writeAudit({ userId: user.id, action: "menu.category.create", entity: "MenuCategory", entityId: cat.id });
  revalidatePath("/menu");
}

export async function createItem(formData: FormData) {
  const user = await authorize("menu.manage");
  const data = z
    .object({
      categoryId: z.string(),
      name: z.string().min(1),
      nepaliName: z.string().optional(),
      price: z.coerce.number().min(0),
      station: z.string().min(1),
      taxable: z.coerce.boolean().optional(),
    })
    .parse(Object.fromEntries(formData));
  const item = await prisma.menuItem.create({ data: { ...data, taxable: data.taxable ?? true } });
  await writeAudit({ userId: user.id, action: "menu.item.create", entity: "MenuItem", entityId: item.id });
  revalidatePath("/menu");
}

export async function updateItem(formData: FormData) {
  const user = await authorize("menu.manage");
  const { id, price, available, archived, station } = z
    .object({ id: z.string(), price: z.coerce.number().min(0), available: z.coerce.boolean().optional(), archived: z.coerce.boolean().optional(), station: z.string().min(1) })
    .parse(Object.fromEntries(formData));
  const before = await prisma.menuItem.findUniqueOrThrow({ where: { id } });
  await prisma.menuItem.update({
    where: { id },
    data: { price, station, available: available ?? false, archived: archived ?? false },
  });
  if (before.price !== price) {
    await writeAudit({ userId: user.id, action: "menu.price.change", entity: "MenuItem", entityId: id, meta: { from: before.price, to: price } });
  }
  revalidatePath("/menu");
}

export async function addVariant(formData: FormData) {
  await authorize("menu.manage");
  const { menuItemId, name, priceDelta } = z
    .object({ menuItemId: z.string(), name: z.string().min(1), priceDelta: z.coerce.number() })
    .parse(Object.fromEntries(formData));
  await prisma.menuVariant.create({ data: { menuItemId, name, priceDelta } });
  revalidatePath("/menu");
}

export async function addModifier(formData: FormData) {
  await authorize("menu.manage");
  const { menuItemId, group, name, price } = z
    .object({ menuItemId: z.string(), group: z.string().min(1), name: z.string().min(1), price: z.coerce.number().min(0) })
    .parse(Object.fromEntries(formData));
  const existing = await prisma.modifierGroup.findFirst({ where: { menuItemId, name: group } });
  const mg = existing ?? (await prisma.modifierGroup.create({ data: { menuItemId, name: group } }));
  await prisma.modifier.create({ data: { groupId: mg.id, name, price } });
  revalidatePath("/menu");
}

export async function bulkAvailability(formData: FormData) {
  await authorize("menu.manage");
  const { categoryId, available } = z
    .object({ categoryId: z.string(), available: z.coerce.boolean() })
    .parse(Object.fromEntries(formData));
  await prisma.menuItem.updateMany({ where: { categoryId, archived: false }, data: { available } });
  revalidatePath("/menu");
}
