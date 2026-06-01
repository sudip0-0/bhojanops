"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Variant = "success" | "error";
type Toast = { id: number; message: string; variant: Variant };

/** Fire a toast from anywhere on the client. */
export function toast(message: string, variant: Variant = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, variant } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, variant } = (e as CustomEvent).detail as { message: string; variant: Variant };
      const id = ++seq.current;
      setToasts((ts) => [...ts, { id, message, variant }]);
      setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000);
    };
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "rounded-md px-4 py-2 text-sm shadow-md",
            t.variant === "error" ? "bg-destructive text-destructive-foreground" : "border bg-card text-card-foreground"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
