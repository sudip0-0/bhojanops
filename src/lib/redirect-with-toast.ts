import { redirect } from "next/navigation";

export type RedirectToastVariant = "success" | "error" | "info" | "warning";

export type RedirectToastPayload = {
  message: string;
  variant: RedirectToastVariant;
  /** Optional stable key so the reader ignores duplicates from cache replays. */
  key?: string;
};

const PARAM = "toast";

/**
 * Append a transient toast payload to a redirect URL and call Next's
 * `redirect`. The `(app)/layout.tsx` ToastReader picks the payload off
 * the URL on mount, fires a toast, and strips the param so a refresh
 * doesn't re-fire it.
 *
 * Use this from server actions that succeed and want a confirmation toast
 * without changing the action's signature (no `useActionState` plumbing).
 */
export function redirectWithToast(
  href: string,
  payload: string | RedirectToastPayload,
  variant: RedirectToastVariant = "success",
): never {
  const resolved: RedirectToastPayload =
    typeof payload === "string" ? { message: payload, variant } : payload;

  const url = new URL(href, "http://placeholder.invalid");
  const existing = url.searchParams.get(PARAM);
  // If a caller accidentally chains two toasts, the most recent wins; the
  // reader uses `key` to dedupe so duplicate submissions are silent.
  if (existing) {
    try {
      const prior = JSON.parse(Buffer.from(existing, "base64url").toString("utf8")) as RedirectToastPayload;
      if (prior.key && prior.key === resolved.key) {
        // Identical payload — just redirect, do not stack.
        redirect(url.pathname + url.search);
      }
    } catch {
      // Fall through; we'll overwrite.
    }
  }
  const encoded = Buffer.from(JSON.stringify(resolved), "utf8").toString("base64url");
  url.searchParams.set(PARAM, encoded);
  redirect(url.pathname + url.search);
}

export const TOAST_QUERY_PARAM = PARAM;
