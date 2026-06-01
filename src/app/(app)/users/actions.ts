"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { writeAudit } from "@/lib/audit";

export async function createUser(formData: FormData) {
  const admin = await authorize("users.manage");
  const d = z.object({
    name: z.string().min(1), email: z.string().email(), password: z.string().min(6),
    roleId: z.string(), branchId: z.string().optional(),
  }).parse(Object.fromEntries(formData));
  const existing = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (existing) throw new Error("A user with that email already exists.");
  const branchId = d.branchId && d.branchId !== "none" ? d.branchId : null;
  const user = await prisma.user.create({
    data: { name: d.name, email: d.email, passwordHash: await bcrypt.hash(d.password, 10), roleId: d.roleId, branchId },
  });
  await writeAudit({ userId: admin.id, action: "user.create", entity: "User", entityId: user.id, meta: { email: d.email } });
  revalidatePath("/users");
}

export async function toggleUser(formData: FormData) {
  const admin = await authorize("users.manage");
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const u = await prisma.user.findUniqueOrThrow({ where: { id }, include: { role: { select: { key: true } } } });
  // Disabling an active user has guardrails; re-enabling is always allowed.
  if (u.active) {
    if (u.id === admin.id) throw new Error("You cannot deactivate your own account.");
    if (u.role.key === "owner") {
      const activeOwners = await prisma.user.count({ where: { active: true, role: { key: "owner" } } });
      if (activeOwners <= 1) throw new Error("Cannot deactivate the last active owner.");
    }
  }
  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  await writeAudit({ userId: admin.id, action: "user.toggle", entity: "User", entityId: id, meta: { active: !u.active } });
  revalidatePath("/users");
}
