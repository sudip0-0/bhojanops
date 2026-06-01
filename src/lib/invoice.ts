import { prisma } from "@/lib/prisma";
import { nepaliFiscalYear } from "@/lib/nepal";

/** Pure formatter: PREFIX-FY-0001 */
export function formatInvoiceNumber(prefix: string, fiscalYear: string, seq: number): string {
  return `${prefix}-${fiscalYear}-${String(seq).padStart(4, "0")}`;
}

/** Atomically allocate the next invoice number for a branch+fiscal year. */
export async function allocateInvoiceNumber(branchId: string, prefix: string, date = new Date()): Promise<string> {
  const fiscalYear = nepaliFiscalYear(date);
  const seq = await prisma.$transaction(async (tx) => {
    const row = await tx.invoiceSequence.upsert({
      where: { branchId_fiscalYear: { branchId, fiscalYear } },
      create: { branchId, fiscalYear, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return row.lastNumber;
  });
  return formatInvoiceNumber(prefix, fiscalYear, seq);
}
