import type { NextAuthConfig } from "next-auth";

// Public paths that do not require authentication.
const PUBLIC = ["/", "/login", "/access-denied", "/setup", "/forgot-password", "/reset-password"];

export const authConfig = {
  pages: { signIn: "/login" },
  // Rolling 8h session: long enough for a service shift; cookie expiry refreshes on activity
  // (every request that reads the session via auth()/getSessionUser, incl. KDS polling).
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 15 * 60 },
  trustHost: true,
  providers: [], // credentials provider added in auth.ts (Node runtime)
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (PUBLIC.includes(pathname) || pathname.startsWith("/api/auth")) return true;
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.branchId = user.branchId;
        token.permissions = user.permissions;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.branchId = (token.branchId as string | null) ?? null;
      session.user.permissions = (token.permissions as string[]) ?? [];
      return session;
    },
  },
} satisfies NextAuthConfig;
