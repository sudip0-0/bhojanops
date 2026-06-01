"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupByStation, elapsedMinutes } from "@/lib/kds";
import { advanceTicket } from "@/app/(app)/kds/actions";

type Ticket = {
  id: string; station: string; state: string; createdAt: string;
  order: { number: number; type: string; table: { name: string } | null };
  items: { id: string; nameSnapshot: string; qty: number; notes: string | null; state: string }[];
};

const NEXT_LABEL: Record<string, string> = { NEW: "Start preparing", PREPARING: "Mark ready", READY: "Mark served" };
const STATE_COLOR: Record<string, string> = { NEW: "bg-blue-100 text-blue-800", PREPARING: "bg-amber-100 text-amber-800", READY: "bg-green-100 text-green-800" };

export function KdsBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [station, setStation] = useState("all");
  const [now, setNow] = useState(() => new Date());
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/kds", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        if (active) {
          setTickets((await res.json()).tickets);
          setOffline(false);
          setNow(new Date());
        }
      } catch {
        if (active) setOffline(true);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const stations = ["all", ...Object.keys(groupByStation(tickets))];
  const filtered = station === "all" ? tickets : tickets.filter((t) => t.station === station);
  const grouped = groupByStation(filtered);

  return (
    <div className="space-y-4">
      {offline && (
        <div role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          Connection lost — reconnecting… Tickets may be out of date.
        </div>
      )}
      <p aria-live="polite" className="sr-only">{tickets.length} active tickets</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Station:</span>
        <label className="sr-only" htmlFor="kds-station">Filter by station</label>
        <Select value={station} onValueChange={setStation}>
          <SelectTrigger id="kds-station" aria-label="Filter by station" className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {stations.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Auto-refresh every 5s</span>
      </div>
      {tickets.length === 0 && <p className="text-sm text-muted-foreground">No active tickets.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(grouped).map(([st, list]) => (
          <div key={st} className="space-y-3">
            <h2 className="text-lg font-semibold capitalize">{st} ({list.length})</h2>
            {list.map((t) => {
              const mins = elapsedMinutes(t.createdAt, now);
              return (
                <Card key={t.id} className={mins >= 15 ? "border-destructive" : ""}>
                  <CardHeader className="flex-row items-center justify-between space-y-0 py-2">
                    <CardTitle className="text-base">
                      #{t.order.number} {t.order.table ? `· ${t.order.table.name}` : `· ${t.order.type}`}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge className={STATE_COLOR[t.state]}>{t.state.toLowerCase()}</Badge>
                      <span className={`text-xs ${mins >= 15 ? "font-bold text-destructive" : "text-muted-foreground"}`}>{mins}m</span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <ul className="mb-2 text-sm">
                      {t.items.map((it) => (
                        <li key={it.id}>{it.qty}× {it.nameSnapshot}{it.notes && <span className="text-xs text-muted-foreground"> — {it.notes}</span>}</li>
                      ))}
                    </ul>
                    {NEXT_LABEL[t.state] && (
                      <form action={advanceTicket}>
                        <input type="hidden" name="ticketId" value={t.id} />
                        <Button type="submit" size="sm" className="w-full">{NEXT_LABEL[t.state]}</Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
