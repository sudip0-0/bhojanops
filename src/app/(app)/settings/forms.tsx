"use client";

import { useActionState, useEffect } from "react";
import { updateRestaurant, createBranch } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";

type Restaurant = {
  id: string; legalName: string; displayName: string; address: string; phone: string;
  panVat: string; vatRate: number; serviceCharge: number; packaging: number;
  receiptFooter: string; receiptMode: string; maxDiscountPct: number;
};
type Branch = { id: string; name: string; invoicePrefix: string; address: string; phone: string };

function Field({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue?: string | number; type?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

export function SettingsForms({ restaurant, branches }: { restaurant: Restaurant; branches: Branch[] }) {
  const [rMsg, rAction, rPending] = useActionState(updateRestaurant, undefined);
  const [bMsg, bAction, bPending] = useActionState(createBranch, undefined);
  useEffect(() => { if (rMsg) toast(rMsg); }, [rMsg]);
  useEffect(() => { if (bMsg) toast(bMsg); }, [bMsg]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Restaurant Profile</CardTitle></CardHeader>
        <CardContent>
          <form action={rAction} className="space-y-3">
            <input type="hidden" name="id" value={restaurant.id} />
            <Field label="Legal Name" name="legalName" defaultValue={restaurant.legalName} />
            <Field label="Display Name" name="displayName" defaultValue={restaurant.displayName} />
            <Field label="Address" name="address" defaultValue={restaurant.address} />
            <Field label="Phone" name="phone" defaultValue={restaurant.phone} />
            <Field label="PAN/VAT Number" name="panVat" defaultValue={restaurant.panVat} />
            <div className="grid grid-cols-3 gap-2">
              <Field label="VAT %" name="vatRate" type="number" defaultValue={restaurant.vatRate} />
              <Field label="Service %" name="serviceCharge" type="number" defaultValue={restaurant.serviceCharge} />
              <Field label="Packaging Rs" name="packaging" type="number" defaultValue={restaurant.packaging} />
            </div>
            <Field label="Max discount % (without approval)" name="maxDiscountPct" type="number" defaultValue={restaurant.maxDiscountPct} />
            <Field label="Receipt Footer" name="receiptFooter" defaultValue={restaurant.receiptFooter} />
            <div className="space-y-1">
              <Label htmlFor="receiptMode">Receipt Mode</Label>
              <Select name="receiptMode" defaultValue={restaurant.receiptMode}>
                <SelectTrigger id="receiptMode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAX">Tax Invoice (show VAT)</SelectItem>
                  <SelectItem value="NON_TAX">Non-Tax Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={rPending}>{rPending ? "Saving..." : "Save profile"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Branches</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {branches.map((b) => (
              <div key={b.id} className="rounded border p-2 text-sm">
                <p className="font-medium">{b.name} <span className="text-muted-foreground">({b.invoicePrefix})</span></p>
                <p className="text-muted-foreground">{b.address} · {b.phone}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Add Branch</CardTitle></CardHeader>
          <CardContent>
            <form action={bAction} className="space-y-3">
              <input type="hidden" name="restaurantId" value={restaurant.id} />
              <Field label="Name" name="name" />
              <Field label="Address" name="address" />
              <Field label="Phone" name="phone" />
              <Field label="Invoice Prefix" name="invoicePrefix" />
              <Button type="submit" disabled={bPending}>{bPending ? "Adding..." : "Add branch"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
