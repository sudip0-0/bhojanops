"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO = [
  "owner", "manager", "cashier", "waiter", "kitchen", "inventory", "auditor",
];

const isDev = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">BhojanOps</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={isDev ? "owner@bhojanops.local" : undefined} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" defaultValue={isDev ? "password123" : undefined} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          {isDev && (
            <p className="mt-4 text-xs text-muted-foreground">
              Demo: {DEMO.join(", ")} @bhojanops.local / password123
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
