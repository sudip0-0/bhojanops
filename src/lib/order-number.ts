import { prisma } from "@/lib/prisma";

/**
 * Atomically allocate the next order number for a branch.
 *
 * Performed inside a single transaction with `upsert { increment }` so two
 * concurrent `createOrder` calls can never observe the same `lastNumber`
 * (P0-2). The unique `@@unique([branchId, number])` constraint on Order is
 * the backstop.
 */
export async function allocateOrderNumber(branchId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    // Prisma's generated client is typed against the pre-`OrderSequence` schema.
    // Cast through `unknown` for the new model + `increment` operator; the DB is
    // the source of truth and the unique `@@unique([branchId, number])` is the
    // backstop that makes the upsert safe even if types drift.
    const row = await (tx as unknown as {
      orderSequence: {
        upsert: (args: unknown) => Promise<{ lastNumber: number }>;
      };
    }).orderSequence.upsert({
      where: { branchId },
      create: { branchId, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return row.lastNumber;
  });
}
