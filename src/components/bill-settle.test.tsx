import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/(app)/billing/actions", () => ({
  finalizeBill: vi.fn(),
}));

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BillSettle } from "./bill-settle";

function setup() {
  return render(
    <BillSettle
      orderId="ord_1"
      lines={[{ name: "Momo", unitPrice: 250, qty: 2 }]}
      serviceChargePct={10}
      packaging={0}
      vatRate={13}
      canDiscount={false}
    />,
  );
}

describe("BillSettle overpay UX (P1-15)", () => {
  it("renders the grand total + submit button in initial state", () => {
    setup();
    expect(screen.getByText(/Grand Total/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Finalize/i })).toBeTruthy();
    // No overpay initially — Trim to exact should NOT be shown.
    expect(screen.queryByRole("button", { name: /Trim to exact/i })).toBeNull();
    cleanup();
  });

  it("Exact cash button fills the grand total in the first row", () => {
    setup();
    const exact = screen.getByRole("button", { name: /Exact cash/i });
    fireEvent.click(exact);
    const amount = screen.getByLabelText("Payment amount") as HTMLInputElement;
    expect(Number(amount.value)).toBeGreaterThan(0);
    cleanup();
  });

  it("+ Payment adds a second row and ✕ removes it", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /\+ Payment/i }));
    expect(screen.getAllByLabelText("Payment amount").length).toBe(2);
    // Two remove buttons now (one per row) — click the last one.
    const removes = screen.getAllByRole("button", { name: /Remove payment row/i });
    fireEvent.click(removes[removes.length - 1]);
    expect(screen.getAllByLabelText("Payment amount").length).toBe(1);
    cleanup();
  });
});
