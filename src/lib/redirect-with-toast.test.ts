import { describe, it, expect, vi } from "vitest";

let captured: string | null = null;

vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    captured = u;
    throw new Error("__redirect__");
  },
}));

function captureRedirect(fn: () => never): string {
  captured = null;
  try {
    fn();
  } catch (e) {
    if (!(e instanceof Error) || e.message !== "__redirect__") throw e;
  }
  if (captured === null) throw new Error("redirect was not called");
  return captured;
}

// Import after vi.mock so it sees the mocked `redirect`.
import { redirectWithToast, TOAST_QUERY_PARAM } from "./redirect-with-toast";

describe("redirectWithToast (P1-3)", () => {
  it("appends a base64url-encoded toast payload to the URL", () => {
    const url = captureRedirect(() =>
      redirectWithToast("/orders/abc", "Order created"),
    );
    expect(url.startsWith("/orders/abc?")).toBe(true);
    const params = new URL(url, "http://x.invalid").searchParams;
    const raw = params.get(TOAST_QUERY_PARAM);
    expect(raw).toBeTruthy();
    const decoded = JSON.parse(Buffer.from(raw!, "base64url").toString("utf8"));
    expect(decoded).toEqual({ message: "Order created", variant: "success" });
  });

  it("supports a custom variant", () => {
    const url = captureRedirect(() =>
      redirectWithToast("/x", { message: "Heads up", variant: "info" }),
    );
    const raw = new URL(url, "http://x.invalid").searchParams.get(TOAST_QUERY_PARAM)!;
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    expect(decoded.variant).toBe("info");
  });

  it("preserves existing query params (e.g. ?sent=1)", () => {
    const url = captureRedirect(() => redirectWithToast("/orders/9?sent=1", "Sent!"));
    const u = new URL(url, "http://x.invalid");
    expect(u.searchParams.get("sent")).toBe("1");
    expect(u.searchParams.get(TOAST_QUERY_PARAM)).toBeTruthy();
  });

  it("dedupes identical keys (no stacking)", () => {
    const first = captureRedirect(() =>
      redirectWithToast("/x", { message: "Saved", variant: "success", key: "save-1" }),
    );
    const sep = first.includes("?") ? "&" : "?";
    const second = captureRedirect(() =>
      redirectWithToast(first + `${sep}_done=1`, { message: "Saved", variant: "success", key: "save-1" }),
    );
    const matches = second.match(/toast=/g) ?? [];
    expect(matches.length).toBe(1);
  });
});
