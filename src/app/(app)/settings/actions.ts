"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

const restaurantSchema = z.object({
  id: z.string(),
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  panVat: z.string().min(1),
  vatRate: z.coerce.number().min(0).max(100),
  serviceCharge: z.coerce.number().min(0).max(100),
  packaging: z.coerce.number().min(0),
  maxDiscountPct: z.coerce.number().min(0).max(100),
  receiptFooter: z.string(),
  receiptMode: z.enum(["TAX", "NON_TAX"]),
});

export async function updateRestaurant(_prev: string | undefined, formData: FormData) {
  const user = await authorize("settings.manage");
  const data = restaurantSchema.parse(Object.fromEntries(formData));
  const { id, ...rest } = data;
  await prisma.restaurant.update({ where: { id }, data: rest });
  await writeAudit({ userId: user.id, action: "settings.update", entity: "Restaurant", entityId: id });
  revalidatePath("/settings");
  return "Saved.";
}

const branchSchema = z.object({
  restaurantId: z.string(),
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  invoicePrefix: z.string().min(1).max(8),
});

export async function createBranch(_prev: string | undefined, formData: FormData) {
  const user = await authorize("branches.manage");
  const data = branchSchema.parse(Object.fromEntries(formData));
  const branch = await prisma.branch.create({ data });
  await writeAudit({ userId: user.id, action: "branch.create", entity: "Branch", entityId: branch.id });
  revalidatePath("/settings");
  return "Branch created.";
}
