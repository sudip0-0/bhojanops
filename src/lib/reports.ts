export function paymentMix(payments: { method: string; amount: number }[]): { name: string; value: number }[] {
  const m: Record<string, number> = {};
  for (const p of payments) m[p.method] = (m[p.method] ?? 0) + p.amount;
  return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
}

export function topItems(items: { name: string; qty: number }[], n = 5): { name: string; qty: number }[] {
  const m: Record<string, number> = {};
  for (const it of items) m[it.name] = (m[it.name] ?? 0) + it.qty;
  return Object.entries(m)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, n);
}

export function sum<T>(rows: T[], pick: (r: T) => number): number {
  return Math.round(rows.reduce((s, r) => s + pick(r), 0) * 100) / 100;
}

/** RFC-4180-ish CSV with quoting. */
export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
