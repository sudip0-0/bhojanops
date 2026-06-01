# BhojanOps — Architecture

## Stack & layering

```
UI (App Router pages + shadcn/ui)
  → Server Actions / Route Handlers
    → authorize()/requirePermission() + branch scope
      → pure domain services (billing, stock, order, kds, shift, reports)
        → PostgreSQL via Prisma
Auth.js v5 (JWT) + middleware route guard · writeAudit() on sensitive actions
```

- **Pure domain logic** lives in `src/lib/*` and is unit-tested in isolation (no DB): `billing.ts`, `stock.ts`, `order.ts`, `kds.ts`, `shift.ts`, `reports.ts`, `invoice.ts`, `nepal.ts`, `tables.ts`, `menu.ts`, `rbac/`.
- **Server Actions** (`src/app/(app)/**/actions.ts`) and **Route Handlers** (`src/app/api/**`) perform authorization, call services, persist via Prisma, and write audit logs.
- **UI** is mostly server components; a few client components handle interactivity: `kds-board` (5s polling), `bill-settle` (live totals + split payments), `dashboard-charts` (Recharts), settings forms, login.

## Authorization

- **DB-driven RBAC**: `Role` ↔ `Permission` via `RolePermission`. Catalog + default role map in `src/lib/rbac/permissions.ts` (seeded).
- On login the user's permission keys are resolved from the DB and embedded in the JWT (`src/auth.ts`). `maxAge` 30 min.
- `requirePermission(key)` (pages → redirect `/access-denied`) and `authorize(key)` (actions/handlers → throw) both resolve from `can(permissions, key)`.
- `middleware.ts` (edge, `src/auth.config.ts`) blocks unauthenticated access to all non-public routes.
- **Branch scoping**: `branchScope(user)` / per-query `where` — owner & auditor see all branches; others are scoped to their `branchId`.

## Billing (VAT-inclusive)

`computeBill()` in `src/lib/billing.ts`:
```
subtotal      = Σ unitPrice × qty            (prices already include VAT)
discount      = capped at subtotal and policy maxDiscountPct
afterDiscount = subtotal − discount
service       = afterDiscount × serviceChargePct/100   (dine-in only)
base          = afterDiscount + service + packaging     (packaging: takeaway/delivery)
vat           = base × vatRate / (100 + vatRate)        (back-calculated)
net           = base − vat
grandTotal    = round(base)  ;  roundOff = grandTotal − base
```
Finalizing recomputes server-side from restaurant settings (never trusts the client), allocates a fiscal-year invoice number, writes immutable `Bill` + `BillItemSnapshot` + `Payment` rows, and requires an **open shift** for the cashier.

## Stock

Deduction happens when the kitchen marks an item **served** (`advanceTicket` → `deductStockForItem`, idempotent via `stockDeducted`). Approved voids/refunds of served items call `reverseStockForItem`. All changes append immutable `StockMovement` rows.

## Data model

28 Prisma models incl. User/Role/Permission/RolePermission, Restaurant/Branch/Floor/Table/InvoiceSequence, Menu*/Modifier*, Order/OrderItem/KitchenTicket, Bill/BillItemSnapshot/Payment/Refund, VoidRequest, StockItem/RecipeItem/StockMovement/Supplier/Purchase/PurchaseItem, Shift, AuditLog, AppSetting. See `prisma/schema.prisma`.

## Known simplifications (MVP)

- **Split bill by item** and **table merge** are not implemented; **split payment** (multiple methods / partial → house account) is.
- BS calendar conversion and Nepali fiscal-year mapping are **approximate** (display only).
- Money stored as `Float`; rounding handled in the billing service.
