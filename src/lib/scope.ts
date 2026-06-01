import type { SessionUser } from "@/lib/auth-helpers";

/**
 * Throws FORBIDDEN_BRANCH if a non-privileged user is trying to mutate a
 * record from a branch they do not belong to.
 *
 * Owners and auditors intentionally pass through — they operate cross-branch.
 * A user with a null `branchId` (e.g. a freshly created owner or auditor
 * whose branch has not been assigned) is also allowed through so that the
 * owner is never accidentally locked out of the very first branch they
 * create during setup.
 */
export async function assertSameBranch(user: SessionUser, branchId: string | null | undefined) {
  if (user.role === "owner" || user.role === "auditor") return;
  if (user.branchId && user.branchId !== branchId) {
    throw new Error("FORBIDDEN_BRANCH");
  }
}
