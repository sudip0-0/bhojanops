export function expectedCash(openingCash: number, cashPayments: number, cashRefunds: number): number {
  return Math.round((openingCash + cashPayments - cashRefunds) * 100) / 100;
}

export function variance(counted: number, expected: number): number {
  return Math.round((counted - expected) * 100) / 100;
}

/** Variance beyond threshold (default NPR 500) needs manager approval. */
export function isLargeVariance(v: number, threshold = 500): boolean {
  return Math.abs(v) > threshold;
}
