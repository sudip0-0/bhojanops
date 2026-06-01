import { describe, it, expect } from "vitest";
import { filterNav, landingPath } from "./nav";

describe("filterNav", () => {
  it("kitchen sees only dashboard + KDS", () => {
    const items = filterNav(["kds.view", "kds.update"]).map((i) => i.href);
    expect(items).toEqual(["/dashboard", "/kds"]);
  });
  it("owner-like full perms sees everything", () => {
    const all = ["order.create", "kds.view", "void.approve", "bill.create", "menu.manage", "tables.manage", "stock.manage", "shift.open", "reports.view", "audit.view", "users.manage", "settings.manage"];
    expect(filterNav(all).length).toBe(13);
  });
});

describe("landingPath", () => {
  it("kitchen -> /kds", () => expect(landingPath("kitchen")).toBe("/kds"));
  it("cashier -> /dashboard", () => expect(landingPath("cashier")).toBe("/dashboard"));
  it("waiter -> /tables", () => expect(landingPath("waiter")).toBe("/tables"));
});
