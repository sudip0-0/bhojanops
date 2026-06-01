import { describe, it, expect } from "vitest";
import { isoDate, startOfDay, endOfDay, presetToRange, RANGE_PRESETS } from "./date-presets";

describe("date-presets (P1-4)", () => {
  it("isoDate uses local components, not UTC", () => {
    const d = new Date(2025, 0, 5); // Jan 5, 2025 local
    expect(isoDate(d)).toBe("2025-01-05");
  });

  it("startOfDay zeroes hours", () => {
    const d = new Date(2025, 0, 5, 14, 33, 22, 999);
    const s = startOfDay(d);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(s.getSeconds()).toBe(0);
    expect(s.getMilliseconds()).toBe(0);
  });

  it("endOfDay is 23:59:59.999", () => {
    const d = new Date(2025, 0, 5);
    const e = endOfDay(d);
    expect(e.getHours()).toBe(23);
    expect(e.getMinutes()).toBe(59);
    expect(e.getSeconds()).toBe(59);
    expect(e.getMilliseconds()).toBe(999);
  });

  it("RANGE_PRESETS has 6 entries covering today / yesterday / weeks / months", () => {
    expect(RANGE_PRESETS.map((p) => p.label)).toEqual([
      "Today",
      "Yesterday",
      "This Week",
      "Last Week",
      "This Month",
      "Last Month",
    ]);
  });

  it("presetToRange returns ISO dates with from <= to", () => {
    for (const p of RANGE_PRESETS) {
      const r = presetToRange(p);
      expect(r.from <= r.to, `${p.label}: from=${r.from} to=${r.to}`).toBe(true);
    }
  });

  it("Today preset: from === to", () => {
    const r = presetToRange(RANGE_PRESETS[0]);
    expect(r.from).toBe(r.to);
  });

  it("Yesterday preset: from === to and < Today", () => {
    const today = presetToRange(RANGE_PRESETS[0]);
    const y = presetToRange(RANGE_PRESETS[1]);
    expect(y.from).toBe(y.to);
    expect(y.from < today.from).toBe(true);
  });
});
