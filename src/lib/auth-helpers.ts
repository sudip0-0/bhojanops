import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can } from "@/lib/rbac/can";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  branchId: string | null;
  permissions: string[];
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser) ?? null;
}

/** For pages/loaders: redirect to login if anonymous, access-denied if lacking permission. */
export async function requirePermission(key?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (key && !can(user.permissions, key)) redirect("/access-denied");
  return user;
}

/** For server actions / route handlers: throw (rejects manual calls) instead of redirecting. */
export async function authorize(key: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!can(user.permissions, key)) throw new Error("FORBIDDEN");
  return user;
}

/** Owner/auditor see all branches; others are scoped to their branch. */
export function branchScope(user: SessionUser): { branchId?: string } {
  if (user.role === "owner" || user.role === "auditor") return {};
  return user.branchId ? { branchId: user.branchId } : {};
}
