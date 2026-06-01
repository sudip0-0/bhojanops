"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, isoDate } from "@/lib/date-presets";

export interface DateRangePickerProps {
  /** Current from value (ISO date). */
  from: string;
  /** Current to value (ISO date). */
  to: string;
  /** Extra query params to preserve when navigating. */
  preserve?: Record<string, string>;
  /** Base path to navigate to. Defaults to current path. */
  basePath?: string;
  className?: string;
}

/**
 * Server-friendly date range picker: formless — picking a chip or pressing
 * Apply calls `router.push` with the new query string so the page re-fetches
 * with the new `from`/`to`. Keyboard accessible: each chip is a real
 * `<button>`, dates are native `<input type="date">`.
 */
export function DateRangePicker({ from, to, preserve, basePath, className }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localFrom, setLocalFrom] = React.useState(from);
  const [localTo, setLocalTo] = React.useState(to);

  React.useEffect(() => {
    setLocalFrom(from);
    setLocalTo(to);
  }, [from, to]);

  const buildHref = React.useCallback(
    (next: { from?: string; to?: string }) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (next.from !== undefined) {
        if (next.from) params.set("from", next.from);
        else params.delete("from");
      }
      if (next.to !== undefined) {
        if (next.to) params.set("to", next.to);
        else params.delete("to");
      }
      if (preserve) for (const [k, v] of Object.entries(preserve)) params.set(k, v);
      const qs = params.toString();
      const path = basePath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
      return qs ? `${path}?${qs}` : path;
    },
    [searchParams, preserve, basePath],
  );

  const navigate = (href: string) => router.push(href);

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <label className="flex flex-col gap-0.5 text-xs">
        <span>From</span>
        <Input
          type="date"
          value={localFrom}
          onChange={(e) => setLocalFrom(e.target.value)}
          className="h-8"
          aria-label="From date"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-xs">
        <span>To</span>
        <Input
          type="date"
          value={localTo}
          onChange={(e) => setLocalTo(e.target.value)}
          className="h-8"
          aria-label="To date"
        />
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => navigate(buildHref({ from: localFrom, to: localTo }))}
      >
        <Calendar className="mr-1 h-3.5 w-3.5" /> Apply
      </Button>
      <div className="ml-1 flex flex-wrap gap-1" role="group" aria-label="Date presets">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => navigate(buildHref({ from: isoDate(p.from), to: isoDate(p.to) }))}
            className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs hover:bg-muted"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface DatePickerProps {
  /** Current value (ISO date). */
  value: string;
  /** Query param name to set (default "date"). */
  paramName?: string;
  /** Extra query params to preserve. */
  preserve?: Record<string, string>;
  /** Base path to navigate to. */
  basePath?: string;
  className?: string;
  label?: string;
}

/**
 * Single-date picker that mirrors `DateRangePicker`'s server-driven style:
 * selecting a date or pressing Apply navigates with the new `?date=`.
 */
export function DatePicker({
  value,
  paramName = "date",
  preserve,
  basePath,
  className,
  label = "Date",
}: DatePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);

  const buildHref = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (next) params.set(paramName, next);
    else params.delete(paramName);
    if (preserve) for (const [k, v] of Object.entries(preserve)) params.set(k, v);
    const qs = params.toString();
    const path = basePath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <label className="flex flex-col gap-0.5 text-xs">
        <span>{label}</span>
        <Input
          type="date"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className="h-8"
          aria-label={label}
        />
      </label>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => router.push(buildHref(local))}
      >
        <Calendar className="mr-1 h-3.5 w-3.5" /> Apply
      </Button>
      <div className="ml-1 flex flex-wrap gap-1" role="group" aria-label="Date presets">
        {RANGE_PRESETS.slice(0, 3).map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => router.push(buildHref(isoDate(p.from)))}
            className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs hover:bg-muted"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
