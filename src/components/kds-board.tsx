"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
// Map state to Badge variant + extra ring color (a11y contrast WCAG AA).
const STATE_VARIANT: Record<string, "info" | "warning" | "success"> = {
  NEW: "info",
  PREPARING: "warning",
  READY: "success",
};
const STATE_RING: Record<string, string> = {
  NEW: "ring-sky-400",
  PREPARING: "ring-amber-400",
  READY: "ring-green-500",
};

const NORMAL_POLL_MS = 2000;
const OFFLINE_POLL_MS = 10000;
const SOUND_OPT_OUT_KEY = "kds:no-sound";

function playBeep() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SOUND_OPT_OUT_KEY) === "1") return;
  try {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 120);
  } catch {
    // Audio not available — silently ignore.
  }
}

export function KdsBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [station, setStation] = useState("all");
  const [now, setNow] = useState(() => new Date());
  const [offline, setOffline] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  // Hydrate sound opt-out preference.
  useEffect(() => {
    setSoundOn(window.localStorage.getItem(SOUND_OPT_OUT_KEY) !== "1");
  }, []);

  // Polling with backoff: 2s when online, 10s when offline.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try {
        const res = await fetch("/api/kds", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        if (!active) return;
        const data = (await res.json()) as { tickets: Ticket[] };
        // Detect new tickets (not seen before) → sound + announce.
        const fresh = data.tickets.filter((t) => !seenIds.current.has(t.id));
        if (!firstLoad.current && fresh.length > 0 && soundOn) playBeep();
        firstLoad.current = false;
        seenIds.current = new Set(data.tickets.map((t) => t.id));
        setTickets(data.tickets);
        setOffline(false);
        setNow(new Date());
        if (active) timer = setTimeout(load, NORMAL_POLL_MS);
      } catch {
        if (!active) return;
        setOffline(true);
        if (active) timer = setTimeout(load, OFFLINE_POLL_MS);
      }
    };
    load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [soundOn]);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      if (!next) window.localStorage.setItem(SOUND_OPT_OUT_KEY, "1");
      else window.localStorage.removeItem(SOUND_OPT_OUT_KEY);
      return next;
    });
  }, []);

  const stations = ["all", ...Object.keys(groupByStation(tickets))];
  const filtered = station === "all" ? tickets : tickets.filter((t) => t.station === station);
  const grouped = groupByStation(filtered);

  // Announce counts via aria-live. Use polite so screen readers don't
  // interrupt, and rely on a separate aria-live="assertive" for fresh tickets.
  const newCount = tickets.filter((t) => t.state === "NEW").length;
  const staleCount = tickets.filter((t) => elapsedMinutes(t.createdAt, now) >= 15).length;

  return (
    <div className="space-y-4">
      {offline && (
        <div role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          Connection lost — reconnecting… Tickets may be out of date.
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {tickets.length} active ticket{tickets.length === 1 ? "" : "s"}, {newCount} new, {staleCount} stale.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Station:</span>
        <label className="sr-only" htmlFor="kds-station">Filter by station</label>
        <Select value={station} onValueChange={setStation}>
          <SelectTrigger id="kds-station" aria-label="Filter by station" className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {stations.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Auto-refresh: {offline ? "10s (offline)" : "2s"}</span>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          className="ml-auto rounded-full border bg-muted/40 px-3 py-0.5 text-xs hover:bg-muted"
        >
          Sound: {soundOn ? "on" : "off"}
        </button>
      </div>
      {tickets.length === 0 && <p className="text-sm text-muted-foreground">No active tickets.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(grouped).map(([st, list]) => (
          <div key={st} className="space-y-3">
            <h2 className="text-lg font-semibold capitalize">{st} ({list.length})</h2>
            {list.map((t) => {
              const mins = elapsedMinutes(t.createdAt, now);
              const isFresh = mins < 1;
              const isStale = mins >= 15;
              return (
                <Card
                  key={t.id}
                  className={[
                    "ring-2 ring-transparent transition-all",
                    isStale ? "border-destructive" : "",
                    isFresh ? `animate-pulse-ring ${STATE_RING[t.state]}` : "",
                  ].filter(Boolean).join(" ")}
                >
                  <CardHeader className="flex-row items-center justify-between space-y-0 py-2">
                    <CardTitle className="text-base">
                      #{t.order.number} {t.order.table ? `· ${t.order.table.name}` : `· ${t.order.type}`}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant={STATE_VARIANT[t.state]}>{t.state.toLowerCase()}</Badge>
                      <span className={`text-xs ${isStale ? "font-bold text-destructive" : "text-muted-foreground"}`}>{mins}m</span>
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
      {/* Inject the pulse-ring keyframes once. */}
      <style jsx>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.0); }
          50% { box-shadow: 0 0 0 8px rgba(56, 189, 248, 0.4); }
        }
        .animate-pulse-ring { animation: pulse-ring 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
