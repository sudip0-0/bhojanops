"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResetPasswordState } from "./actions";

export function ResetPasswordForm({
  token,
  action,
}: {
  token: string;
  action: (prev: ResetPasswordState | undefined, formData: FormData) => Promise<ResetPasswordState>;
}) {
  const [state, formAction, pending] = useActionState<ResetPasswordState | undefined, FormData>(action, undefined);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Choose a new password</CardTitle>
        <p className="text-sm text-muted-foreground">Must be at least 8 characters.</p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" autoComplete="off">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-1">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={state && "field" in state && state.field === "password" ? true : undefined}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={state && "field" in state && state.field === "confirm" ? true : undefined}
              required
            />
          </div>
          {state && "error" in state && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Resetting..." : "Reset password"}
          </Button>
        </form>
        <p className="mt-4 text-sm">
          <Link href="/login" className="text-muted-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
