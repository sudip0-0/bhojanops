"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

const OPT_OUT_KEY = "kot:auto-print-disabled";

/**
 * Triggers `window.print()` once on mount when `?sent=1` is present.
 * Respects a per-device opt-out via `localStorage`.
 */
export function KotAutoPrint() {
  const sp = useSearchParams();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    if (sp.get("sent") !== "1") return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(OPT_OUT_KEY) === "1") return;
    // Defer a tick so the order page's receipt div is in the DOM.
    const t = setTimeout(() => {
      try {
        window.print();
        fired.current = true;
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(t);
  }, [sp]);
  return null;
}
