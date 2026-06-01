"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toaster";
import { TOAST_QUERY_PARAM, type RedirectToastPayload } from "@/lib/redirect-with-toast";

/**
 * Reads the `?toast=...` query param set by `redirectWithToast`, fires a
 * toast once on mount, and strips the param from the URL so a refresh
 * does not re-fire it. Mounts once at the (app) layout level.
 */
export function ToastReader() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const fired = useRef<string | null>(null);

  useEffect(() => {
    const raw = searchParams.get(TOAST_QUERY_PARAM);
    if (!raw) return;
    if (fired.current === raw) return; // dedupe within a single mount
    fired.current = raw;
    let payload: RedirectToastPayload;
    try {
      payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    } catch {
      payload = { message: raw, variant: "success" };
    }
    toast(payload.message, payload.variant);

    // Strip the toast param from the URL via history.replaceState so a
    // refresh doesn't re-fire. router.replace would cause a re-render that
    // re-reads searchParams, but useSearchParams is stable for a given URL
    // and we've already deduped by `fired.current`.
    const next = new URLSearchParams(searchParams.toString());
    next.delete(TOAST_QUERY_PARAM);
    const qs = next.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    window.history.replaceState(null, "", newUrl);
  }, [searchParams, pathname, router]);

  return null;
}
