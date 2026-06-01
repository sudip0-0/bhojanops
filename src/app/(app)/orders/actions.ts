"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-helpers";
import { assertSameBranch } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { canModifyItem } from "@/lib/order";
import { allocateOrderNumber } from "@/lib/order-number";
import { redirectWithToast } from "@/lib/redirect-with-toast";

async function resolveBranchId(userBranchId: string | null): Promise<string> {
  if (userBranchId) return userBranchId;
  const b = await prisma.branch.findFirstOrThrow();
  return b.id;
}

/** Orders can only be modified while still being built (DRAFT/OPEN). */
async function assertOrderMutable(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
  if (order.status !== "DRAFT" && order.status !== "OPEN") {
    throw new Error("This order is closed and can no longer be modified.");
  }
}

export async function createOrder(formData: FormData) {
  const user = await authorize("order.create");
  const { type, tableId } = z
    .object({ type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]), tableId: z.string().optional() })
    .parse(Object.fromEntries(formData));
  const branchId = await resolveBranchId(user.branchId);
  // Atomic per-branch number allocation. Closes the read-then-create race
  // that allowed duplicate `number` values (P0-2).
  const number = await allocateOrderNumber(branchId);
  const order = await prisma.order.create({
    data: {
      branchId, number, type,
      tableId: type === "DINE_IN" ? tableId : null,
      waiterId: user.id, status: "DRAFT",
    },
  });
  await writeAudit({ userId: user.id, branchId, action: "order.create", entity: "Order", entityId: order.id });
  redirectWithToast(`/orders/${order.id}`, { message: `Order #${number} created`, variant: "success", key: `order-create-${order.id}` });
}

export async function setGuests(formData: FormData) {
  const user = await authorize("order.create");
  const { orderId, guests } = z
    .object({ orderId: z.string(), guests: z.coerce.number().int().min(1) })
    .parse(Object.fromEntries(formData));
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { branchId: true } });
  await assertSameBranch(user, order.branchId);
  await assertOrderMutable(orderId);
  await prisma.order.update({ where: { id: orderId }, data: { guests } });
  revalidatePath(`/orders/${orderId}`);
}

export async function addLine(formData: FormData) {
  const user = await authorize("order.create");
  const { orderId, selection, qty, notes, modifiers } = z
    .object({
      orderId: z.string(),
      selection: z.string().min(1),
      qty: z.coerce.number().int().min(1),
      notes: z.string().optional(),
      modifiers: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { branchId: true, status: true } });
  await assertSameBranch(user, order.branchId);
  await assertOrderMutable(orderId);
  const [menuItemId, variantId] = selection.split("|");
  const item = await prisma.menuItem.findUniqueOrThrow({ where: { id: menuItemId }, include: { variants: true } });
  const variant = variantId ? item.variants.find((v) => v.id === variantId) : undefined;
  let parsedModifiers: { name: string; price: number }[] | undefined;
  if (modifiers && modifiers.trim()) {
    try {
      const arr = JSON.parse(modifiers);
      if (Array.isArray(arr) && arr.every((m) => m && typeof m.name === "string" && typeof m.price === "number")) {
        parsedModifiers = arr;
      }
    } catch {
      // ignore malformed modifier JSON; persist the line without modifiers
    }
  }
  const modPrice = parsedModifiers ? parsedModifiers.reduce((s, m) => s + m.price, 0) : 0;
  await prisma.orderItem.create({
    data: {
      orderId, menuItemId, variantId: variant?.id,
      nameSnapshot: item.name + (variant ? ` (${variant.name})` : ""),
      unitPrice: item.price + (variant?.priceDelta ?? 0) + modPrice,
      qty, notes: notes || null, station: item.station, state: "DRAFT",
      modifiers: parsedModifiers ?? undefined,
    },
  });
  revalidatePath(`/orders/${orderId}`);
}

export async function removeOrderItem(formData: FormData) {
  const user = await authorize("order.create");
  const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(formData));
  const it = await prisma.orderItem.findUniqueOrThrow({ where: { id }, include: { order: { select: { branchId: true } } } });
  await assertSameBranch(user, it.order.branchId);
  await assertOrderMutable(it.orderId);
  if (!canModifyItem(it.state)) throw new Error("Cannot delete a sent item; request a void instead.");
  await prisma.orderItem.delete({ where: { id } });
  revalidatePath(`/orders/${it.orderId}`);
}

export async function sendToKitchen(formData: FormData) {
  const user = await authorize("order.send");
  const { orderId } = z.object({ orderId: z.string() }).parse(Object.fromEntries(formData));
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  await assertSameBranch(user, order.branchId);
  const draft = order.items.filter((i) => i.state === "DRAFT");
  if (draft.length === 0) return;

  const stations = [...new Set(draft.map((i) => i.station))];
  for (const station of stations) {
    const ticket = await prisma.kitchenTicket.create({ data: { orderId, station, state: "NEW" } });
    await prisma.orderItem.updateMany({
      where: { orderId, station, state: "DRAFT" },
      data: { state: "SENT", ticketId: ticket.id },
    });
  }
  await prisma.order.update({ where: { id: orderId }, data: { status: "OPEN" } });
  if (order.tableId) await prisma.table.update({ where: { id: order.tableId }, data: { state: "ORDERED" } });
  await writeAudit({ userId: user.id, branchId: order.branchId, action: "order.send", entity: "Order", entityId: orderId, meta: { items: draft.length } });
  redirectWithToast(`/orders/${orderId}?sent=1`, { message: `Sent ${draft.length} item(s) to kitchen`, variant: "success", key: `order-send-${orderId}` });
}

export async function requestVoid(formData: FormData) {
  const user = await authorize("void.request");
  const { orderItemId, reason } = z
    .object({ orderItemId: z.string(), reason: z.string().min(1) })
    .parse(Object.fromEntries(formData));
  const it = await prisma.orderItem.findUniqueOrThrow({ where: { id: orderItemId }, include: { order: { select: { branchId: true } } } });
  await assertSameBranch(user, it.order.branchId);
  await assertOrderMutable(it.orderId);
  await prisma.voidRequest.create({ data: { orderItemId, requestedById: user.id, reason, status: "PENDING" } });
  await writeAudit({ userId: user.id, action: "void.request", entity: "OrderItem", entityId: orderItemId, reason });
  revalidatePath(`/orders/${it.orderId}`);
}
