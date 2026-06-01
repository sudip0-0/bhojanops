// Nepal-specific display helpers. BS conversion is approximate and display-only (AD is source of truth).

export function formatNPR(amount: number): string {
  return "Rs " + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Nepali fiscal year starts around mid-July AD (Shrawan 1 BS). 16 July is
// the official pivot; anything before 16-July is still the previous FY
// (e.g. 15-Jul-2025 AD ≈ 30-Ashar-2082 BS, last month of FY 2081-82).
export const NEPAL_FY_BOUNDARY_MONTH = 6; // 0-indexed: July
export const NEPAL_FY_BOUNDARY_DAY = 16;

function isAfterFyBoundary(d: Date): boolean {
  const m = d.getMonth();
  const day = d.getDate();
  return m > NEPAL_FY_BOUNDARY_MONTH || (m === NEPAL_FY_BOUNDARY_MONTH && day >= NEPAL_FY_BOUNDARY_DAY);
}

/** Nepali fiscal year (Shrawan–Ashar, ~mid-July boundary). Approximate AD->BS mapping. */
export function nepaliFiscalYear(d: Date = new Date()): string {
  const y = d.getFullYear();
  const startAdYear = isAfterFyBoundary(d) ? y : y - 1;
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
