import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { Toaster, toast } from "./toaster";

describe("Toaster (P1-16)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders a success toast on the toast() call", () => {
    render(<Toaster />);
    act(() => {
      toast("Order saved", "success");
    });
    expect(screen.getByText("Order saved")).toBeTruthy();
  });

  it("renders error, info, and warning variants distinctly", () => {
    render(<Toaster />);
    act(() => {
      toast("e", "error");
      toast("i", "info");
      toast("w", "warning");
    });
    expect(screen.getByText("e")).toBeTruthy();
    expect(screen.getByText("i")).toBeTruthy();
    expect(screen.getByText("w")).toBeTruthy();
  });

  it("dismiss button removes the toast", () => {
    render(<Toaster />);
    act(() => {
      toast("Bye", "info");
    });
    fireEvent.click(screen.getByRole("button", { name: /Dismiss notification/i }));
    expect(screen.queryByText("Bye")).toBeNull();
  });

  it("Escape key dismisses the topmost toast", () => {
    render(<Toaster />);
    act(() => {
      toast("first");
      toast("second");
    });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("second")).toBeNull();
    expect(screen.getByText("first")).toBeTruthy();
  });

  it("auto-dismisses after the default timeout", () => {
    render(<Toaster />);
    act(() => {
      toast("auto");
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("auto")).toBeNull();
  });

  it("caps the stack depth at MAX_STACK (5)", () => {
    render(<Toaster />);
    act(() => {
      for (let i = 0; i < 8; i++) toast(`t${i}`);
    });
    const visible = screen.getAllByText(/^t\d$/);
    expect(visible.length).toBe(5);
    // The oldest (t0, t1, t2) should be dropped; t3..t7 visible.
    expect(screen.queryByText("t0")).toBeNull();
    expect(screen.queryByText("t1")).toBeNull();
    expect(screen.queryByText("t2")).toBeNull();
    expect(screen.getByText("t3")).toBeTruthy();
    expect(screen.getByText("t7")).toBeTruthy();
  });
});
