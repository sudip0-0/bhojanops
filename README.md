# BhojanOps

A Nepal-fit, role-based restaurant operations system: dine-in ordering, kitchen display, VAT/PAN billing with 80mm receipts, inventory & recipe deduction, shift settlement, reports, and audit logs.

Built with **Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma · PostgreSQL · Auth.js v5 · Zod · Recharts · Vitest · Playwright**.

## Quick start (local)

```bash
# 1. Start PostgreSQL (Docker)
docker compose up -d            # Postgres on localhost:5434

# 2. Install deps
npm install

# 3. Configure env (already provided for local)
copy .env.example .env          # Windows  (cp on macOS/Linux)

# 4. Create schema + seed demo data
npm run db:push
npm run db:seed

# 5. Run
npm run dev                     # http://localhost:3000
```

## Demo accounts

All passwords: `password123`

| Role      | Email                       | Lands on        |
|-----------|-----------------------------|-----------------|
| Owner     | owner@bhojanops.local       | Dashboard       |
| Manager   | manager@bhojanops.local     | Dashboard       |
| Cashier   | cashier@bhojanops.local     | Dashboard       |
| Waiter    | waiter@bhojanops.local      | Tables & Orders |
| Kitchen   | kitchen@bhojanops.local     | Kitchen Display |
| Inventory | inventory@bhojanops.local   | Inventory       |
| Auditor   | auditor@bhojanops.local     | Reports         |

## Verification commands

```bash
npm run lint
npm run typecheck
npm run test          # Vitest unit tests
npm run build
npx prisma validate
npm run db:push
npm run db:seed
npm run e2e           # Playwright (needs build + Postgres)
```

## Nepal-specific behavior & assumptions

- **Currency** NPR; totals rounded to nearest NPR 1 with a `Round Off` line.
- **VAT-inclusive pricing** (default 13%): menu prices already include VAT, which is back-calculated for the tax invoice (`VAT = base × rate/(100+rate)`).
- **Service charge** is applied to the (discounted) inclusive base **before** VAT is back-calculated. Service charge applies to dine-in; packaging applies to takeaway/delivery.
- **PAN/VAT** number and tax-vs-non-tax receipt mode are configurable on the restaurant profile; VAT breakdown prints only in TAX mode.
- **Fiscal-year invoice numbering**: `PREFIX-FY-0001`, unique per branch + Nepali fiscal year (Shrawan–Ashar boundary). FY/BS mapping is **approximate** and display-only; AD is the source of truth.
- **BS date** is shown on receipts via an approximate converter (display only).
- **Stock deducts on item *served*** (kitchen marks served); approved voids/refunds of served items reverse stock.

## Security model

- DB-driven **Role + Permission** tables; the owner can assign permissions to roles.
- Every mutation calls `authorize(permission)` server-side (throws → rejected even if called manually). Pages use `requirePermission()` (redirect to `/access-denied`).
- Auth.js v5 **JWT sessions** embed `role/branchId/permissions`; middleware guards all non-public routes.
- Finalized bills are **immutable** (snapshot rows); corrections go through void/refund flows. Sensitive actions are **audit-logged**.

See `docs/ARCHITECTURE.md` and `docs/DEMO.md`.
