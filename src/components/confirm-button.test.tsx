import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as React from "react";
import { ConfirmSubmit, ConfirmButton } from "./confirm-button";

function FormWithSubmit({ onSubmit }: { onSubmit: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <ConfirmSubmit
        title="Approve this void?"
        description="Stock for served items will be restored."
        confirmLabel="Approve"
        triggerVariant="default"
        triggerSize="sm"
      >
        Approve
      </ConfirmSubmit>
    </form>
  );
}

describe("ConfirmSubmit (P1-2)", () => {
  it("renders the trigger button with its label", () => {
    render(<FormWithSubmit onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
  });

  it("opens a dialog with title + description on click", () => {
    render(<FormWithSubmit onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(screen.getByText("Approve this void?")).toBeTruthy();
    expect(screen.getByText("Stock for served items will be restored.")).toBeTruthy();
  });

  it("cancelling does NOT submit the form", () => {
    const onSubmit = vi.fn();
    render(<FormWithSubmit onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("confirming submits the form", () => {
    const onSubmit = vi.fn();
    render(<FormWithSubmit onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("ConfirmButton backwards-compat shim renders the dialog", () => {
    render(
      <form>
        <ConfirmButton confirmMessage="Are you sure?" variant="default">
          Do it
        </ConfirmButton>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    expect(screen.getByText("Are you sure?")).toBeTruthy();
    expect(screen.getByText("Please confirm")).toBeTruthy();
  });
});
