import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory prisma stub that serialises upserts on a per-branch FIFO queue,
// mirroring the row lock that the real `upsert ... increment` would acquire
// inside a Postgres transaction. The test asserts that 50 parallel callers
// each receive a unique, sequential number.
type Seq = { lastNumber: number };
const branches: Record<string, Seq> = {};
const queues: Record<string, Promise<unknown>> = {};

const tx: any = {
  orderSequence: {
    upsert({ where, create, update }: any) {
      const branchId = where.branchId;
      const prev = queues[branchId] ?? Promise.resolve();
      const next = prev.then(() => {
        if (!branches[branchId]) {
          branches[branchId] = { lastNumber: create.lastNumber };
        } else {
          branches[branchId].lastNumber += update.lastNumber.increment;
        }
        return branches[branchId];
      });
      // Store a never-rejecting tail so failures in one caller do not block the queue.
      queues[branchId] = next.catch(() => undefined);
      return next;
    },
  },
  order: {
    create({ data }: any) {
      return { id: `ord_${data.number}`, ...data };
    },
  },
  $transaction: (fn: (t: any) => Promise<unknown>) => fn(tx),
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orderSequence: {},
    $transaction: (fn: (t: any) => Promise<unknown>) => fn(tx),
  },
}));

import { allocateOrderNumber } from "./order-number";

describe("allocateOrderNumber (P0-2)", () => {
  beforeEach(() => {
    for (const k of Object.keys(branches)) delete branches[k];
    for (const k of Object.keys(queues)) delete queues[k];
  });

  it("starts at 1 for a fresh branch", async () => {
    expect(await allocateOrderNumber("bA")).toBe(1);
    expect(await allocateOrderNumber("bA")).toBe(2);
    expect(await allocateOrderNumber("bA")).toBe(3);
  });

  it("50 parallel allocations are all unique (atomic increment)", async () => {
    const nums = await Promise.all(
      Array.from({ length: 50 }, () => allocateOrderNumber("bRace")),
    );
    const set = new Set(nums);
    expect(set.size, `nums=${JSON.stringify([...nums].sort((a, b) => a - b))}`).toBe(50);
    expect(Math.max(...nums)).toBe(50);
    expect(Math.min(...nums)).toBe(1);
  });

  it("branches have independent sequences", async () => {
    expect(await allocateOrderNumber("b1")).toBe(1);
    expect(await allocateOrderNumber("b2")).toBe(1);
    expect(await allocateOrderNumber("b1")).toBe(2);
    expect(await allocateOrderNumber("b2")).toBe(2);
  });
});
