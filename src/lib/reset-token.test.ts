import { vi, describe, it, expect, beforeEach } from "vitest";

type Row = { userId: string; tokenHash: string; expiresAt: Date; usedAt: Date | null };
const store: Row[] = [];
const fakePrisma = {
  passwordResetToken: {
    async create({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) {
      const row: Row = { userId: data.userId, tokenHash: data.tokenHash, expiresAt: data.expiresAt, usedAt: null };
      store.push(row);
      return data;
    },
    async findUnique({ where }: { where: { tokenHash: string } }) {
      const r = store.find((x) => x.tokenHash === where.tokenHash);
      return r ? { userId: r.userId, tokenHash: r.tokenHash, expiresAt: r.expiresAt, usedAt: r.usedAt } : null;
    },
    async update({ where, data }: { where: { tokenHash: string }; data: { usedAt: Date } }) {
      const r = store.find((x) => x.tokenHash === where.tokenHash);
      if (!r) throw new Error("not found");
      r.usedAt = data.usedAt;
      return r;
    },
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma }));

const { issuePasswordResetToken, consumePasswordResetToken } = await import("./reset-token");

const TOKEN_TTL_MS = 60 * 60 * 1000;

describe("issuePasswordResetToken / consumePasswordResetToken", () => {
  beforeEach(() => {
    store.length = 0;
  });

  it("issues a token whose hash is stored, not the raw value", async () => {
    const { raw, expiresAt } = await issuePasswordResetToken("u1", 1000);
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(expiresAt.getTime()).toBe(1000 + TOKEN_TTL_MS);
    const stored = store[0]!;
    expect(stored.tokenHash).not.toBe(raw);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.usedAt).toBeNull();
  });

  it("consumes a fresh token and marks it used", async () => {
    const { raw } = await issuePasswordResetToken("u1", 1000);
    const r = await consumePasswordResetToken(raw, 2000);
    expect(r).toEqual({ userId: "u1" });
    expect(store[0]!.usedAt).toEqual(new Date(2000));
  });

  it("rejects unknown token", async () => {
    expect(await consumePasswordResetToken("nope", 2000)).toEqual({ reason: "not_found" });
  });

  it("rejects expired token", async () => {
    const { raw } = await issuePasswordResetToken("u1", 1000);
    expect(await consumePasswordResetToken(raw, 1000 + TOKEN_TTL_MS + 1)).toEqual({ reason: "expired" });
    expect(store[0]!.usedAt).toBeNull();
  });

  it("rejects already-used token", async () => {
    const { raw } = await issuePasswordResetToken("u1", 1000);
    const r1 = await consumePasswordResetToken(raw, 2000);
    expect(r1).toEqual({ userId: "u1" });
    const r2 = await consumePasswordResetToken(raw, 3000);
    expect(r2).toEqual({ reason: "used" });
  });
});
