import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loginLimiter } from "@/lib/rate-limit";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class RateLimitedError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(`Too many login attempts. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "RateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const limit = loginLimiter.hit(email.toLowerCase());
        if (!limit.allowed) throw new RateLimitedError(limit.retryAfterMs);
        const user = await prisma.user.findUnique({
          where: { email },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
        if (!user || !user.active) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.key,
          branchId: user.branchId,
          permissions: user.role.permissions.map((rp) => rp.permission.key),
        };
      },
    }),
  ],
});
