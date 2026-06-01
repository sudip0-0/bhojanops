"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { assertSameBranch } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { nextTicketState, type TicketStateValue } from "@/lib/kds";
import { deductStockForItem } from "@/lib/stock";

const ITEM_STATE: Record<TicketStateValue, "SENT" | "PREPARING" | "READY" | "SERVED"> = {
  NEW: "SENT", PREPARING: "PREPARING", READY: "READY", SERVED: "SERVED",
};

export async function advanceTicket(formData: FormData) {
  const user = await authorize("kds.update");
  const { ticketId } = z.object({ ticketId: z.string() }).parse(Object.fromEntries(formData));
  const ticket = await prisma.kitchenTicket.findUniqueOrThrow({ where: { id: ticketId }, include: { items: true, order: true } });
  await assertSameBranch(user, ticket.order.branchId);
  const next = nextTicketState(ticket.state as TicketStateValue);
  if (!next) return;

  await prisma.kitchenTicket.update({ where: { id: ticketId }, data: { state: next } });
  // cascade non-voided items
  for (const it of ticket.items) {
    if (it.state === "VOIDED") continue;
    const data: { state: typeof ITEM_STATE[TicketStateValue]; servedAt?: Date } = { state: ITEM_STATE[next] };
    if (next === "SERVED") data.servedAt = new Date();
    await prisma.orderItem.update({ where: { id: it.id }, data });
    if (next === "SERVED") await deductStockForItem(it.id); // stock deducts on served
  }
  await writeAudit({ userId: user.id, branchId: ticket.order.branchId, action: "kds.advance", entity: "KitchenTicket", entityId: ticketId, meta: { state: next } });
  revalidatePath("/kds");
}
