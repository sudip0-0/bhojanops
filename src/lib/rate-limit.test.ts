import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, loginLimiter, passwordResetLimiter } from "./rate-limit";

function keyOf(s: string) {
  return s.trim().toLowerCase();
}

describe("rateLimit", () => {
  it("allows up to max hits in the window", () => {
    const now = 1_000_000;
    const rl = rateLimit({ name: "t1", windowMs: 60_000, max: 3 });
    expect(rl.hit("a", now).allowed).toBe(true);
    expect(rl.hit("a", now + 1).allowed).toBe(true);
    expect(rl.hit("a", now + 2).allowed).toBe(true);
    const r = rl.hit("a", now + 3);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("forgets hits after the window passes", () => {
    const rl = rateLimit({ name: "t2", windowMs: 1000, max: 1 });
    expect(rl.hit("a", 0).allowed).toBe(true);
    expect(rl.hit("a", 500).allowed).toBe(false);
    expect(rl.hit("a", 1500).allowed).toBe(true);
  });

  it("buckets are per-key", () => {
    const rl = rateLimit({ name: "t3", windowMs: 60_000, max: 1 });
    expect(rl.hit("a", 0).allowed).toBe(true);
    expect(rl.hit("b", 0).allowed).toBe(true);
    expect(rl.hit("a", 10).allowed).toBe(false);
  });

  it("reset clears hits", () => {
    const rl = rateLimit({ name: "t4", windowMs: 60_000, max: 1 });
    expect(rl.hit("a", 0).allowed).toBe(true);
    rl.reset("a");
    expect(rl.hit("a", 10).allowed).toBe(true);
  });
});

describe("loginLimiter / passwordResetLimiter", () => {
  it("loginLimiter allows 10 attempts per 15 min per key", () => {
    const k = "alice@bhojanops.local";
    for (let i = 0; i < 10; i++) {
      expect(loginLimiter.hit(k, i).allowed).toBe(true);
    }
    expect(loginLimiter.hit(k, 11).allowed).toBe(false);
  });
  it("passwordResetLimiter allows 5 per hour per email", () => {
    const e = "alice@bhojanops.local";
    for (let i = 0; i < 5; i++) {
      expect(passwordResetLimiter.hit(e, i).allowed).toBe(true);
    }
    expect(passwordResetLimiter.hit(e, 6).allowed).toBe(false);
  });
  it("different keys are isolated", () => {
    loginLimiter.reset();
    passwordResetLimiter.reset();
    for (let i = 0; i < 10; i++) loginLimiter.hit("a", i);
    expect(loginLimiter.hit("a", 11).allowed).toBe(false);
    expect(loginLimiter.hit("b", 11).allowed).toBe(true);
  });
  it("keyOf lowercases + trims", () => {
    expect(keyOf("  Foo@Bar.com  ")).toBe("foo@bar.com");
  });
});
