import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function writeAudit(entry: {
  userId?: string | null;
  branchId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  reason?: string;
  meta?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      branchId: entry.branchId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      reason: entry.reason,
      meta: entry.meta,
    },
  });
}
