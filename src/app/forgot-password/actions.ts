"use server";

import { prisma } from "@/lib/prisma";
import { issuePasswordResetToken } from "@/lib/reset-token";
import { passwordResetLimiter } from "@/lib/rate-limit";

export type ForgotPasswordState =
  | { ok: true; message: string }
  | { ok: false; error: string; retryAfterMs?: number };

export async function requestPasswordReset(
  _prev: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email." };
  }
  const limit = passwordResetLimiter.hit(email);
  if (!limit.allowed) {
    return { ok: false, error: "Too many requests. Try again later.", retryAfterMs: limit.retryAfterMs };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const { raw, expiresAt } = await issuePasswordResetToken(user.id);
    console.info(
      `[forgot-password] reset link for ${email}: /reset-password?token=${raw} (expires ${expiresAt.toISOString()})`,
    );
  }
  return { ok: true, message: "If that email is registered, a reset link has been sent." };
}
