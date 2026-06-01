"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/reset-token";

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(1),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export type ResetPasswordState =
  | { ok: true }
  | { ok: false; error: string; field?: "password" | "confirm" };

export async function resetPassword(
  _prev: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return { ok: false, error: issue.message, field: issue.path[0] as "password" | "confirm" | undefined };
  }
  const { token, password } = parsed.data;
  const result = await consumePasswordResetToken(token);
  if ("reason" in result) {
    const messages = { not_found: "Reset link is invalid.", expired: "Reset link has expired.", used: "Reset link has already been used." } as const;
    return { ok: false, error: messages[result.reason] };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: result.userId }, data: { passwordHash } });
  redirect("/login?reset=1");
}
