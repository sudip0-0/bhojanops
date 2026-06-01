# BhojanOps — Demo Script

Seeded data: **Kathmandu Momo & Cafe**, 2 branches, 3 floors, 18 tables, 50 menu items, 20 stock items, recipes, historical orders/bills, shifts, audit logs. All passwords `password123`.

Run `npm run db:seed` for a clean state, then `npm run dev`.

1. **Owner — setup & users**
   - Login `owner@bhojanops.local`. See dashboard KPIs (today's sales, payment mix, top items, low stock).
   - Go to **Settings** → edit VAT %, service charge, PAN/VAT, receipt mode → Save.
   - Go to **Users** → create a staff user, then deactivate/activate.

2. **Waiter — dine-in order**
   - Login `waiter@bhojanops.local` (lands on **Tables & Orders**).
   - Click a table → **New order** → add items (variants like Half/Full appear), set qty/notes, set guests.
   - **Send to kitchen** (unsent items can be removed; sent items lock).

3. **Kitchen — KDS**
   - Login `kitchen@bhojanops.local` (lands on **Kitchen Display**).
   - Tickets appear grouped by station within 5s, with wait timers (red ≥ 15 min).
   - Advance: **Start preparing → Mark ready → Mark served**. Serving deducts recipe stock.

4. **Cashier — billing & shift**
   - Login `cashier@bhojanops.local`. Open a shift (opening cash) on **Shifts** if none is open.
   - **Billing** → pick the open order → apply a discount → add **split payments** (e.g. Cash + eSewa) → **Finalize**.
   - Receipt opens (80mm). **Print receipt** (browser print preview fits 80mm; shows AD + BS date, VAT breakdown in TAX mode).
   - Close shift → counted vs expected cash, variance recorded.

5. **Manager — void approval & refund**
   - As waiter, request a void on a *sent* item (with reason).
   - Login `manager@bhojanops.local` → **Void Requests** → Approve (reverses stock if already served).
   - On a finalized receipt, use **Refund / Void bill** (records refund, reverses served-item stock; bill stays immutable).

6. **Inventory**
   - Login `inventory@bhojanops.local` → record a **Purchase** (stock increases), **Wastage**, map a **Recipe** ingredient. Low-stock items are flagged.

7. **Auditor — read-only**
   - Login `auditor@bhojanops.local` → **Reports** (date range, CSV export) and **Audit Logs** (filter by action/user/date). No mutation controls.

8. **Server-side authorization check**
   - As cashier, `fetch('/api/kds')` in the browser console → **403**. As kitchen, `fetch('/api/reports/export')` → **403**. Page-level access to `/settings` as cashier → **Access Denied**.
