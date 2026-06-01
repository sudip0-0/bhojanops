export function isoDate(d: Date): string {
  // Use local date so the picked day matches what the user sees.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type Preset = { label: string; from: Date; to: Date };

const today = () => startOfDay(new Date());

export const RANGE_PRESETS: Preset[] = [
  { label: "Today", from: today(), to: endOfDay(new Date()) },
  {
    label: "Yesterday",
    from: startOfDay(new Date(Date.now() - 86_400_000)),
    to: endOfDay(new Date(Date.now() - 86_400_000)),
  },
  {
    label: "This Week",
    from: startOfDay(new Date(Date.now() - 6 * 86_400_000)),
    to: endOfDay(new Date()),
  },
  {
    label: "Last Week",
    from: startOfDay(new Date(Date.now() - 13 * 86_400_000)),
    to: endOfDay(new Date(Date.now() - 7 * 86_400_000)),
  },
  {
    label: "This Month",
    from: (() => {
      const d = new Date();
      d.setDate(1);
      return startOfDay(d);
    })(),
    to: endOfDay(new Date()),
  },
  {
    label: "Last Month",
    from: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1, 1);
      return startOfDay(d);
    })(),
    to: (() => {
      const d = new Date();
      d.setDate(0);
      return endOfDay(d);
    })(),
  },
];

/**
 * Resolve a preset to a `{ from, to }` ISO date pair (local time).
 */
export function presetToRange(p: Preset): { from: string; to: string } {
  return { from: isoDate(p.from), to: isoDate(p.to) };
}
