import { test, expect } from "@playwright/test";

async function login(page: any, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
}

test("owner logs in and reaches dashboard", async ({ page }) => {
  await login(page, "owner@bhojanops.local");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("cashier cannot access settings (access denied)", async ({ page }) => {
  await login(page, "cashier@bhojanops.local");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/access-denied/);
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/reports");
  await expect(page).toHaveURL(/\/login/);
});
