import { test, expect } from "@playwright/test";

async function login(page: any, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
}

test("kitchen lands on KDS", async ({ page }) => {
  await login(page, "kitchen@bhojanops.local");
  await expect(page).toHaveURL(/\/kds/);
});

test("waiter lands on tables", async ({ page }) => {
  await login(page, "waiter@bhojanops.local");
  await expect(page).toHaveURL(/\/tables/);
});

test("auditor lands on reports and is blocked from settings", async ({ page }) => {
  await login(page, "auditor@bhojanops.local");
  await expect(page).toHaveURL(/\/reports/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/access-denied/);
});

test("kitchen cannot pull reports export API (403)", async ({ page }) => {
  await login(page, "kitchen@bhojanops.local");
  await expect(page).toHaveURL(/\/kds/);
  const status = await page.evaluate(async () => (await fetch("/api/reports/export")).status);
  expect(status).toBe(403);
});

test("cashier cannot pull KDS API (403)", async ({ page }) => {
  await login(page, "cashier@bhojanops.local");
  await expect(page).toHaveURL(/\/dashboard/);
  const status = await page.evaluate(async () => (await fetch("/api/kds")).status);
  expect(status).toBe(403);
});
