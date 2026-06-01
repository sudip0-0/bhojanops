export type TicketStateValue = "NEW" | "PREPARING" | "READY" | "SERVED";

export function nextTicketState(s: TicketStateValue): TicketStateValue | null {
  const order: TicketStateValue[] = ["NEW", "PREPARING", "READY", "SERVED"];
  const idx = order.indexOf(s);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
}

export function elapsedMinutes(createdAt: Date | string, now: Date = new Date()): number {
  const start = new Date(createdAt).getTime();
  return Math.max(0, Math.floor((now.getTime() - start) / 60000));
}

export function groupByStation<T extends { station: string }>(tickets: T[]): Record<string, T[]> {
  return tickets.reduce<Record<string, T[]>>((acc, t) => {
    (acc[t.station] ??= []).push(t);
    return acc;
  }, {});
}
