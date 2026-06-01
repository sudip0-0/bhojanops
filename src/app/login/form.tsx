"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

const DEMO = [
  "owner", "manager", "cashier", "waiter", "kitchen", "inventory", "auditor",
] as const;

const isDev = process.env.NODE_ENV !== "production";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(login, undefined);
  const [showDemo, setShowDemo] = useState(false);
  const searchParams = useSearchParams();
  const resetOk = searchParams.get("reset") === "1";
  const fillDemo = (role: string) => {
    const email = `${role}@bhojanops.local`;
    const pwd = "password123";
    const e = document.getElementById("email") as HTMLInputElement | null;
    const p = document.getElementById("password") as HTMLInputElement | null;
    if (e) e.value = email;
    if (p) p.value = pwd;
  };
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">BhojanOps</CardTitle>
        <p className="text-sm text-muted-foreground">Sign in to continue</p>
      </CardHeader>
      <CardContent>
        {resetOk && (
          <p role="status" className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
            Password updated. Please sign in.
          </p>
        )}
        <form action={formAction} className="space-y-4" autoComplete="off">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              defaultValue={isDev && showDemo ? "owner@bhojanops.local" : undefined}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              defaultValue={isDev && showDemo ? "password123" : undefined}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:underline">
            Forgot password?
          </Link>
          {isDev && (
            <button
              type="button"
              onClick={() => setShowDemo((v) => !v)}
              aria-expanded={showDemo}
              aria-controls="demo-creds"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Demo credentials
              {showDemo ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
            </button>
          )}
        </div>

        {isDev && showDemo && (
          <div id="demo-creds" className="mt-3 rounded border border-dashed p-2 text-xs">
            <p className="mb-1 text-muted-foreground">Click to fill:</p>
            <div className="flex flex-wrap gap-1">
              {DEMO.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => fillDemo(r)}
                  className="rounded bg-secondary px-2 py-0.5 hover:bg-secondary/70"
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1 text-muted-foreground">password: password123</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
