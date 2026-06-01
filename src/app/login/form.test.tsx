import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("./actions", () => ({ login: vi.fn(async () => undefined) }));

import { LoginForm } from "./form";

describe("LoginForm", () => {
  it("renders email + password + submit", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("does not show demo creds by default", () => {
    render(<LoginForm />);
    expect(document.getElementById("demo-creds")).toBeNull();
    expect(screen.queryByRole("button", { name: "owner" })).toBeNull();
  });

  it("toggles demo creds section when the button is clicked", () => {
    render(<LoginForm />);
    const toggle = screen.getByRole("button", { name: /demo credentials/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById("demo-creds");
    expect(panel).not.toBeNull();
    expect(within(panel!).getByRole("button", { name: "owner" })).toBeTruthy();
    expect(within(panel!).getByRole("button", { name: "cashier" })).toBeTruthy();
  });

  it("clicking a demo role fills the inputs", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /demo credentials/i }));
    fireEvent.click(screen.getByRole("button", { name: "cashier" }));
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe("cashier@bhojanops.local");
    expect((screen.getByLabelText(/password/i) as HTMLInputElement).value).toBe("password123");
  });

  it("shows a 'Forgot password?' link to /forgot-password", () => {
    render(<LoginForm />);
    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link.getAttribute("href")).toBe("/forgot-password");
  });

  it("renders a 'Password updated' banner when ?reset=1", () => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({
      useSearchParams: () => new URLSearchParams("reset=1"),
    }));
    return import("./form").then(({ LoginForm: L }) => {
      const { container } = render(<L />);
      expect(container.textContent).toContain("Password updated");
    });
  });
});
