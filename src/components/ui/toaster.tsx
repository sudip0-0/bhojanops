"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error" | "info" | "warning";
type Toast = { id: number; message: string; variant: Variant; timeoutMs: number };

const MAX_STACK = 5;
const DEFAULT_TIMEOUT_MS = 4000;

/** Fire a toast from anywhere on the client. */
export function toast(message: string, variant: Variant = "success", timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, variant, timeoutMs } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; variant: Variant; timeoutMs?: number };
      const id = ++seq.current;
      const t: Toast = {
        id,
        message: detail.message,
        variant: detail.variant,
        timeoutMs: detail.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      };
      setToasts((ts) => {
        // Stack depth cap: drop the oldest until we have room.
        const next = [...ts, t];
        return next.length > MAX_STACK ? next.slice(next.length - MAX_STACK) : next;
      });
      if (t.timeoutMs > 0) setTimeout(() => dismiss(id), t.timeoutMs);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Dismiss the top toast.
      setToasts((ts) => (ts.length ? ts.slice(0, -1) : ts));
    };
    window.addEventListener("app:toast", onToast);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("app:toast", onToast);
      window.removeEventListener("keydown", onKey);
    };
  }, [dismiss]);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "flex max-w-sm items-start gap-2 rounded-md px-4 py-2 text-sm shadow-md",
            t.variant === "error"
              ? "bg-destructive text-destructive-foreground"
              : t.variant === "warning"
              ? "border border-amber-300 bg-amber-100 text-amber-900"
              : t.variant === "info"
              ? "border border-sky-300 bg-sky-100 text-sky-900"
              : "border bg-card text-foreground",
          )}
        >
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="rounded p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
