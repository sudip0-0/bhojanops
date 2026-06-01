import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export type IssuedToken = { raw: string; expiresAt: Date };

export async function issuePasswordResetToken(userId: string, now: number = Date.now()): Promise<IssuedToken> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(now + TOKEN_TTL_MS);
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return { raw, expiresAt };
}

export type ValidatedToken = { userId: string } | { reason: "not_found" | "expired" | "used" };

export async function consumePasswordResetToken(raw: string, now: number = Date.now()): Promise<ValidatedToken> {
  const tokenHash = hashToken(raw);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row) return { reason: "not_found" };
  if (row.usedAt) return { reason: "used" };
  if (row.expiresAt.getTime() <= now) return { reason: "expired" };
  await prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date(now) } });
  return { userId: row.userId };
}
