import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { nepaliFiscalYear } from "@/lib/nepal";
import { SettingsForms } from "./forms";

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const restaurant = await prisma.restaurant.findFirst({ include: { branches: true } });
  if (!restaurant) return <p>No restaurant configured. Run the seed.</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Current fiscal year: {nepaliFiscalYear()}</p>
      </div>
      <SettingsForms
        restaurant={{
          id: restaurant.id, legalName: restaurant.legalName, displayName: restaurant.displayName,
          address: restaurant.address, phone: restaurant.phone, panVat: restaurant.panVat,
          vatRate: restaurant.vatRate, serviceCharge: restaurant.serviceCharge, packaging: restaurant.packaging,
          receiptFooter: restaurant.receiptFooter, receiptMode: restaurant.receiptMode, maxDiscountPct: restaurant.maxDiscountPct,
        }}
        branches={restaurant.branches.map((b) => ({ id: b.id, name: b.name, invoicePrefix: b.invoicePrefix, address: b.address, phone: b.phone }))}
      />
    </div>
  );
}
