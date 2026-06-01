// Nepal-specific display helpers. BS conversion is approximate and display-only (AD is source of truth).

export function formatNPR(amount: number): string {
  return "Rs " + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Nepali fiscal year (Shrawan–Ashar, ~mid-July boundary). Approximate AD->BS mapping. */
export function nepaliFiscalYear(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0=Jan
  const startAdYear = m >= 6 ? y : y - 1; // July (idx 6) onward = new FY
  const bsStart = startAdYear + 57;
  const bsEnd = (bsStart + 1) % 100;
  return `${bsStart}-${String(bsEnd).padStart(2, "0")}`;
}

/** Approximate AD -> Bikram Sambat date string for receipts/reports (display only). */
export function toBikramSambat(d: Date = new Date()): string {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + 56);
  r.setMonth(r.getMonth() + 8);
  r.setDate(r.getDate() + 17);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())} BS`;
}
