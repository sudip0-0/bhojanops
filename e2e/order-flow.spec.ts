import { test, expect } from "@playwright/test";

test("waiter creates a takeaway order, adds an item, sends to kitchen", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "waiter@bhojanops.local");
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/tables/);

  // New takeaway order (stable: doesn't depend on table availability)
  await page.getByRole("button", { name: "New Takeaway" }).click();
  await expect(page).toHaveURL(/\/orders\//);

  // add first menu item (Radix combobox)
  await page.getByLabel("Select menu item").click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Add to order" }).click();

  // send to kitchen
  await page.getByRole("button", { name: "Send to kitchen" }).click();
  await expect(page.getByText(/sent/i).first()).toBeVisible();
});
