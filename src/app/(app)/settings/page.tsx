import Link from "next/link";
import { Building2, FileText } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { nepaliFiscalYear } from "@/lib/nepal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForms } from "./forms";

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const restaurant = await prisma.restaurant.findFirst({ include: { branches: true } });
  if (!restaurant) return <p>No restaurant configured. Run the seed.</p>;
  const fy = nepaliFiscalYear();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Current fiscal year: <span className="font-semibold text-foreground">FY {fy}</span>
          <span className="ml-2 text-xs">(Nepal FY starts 16 July)</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings#branches" className="block">
          <Card className="transition-colors hover:border-primary">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Branches</CardTitle>
              <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">
                {restaurant.branches.length} branch{restaurant.branches.length === 1 ? "" : "es"} configured
                ({restaurant.branches.map((b) => b.invoicePrefix).join(", ")})
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Manage per-branch invoice prefixes, address, and phone</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Fiscal year note</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              Invoice numbers reset each Nepal fiscal year. The boundary is <span className="font-semibold text-foreground">16 July</span>;
              any bill created on or after 16 July belongs to the new FY.
            </p>
            <p className="text-xs">
              Bills on the boundary day may show the previous FY until the date crosses 00:00 local time.
            </p>
          </CardContent>
        </Card>
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
