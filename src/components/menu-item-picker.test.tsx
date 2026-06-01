import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MenuItemPicker, type PickerCategory } from "./menu-item-picker";

const cats: PickerCategory[] = [
  {
    id: "c1",
    name: "Mains",
    items: [
      {
        id: "i1",
        name: "Momo",
        price: 250,
        variants: [
          { id: "v1", name: "Steam", priceDelta: 0 },
          { id: "v2", name: "Fried", priceDelta: 30 },
        ],
        modifierGroups: [
          {
            id: "g1",
            name: "Sauce",
            modifiers: [
              { id: "m1", name: "Tomato", price: 20 },
              { id: "m2", name: "Mayo", price: 30 },
            ],
          },
        ],
      },
    ],
  },
];

describe("MenuItemPicker (P1-8)", () => {
  it("renders category tabs and item buttons", () => {
    render(<MenuItemPicker categories={cats} />);
    expect(screen.getByRole("tab", { name: "Mains" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Momo/ })).toBeTruthy();
  });

  it("opening an item shows variant radios + modifier checkboxes", () => {
    render(<MenuItemPicker categories={cats} />);
    fireEvent.click(screen.getByRole("button", { name: /Momo/ }));
    expect(screen.getByText("Steam")).toBeTruthy();
    expect(screen.getByText("Fried")).toBeTruthy();
    expect(screen.getByText("Tomato")).toBeTruthy();
    expect(screen.getByText("Mayo")).toBeTruthy();
  });

  it("selection value is empty until an item is opened", () => {
    render(<MenuItemPicker categories={cats} />);
    const hidden = document.querySelector('input[name="selection"]') as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  it("selection value updates when a variant is picked", () => {
    render(<MenuItemPicker categories={cats} />);
    fireEvent.click(screen.getByRole("button", { name: /Momo/ }));
    // The label wraps the input; click the variant's text span.
    fireEvent.click(screen.getByText("Fried"));
    const hidden = document.querySelector('input[name="selection"]') as HTMLInputElement;
    expect(hidden.value).toBe("i1|v2");
  });

  it("modifiers hidden input is a JSON array of picked mods", () => {
    render(<MenuItemPicker categories={cats} />);
    fireEvent.click(screen.getByRole("button", { name: /Momo/ }));
    fireEvent.click(screen.getByText("Mayo"));
    const hidden = document.querySelector('input[name="modifiers"]') as HTMLInputElement;
    const parsed = JSON.parse(hidden.value);
    expect(parsed).toEqual([{ name: "Mayo", price: 30 }]);
  });
});
