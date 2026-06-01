"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState | undefined, FormData>(
    requestPasswordReset,
    undefined,
  );
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Reset password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4" autoComplete="off">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            {state && "error" in state && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            {state && "message" in state && (
              <p role="status" className="text-sm text-emerald-700">
                {state.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-sm">
            <Link href="/login" className="text-muted-foreground hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
