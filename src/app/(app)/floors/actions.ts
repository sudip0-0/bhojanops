"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

export async function createFloor(formData: FormData) {
  const user = await authorize("tables.manage");
  const { branchId, name } = z.object({ branchId: z.string(), name: z.string().min(1) }).parse(Object.fromEntries(formData));
  const floor = await prisma.floor.create({ data: { branchId, name } });
  await writeAudit({ userId: user.id, branchId, action: "floor.create", entity: "Floor", entityId: floor.id });
  revalidatePath("/floors");
}

export async function createTable(formData: FormData) {
  const user = await authorize("tables.manage");
  const { branchId, floorId, name, seats } = z
    .object({ branchId: z.string(), floorId: z.string(), name: z.string().min(1), seats: z.coerce.number().int().min(1) })
    .parse(Object.fromEntries(formData));
  const table = await prisma.table.create({ data: { branchId, floorId, name, seats } });
  await writeAudit({ userId: user.id, branchId, action: "table.create", entity: "Table", entityId: table.id });
  revalidatePath("/floors");
}

export async function renameTable(formData: FormData) {
  const user = await authorize("tables.manage");
  const { id, name } = z.object({ id: z.string(), name: z.string().min(1) }).parse(Object.fromEntries(formData));
  await prisma.table.update({ where: { id }, data: { name } });
  await writeAudit({ userId: user.id, action: "table.rename", entity: "Table", entityId: id });
  revalidatePath("/floors");
}

export async function toggleTable(formData: FormData) {
  const user = await authorize("tables.manage");
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const table = await prisma.table.findUniqueOrThrow({ where: { id } });
  const next = table.state === "DISABLED" ? "AVAILABLE" : "DISABLED";
  await prisma.table.update({ where: { id }, data: { state: next } });
  await writeAudit({ userId: user.id, action: "table.toggle", entity: "Table", entityId: id, meta: { state: next } });
  revalidatePath("/floors");
}
