import { PrismaClient, OrderType, OrderStatus, OrderItemState, TableState, PaymentMethod, BillStatus, VoidStatus, ShiftStatus, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "../src/lib/rbac/permissions";

const prisma = new PrismaClient();

function vatBreakdown(base: number, vatRate = 13) {
  const grand = Math.round(base);
  const vat = +((grand * vatRate) / (100 + vatRate)).toFixed(2);
  const net = +(grand - vat).toFixed(2);
  return { grand, vat, net, roundOff: +(grand - base).toFixed(2) };
}

async function clear() {
  // delete in dependency order
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.refund.deleteMany(),
    prisma.billItemSnapshot.deleteMany(),
    prisma.voidRequest.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.recipeItem.deleteMany(),
  ]);
  await prisma.bill.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.kitchenTicket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuVariant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.invoiceSequence.deleteMany();
  await prisma.orderSequence.deleteMany();
  await prisma.table.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.appSetting.deleteMany();
}

async function main() {
  await clear();

  // Permissions + roles
  const permRows = await Promise.all(
    Object.entries(PERMISSIONS).map(([key, name]) =>
      prisma.permission.create({ data: { key, name } })
    )
  );
  const permByKey = Object.fromEntries(permRows.map((p) => [p.key, p.id]));

  const roleByKey: Record<string, string> = {};
  for (const [key, name] of Object.entries(ROLES)) {
    const role = await prisma.role.create({ data: { key, name } });
    roleByKey[key] = role.id;
    await prisma.rolePermission.createMany({
      data: (ROLE_PERMISSIONS[key] || []).map((pk) => ({ roleId: role.id, permissionId: permByKey[pk] })),
    });
  }

  // Restaurant + branches
  const restaurant = await prisma.restaurant.create({
    data: {
      legalName: "Kathmandu Momo & Cafe Pvt. Ltd.",
      displayName: "Kathmandu Momo & Cafe",
      address: "New Baneshwor, Kathmandu",
      phone: "01-4567890",
      panVat: "301234567",
      vatRate: 13,
      serviceCharge: 10,
      packaging: 15,
      receiptFooter: "Dhanyabad! Pheri aaunuhola.",
    },
  });

  const baneshwor = await prisma.branch.create({
    data: { restaurantId: restaurant.id, name: "New Baneshwor", address: "New Baneshwor, Kathmandu", phone: "01-4567890", invoicePrefix: "NB" },
  });
  const lalitpur = await prisma.branch.create({
    data: { restaurantId: restaurant.id, name: "Lalitpur", address: "Jhamsikhel, Lalitpur", phone: "01-5547890", invoicePrefix: "LP" },
  });

  // Floors (3) + tables (18)
  const floors = await Promise.all([
    prisma.floor.create({ data: { branchId: baneshwor.id, name: "Ground Floor" } }),
    prisma.floor.create({ data: { branchId: baneshwor.id, name: "First Floor" } }),
    prisma.floor.create({ data: { branchId: lalitpur.id, name: "Ground Floor" } }),
  ]);
  const floorTableCounts = [7, 6, 5];
  const tables: { id: string; branchId: string }[] = [];
  for (let f = 0; f < floors.length; f++) {
    for (let t = 1; t <= floorTableCounts[f]; t++) {
      const tab = await prisma.table.create({
        data: { branchId: floors[f].branchId, floorId: floors[f].id, name: `T${f + 1}-${t}`, seats: 4 },
      });
      tables.push({ id: tab.id, branchId: floors[f].branchId });
    }
  }

  // Users (8: 7 demo + extra waiter)
  const hash = await bcrypt.hash("password123", 10);
  const userDefs = [
    { email: "owner@bhojanops.local", name: "Suresh Owner", role: "owner", branchId: null },
    { email: "manager@bhojanops.local", name: "Manju Manager", role: "manager", branchId: baneshwor.id },
    { email: "cashier@bhojanops.local", name: "Kabita Cashier", role: "cashier", branchId: baneshwor.id },
    { email: "waiter@bhojanops.local", name: "Wangchu Waiter", role: "waiter", branchId: baneshwor.id },
    { email: "kitchen@bhojanops.local", name: "Krishna Kitchen", role: "kitchen", branchId: baneshwor.id },
    { email: "inventory@bhojanops.local", name: "Indira Inventory", role: "inventory", branchId: baneshwor.id },
    { email: "auditor@bhojanops.local", name: "Anil Auditor", role: "auditor", branchId: null },
    { email: "waiter2@bhojanops.local", name: "Wendy Waiter", role: "waiter", branchId: lalitpur.id },
  ];
  const users: Record<string, { id: string; branchId: string | null }> = {};
  for (const u of userDefs) {
    const created = await prisma.user.create({
      data: { email: u.email, name: u.name, passwordHash: hash, roleId: roleByKey[u.role], branchId: u.branchId },
    });
    users[u.email] = { id: created.id, branchId: u.branchId };
  }

  // Menu categories + items (50)
  const categories = ["Momo", "Chowmein", "Thukpa", "Sekuwa", "Dal Bhat", "Tea & Coffee", "Bakery", "Soft Drinks"];
  const catByName: Record<string, string> = {};
  for (let i = 0; i < categories.length; i++) {
    const c = await prisma.menuCategory.create({ data: { name: categories[i], sort: i } });
    catByName[categories[i]] = c.id;
  }

  const items: { name: string; nepali: string; cat: string; price: number; station: string; variants?: { name: string; delta: number }[] }[] = [
    { name: "Veg Momo", nepali: "तरकारी मम", cat: "Momo", price: 130, station: "momo", variants: [{ name: "Half", delta: -50 }, { name: "Full", delta: 0 }] },
    { name: "Chicken Momo", nepali: "कुखुरा मम", cat: "Momo", price: 160, station: "momo", variants: [{ name: "Half", delta: -60 }, { name: "Full", delta: 0 }] },
    { name: "Buff Momo", nepali: "राँगा मम", cat: "Momo", price: 150, station: "momo" },
    { name: "Jhol Momo", nepali: "झोल मम", cat: "Momo", price: 180, station: "momo" },
    { name: "C Momo", nepali: "सी मम", cat: "Momo", price: 200, station: "momo" },
    { name: "Kothey Momo", nepali: "कोठे मम", cat: "Momo", price: 190, station: "momo" },
    { name: "Steam Paneer Momo", nepali: "पनिर मम", cat: "Momo", price: 200, station: "momo" },
    { name: "Veg Chowmein", nepali: "तरकारी चाउमिन", cat: "Chowmein", price: 120, station: "kitchen" },
    { name: "Chicken Chowmein", nepali: "कुखुरा चाउमिन", cat: "Chowmein", price: 160, station: "kitchen" },
    { name: "Buff Chowmein", nepali: "राँगा चाउमिन", cat: "Chowmein", price: 150, station: "kitchen" },
    { name: "Egg Chowmein", nepali: "अण्डा चाउमिन", cat: "Chowmein", price: 140, station: "kitchen" },
    { name: "Mixed Chowmein", nepali: "मिक्स चाउमिन", cat: "Chowmein", price: 180, station: "kitchen" },
    { name: "Pancit", nepali: "पान्सित", cat: "Chowmein", price: 170, station: "kitchen" },
    { name: "Veg Thukpa", nepali: "तरकारी थुक्पा", cat: "Thukpa", price: 150, station: "kitchen" },
    { name: "Chicken Thukpa", nepali: "कुखुरा थुक्पा", cat: "Thukpa", price: 190, station: "kitchen" },
    { name: "Buff Thukpa", nepali: "राँगा थुक्पा", cat: "Thukpa", price: 180, station: "kitchen" },
    { name: "Egg Thukpa", nepali: "अण्डा थुक्पा", cat: "Thukpa", price: 160, station: "kitchen" },
    { name: "Chicken Sekuwa", nepali: "कुखुरा सेकुवा", cat: "Sekuwa", price: 320, station: "grill" },
    { name: "Mutton Sekuwa", nepali: "खसी सेकुवा", cat: "Sekuwa", price: 420, station: "grill" },
    { name: "Pork Sekuwa", nepali: "बंगुर सेकुवा", cat: "Sekuwa", price: 360, station: "grill" },
    { name: "Buff Sekuwa", nepali: "राँगा सेकुवा", cat: "Sekuwa", price: 300, station: "grill" },
    { name: "Chicken Choila", nepali: "कुखुरा छोयला", cat: "Sekuwa", price: 280, station: "grill" },
    { name: "Veg Dal Bhat", nepali: "तरकारी दालभात", cat: "Dal Bhat", price: 250, station: "kitchen" },
    { name: "Chicken Dal Bhat", nepali: "कुखुरा दालभात", cat: "Dal Bhat", price: 350, station: "kitchen" },
    { name: "Mutton Dal Bhat", nepali: "खसी दालभात", cat: "Dal Bhat", price: 450, station: "kitchen" },
    { name: "Fish Dal Bhat", nepali: "माछा दालभात", cat: "Dal Bhat", price: 400, station: "kitchen" },
    { name: "Milk Tea", nepali: "दूध चिया", cat: "Tea & Coffee", price: 40, station: "beverage" },
    { name: "Black Tea", nepali: "कालो चिया", cat: "Tea & Coffee", price: 30, station: "beverage" },
    { name: "Lemon Tea", nepali: "लेमन चिया", cat: "Tea & Coffee", price: 40, station: "beverage" },
    { name: "Milk Coffee", nepali: "दूध कफी", cat: "Tea & Coffee", price: 90, station: "beverage" },
    { name: "Black Coffee", nepali: "कालो कफी", cat: "Tea & Coffee", price: 70, station: "beverage" },
    { name: "Cappuccino", nepali: "क्यापुचिनो", cat: "Tea & Coffee", price: 150, station: "beverage" },
    { name: "Hot Chocolate", nepali: "हट चकलेट", cat: "Tea & Coffee", price: 160, station: "beverage" },
    { name: "Veg Sandwich", nepali: "तरकारी स्यान्डविच", cat: "Bakery", price: 150, station: "bakery" },
    { name: "Chicken Sandwich", nepali: "कुखुरा स्यान्डविच", cat: "Bakery", price: 200, station: "bakery" },
    { name: "Veg Burger", nepali: "तरकारी बर्गर", cat: "Bakery", price: 180, station: "bakery" },
    { name: "Chicken Burger", nepali: "कुखुरा बर्गर", cat: "Bakery", price: 240, station: "bakery" },
    { name: "Croissant", nepali: "क्रोसाँ", cat: "Bakery", price: 120, station: "bakery" },
    { name: "Chocolate Donut", nepali: "चकलेट डोनट", cat: "Bakery", price: 110, station: "bakery" },
    { name: "Cheesecake Slice", nepali: "चिजकेक", cat: "Bakery", price: 220, station: "bakery" },
    { name: "Brownie", nepali: "ब्राउनी", cat: "Bakery", price: 150, station: "bakery" },
    { name: "Coca Cola", nepali: "कोका कोला", cat: "Soft Drinks", price: 80, station: "beverage" },
    { name: "Sprite", nepali: "स्प्राइट", cat: "Soft Drinks", price: 80, station: "beverage" },
    { name: "Fanta", nepali: "फेन्टा", cat: "Soft Drinks", price: 80, station: "beverage" },
    { name: "Mineral Water", nepali: "पानी", cat: "Soft Drinks", price: 30, station: "beverage" },
    { name: "Fresh Lime Soda", nepali: "लेमन सोडा", cat: "Soft Drinks", price: 110, station: "beverage" },
    { name: "Mango Lassi", nepali: "आँप लस्सी", cat: "Soft Drinks", price: 130, station: "beverage" },
    { name: "Plain Lassi", nepali: "लस्सी", cat: "Soft Drinks", price: 100, station: "beverage" },
    { name: "Orange Juice", nepali: "सुन्तला जुस", cat: "Soft Drinks", price: 120, station: "beverage" },
    { name: "Red Bull", nepali: "रेड बुल", cat: "Soft Drinks", price: 250, station: "beverage" },
  ];

  const menuItems: { id: string; price: number; name: string; station: string }[] = [];
  for (const it of items) {
    const mi = await prisma.menuItem.create({
      data: {
        categoryId: catByName[it.cat],
        name: it.name,
        nepaliName: it.nepali,
        price: it.price,
        station: it.station,
        variants: it.variants ? { create: it.variants.map((v) => ({ name: v.name, priceDelta: v.delta })) } : undefined,
      },
    });
    menuItems.push({ id: mi.id, price: it.price, name: it.name, station: it.station });
  }

  // Stock items (20) for both branches' Baneshwor
  const stockDefs = [
    ["Flour", "kg", 50, 10, 80], ["Chicken Mince", "kg", 20, 5, 420], ["Buff Mince", "kg", 18, 5, 360],
    ["Cabbage", "kg", 30, 8, 60], ["Onion", "kg", 40, 10, 90], ["Cooking Oil", "ltr", 25, 5, 220],
    ["Noodles", "kg", 35, 8, 140], ["Egg", "pcs", 200, 50, 18], ["Tomato", "kg", 25, 6, 100],
    ["Garlic", "kg", 10, 2, 280], ["Ginger", "kg", 8, 2, 240], ["Rice", "kg", 80, 20, 110],
    ["Lentils", "kg", 30, 8, 160], ["Mutton", "kg", 15, 4, 950], ["Pork", "kg", 14, 4, 520],
    ["Milk", "ltr", 40, 10, 110], ["Coffee Beans", "kg", 6, 1.5, 1400], ["Tea Leaves", "kg", 5, 1, 600],
    ["Sugar", "kg", 30, 8, 95], ["Cheese", "kg", 8, 2, 1100],
  ];
  const stockItems: { id: string; name: string }[] = [];
  for (const [name, unit, qty, reorder, cost] of stockDefs) {
    const si = await prisma.stockItem.create({
      data: { branchId: baneshwor.id, name: String(name), unit: String(unit), quantity: Number(qty), reorderLevel: Number(reorder), cost: Number(cost) },
    });
    stockItems.push({ id: si.id, name: String(name) });
    await prisma.stockMovement.create({ data: { stockItemId: si.id, type: StockMovementType.ADJUSTMENT, qty: Number(qty), note: "Opening stock" } });
  }
  const stockByName = Object.fromEntries(stockItems.map((s) => [s.name, s.id]));

  // Recipes (20 mappings)
  const recipeMap: [string, string, number][] = [
    ["Veg Momo", "Flour", 0.1], ["Veg Momo", "Cabbage", 0.08],
    ["Chicken Momo", "Flour", 0.1], ["Chicken Momo", "Chicken Mince", 0.12],
    ["Buff Momo", "Flour", 0.1], ["Buff Momo", "Buff Mince", 0.12],
    ["Veg Chowmein", "Noodles", 0.15], ["Veg Chowmein", "Cabbage", 0.05],
    ["Chicken Chowmein", "Noodles", 0.15], ["Chicken Chowmein", "Chicken Mince", 0.1],
    ["Egg Chowmein", "Noodles", 0.15], ["Egg Chowmein", "Egg", 2],
    ["Veg Thukpa", "Noodles", 0.12], ["Chicken Thukpa", "Chicken Mince", 0.1],
    ["Chicken Sekuwa", "Chicken Mince", 0.25], ["Mutton Sekuwa", "Mutton", 0.25],
    ["Chicken Dal Bhat", "Rice", 0.2], ["Chicken Dal Bhat", "Lentils", 0.08],
    ["Milk Tea", "Milk", 0.1], ["Milk Coffee", "Coffee Beans", 0.02],
  ];
  for (const [item, stock, qty] of recipeMap) {
    const mi = menuItems.find((m) => m.name === item)!;
    await prisma.recipeItem.create({ data: { menuItemId: mi.id, stockItemId: stockByName[stock], qtyPerUnit: qty } });
  }

  // Supplier + a purchase
  const supplier = await prisma.supplier.create({ data: { name: "Baneshwor Suppliers", phone: "9851000000" } });
  const purchase = await prisma.purchase.create({
    data: {
      branchId: baneshwor.id, supplierId: supplier.id, total: 8400,
      items: { create: [{ stockItemId: stockByName["Chicken Mince"], qty: 10, cost: 420 }, { stockItemId: stockByName["Flour"], qty: 30, cost: 80 }] },
    },
  });
  await prisma.stockMovement.createMany({
    data: [
      { stockItemId: stockByName["Chicken Mince"], type: StockMovementType.PURCHASE, qty: 10, refId: purchase.id, note: "Purchase" },
      { stockItemId: stockByName["Flour"], type: StockMovementType.PURCHASE, qty: 30, refId: purchase.id, note: "Purchase" },
    ],
  });

  // Invoice sequences
  const fiscalYear = "2081-82";
  await prisma.invoiceSequence.create({ data: { branchId: baneshwor.id, fiscalYear, lastNumber: 0 } });
  await prisma.invoiceSequence.create({ data: { branchId: lalitpur.id, fiscalYear, lastNumber: 0 } });

  // Shifts (2)
  const shift1 = await prisma.shift.create({
    data: { branchId: baneshwor.id, cashierId: users["cashier@bhojanops.local"].id, openingCash: 5000, status: ShiftStatus.OPEN },
  });
  await prisma.shift.create({
    data: {
      branchId: baneshwor.id, cashierId: users["cashier@bhojanops.local"].id, openingCash: 5000,
      countedCash: 18500, expectedCash: 18600, variance: -100, varianceReason: "Short by 100",
      status: ShiftStatus.CLOSED, closedAt: new Date(),
    },
  });

  // 25 historical orders; 8 finalized bills
  const waiterId = users["waiter@bhojanops.local"].id;
  const cashierId = users["cashier@bhojanops.local"].id;
  let orderNo = 1;
  let invNo = 0;
  const createdOrders: { id: string; orderItemIds: string[] }[] = [];

  for (let i = 0; i < 25; i++) {
    const table = tables[i % tables.length];
    const type = i % 5 === 0 ? OrderType.TAKEAWAY : OrderType.DINE_IN;
    const billed = i < 8;
    const itemCount = 2 + (i % 3);
    const chosen = Array.from({ length: itemCount }, (_, k) => menuItems[(i * 3 + k) % menuItems.length]);

    const order = await prisma.order.create({
      data: {
        branchId: baneshwor.id,
        number: orderNo++,
        type,
        status: billed ? OrderStatus.CLOSED : OrderStatus.OPEN,
        tableId: type === OrderType.DINE_IN ? table.id : null,
        waiterId,
        guests: 1 + (i % 4),
        items: {
          create: chosen.map((c) => ({
            menuItemId: c.id, nameSnapshot: c.name, unitPrice: c.price, qty: 1 + (i % 2),
            state: billed ? OrderItemState.SERVED : OrderItemState.SENT, station: c.station,
            servedAt: billed ? new Date() : null, stockDeducted: billed,
          })),
        },
      },
      include: { items: true },
    });
    createdOrders.push({ id: order.id, orderItemIds: order.items.map((it) => it.id) });

    if (billed) {
      const subtotal = order.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
      const service = +(subtotal * 0.1).toFixed(2);
      const base = subtotal + service;
      const { grand, vat, net, roundOff } = vatBreakdown(base);
      invNo++;
      const bill = await prisma.bill.create({
        data: {
          branchId: baneshwor.id, orderId: order.id, invoiceNumber: `NB-2081-82-${String(invNo).padStart(4, "0")}`,
          cashierId, shiftId: shift1.id, subtotal, serviceCharge: service, vatAmount: vat, netAmount: net,
          roundOff, grandTotal: grand, status: BillStatus.FINALIZED,
          items: { create: order.items.map((it) => ({ name: it.nameSnapshot, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.unitPrice * it.qty })) },
          payments: { create: [{ method: i % 2 === 0 ? PaymentMethod.CASH : PaymentMethod.FONEPAY, amount: grand }] },
        },
      });
      await prisma.invoiceSequence.update({ where: { branchId_fiscalYear: { branchId: baneshwor.id, fiscalYear } }, data: { lastNumber: invNo } });
      // deduct stock for served items via recipe
      for (const it of order.items) {
        const recipes = await prisma.recipeItem.findMany({ where: { menuItemId: it.menuItemId } });
        for (const r of recipes) {
          await prisma.stockMovement.create({ data: { stockItemId: r.stockItemId, type: StockMovementType.SALE, qty: -(r.qtyPerUnit * it.qty), refId: it.id, note: "Sale deduction" } });
          await prisma.stockItem.update({ where: { id: r.stockItemId }, data: { quantity: { decrement: r.qtyPerUnit * it.qty } } });
        }
      }
      await prisma.auditLog.create({ data: { userId: cashierId, branchId: baneshwor.id, action: "bill.finalize", entity: "Bill", entityId: bill.id, meta: { grandTotal: grand } } });
    }
  }

  // 3 void requests
  for (let i = 0; i < 3; i++) {
    const oi = createdOrders[10 + i].orderItemIds[0];
    await prisma.voidRequest.create({
      data: { orderItemId: oi, requestedById: waiterId, reason: ["Wrong item", "Customer cancelled", "Kitchen error"][i], status: i === 0 ? VoidStatus.APPROVED : VoidStatus.PENDING, decidedById: i === 0 ? users["manager@bhojanops.local"].id : null },
    });
  }

  // Audit logs (login + others)
  await prisma.auditLog.createMany({
    data: [
      { userId: users["owner@bhojanops.local"].id, action: "login", meta: { ip: "127.0.0.1" } },
      { userId: users["manager@bhojanops.local"].id, branchId: baneshwor.id, action: "void.approve", entity: "VoidRequest", reason: "Wrong item" },
      { userId: users["inventory@bhojanops.local"].id, branchId: baneshwor.id, action: "purchase.create", entity: "Purchase", entityId: purchase.id },
      { userId: users["cashier@bhojanops.local"].id, branchId: baneshwor.id, action: "shift.close", entity: "Shift", meta: { variance: -100 } },
    ],
  });

  console.log("Seed complete: demo accounts ready (password123).");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
