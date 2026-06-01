# BhojanOps Roadmap — Deferred Epics

This file records work intentionally deferred from the audit-driven enhancement pass. The P0/P1
correctness, integrity, and safety items and most UX/P2 features were implemented; the items below
require third-party services, credentials, or large standalone effort and are tracked here.

## P3 — Strategic epics (deferred)

### IRD CBMS real-time e-billing
Nepal's Inland Revenue Department requires VAT-registered businesses to push invoices to the
Central Billing Monitoring System in real time. Needs: IRD-issued seller credentials, the CBMS
sync API contract, a retry/queue for offline pushes, and guaranteed gapless invoice sequences
(the sequence is now allocated atomically inside `finalizeBill`, which is the prerequisite).
Blocked on: IRD onboarding + credentials.

### ESC/POS thermal printing
Replace browser `window.print()` (currently used for the 80mm receipt and the new KOT) with direct
ESC/POS commands for network/USB thermal printers, plus per-station KOT routing. Needs: a print
bridge (local agent or WebUSB) and printer hardware for testing.

### Payment-gateway verification (Fonepay / eSewa / Khalti)
Payments are currently recorded with a free-text reference and no verification. Real integration
needs merchant credentials, signature/callback verification, and reconciliation against gateway
settlements. Blocked on: merchant accounts.

### Real-time KDS (SSE/WebSocket)
The KDS now polls every 5s with a reconnect banner and aria-live announcements. A push transport
(SSE or WebSocket) would cut latency and load. Needs: a server event channel (Redis pub/sub or
similar) — a new infra dependency.

### Offline-first POS
Queue orders/bills locally and sync when connectivity returns (common need in Nepal). Large effort:
service worker, local store, conflict resolution, and idempotent server sync.

### Accurate Bikram Sambat calendar
`lib/nepal.toBikramSambat` is a naive fixed-offset approximation (documented as display-only). A
correct converter needs a BS calendar lookup table (e.g., a vetted library) for accurate AD↔BS
mapping across years.

## Partially completed (follow-ups)

### UX-3 — Radix Select wrapper
Raw `<select>` elements were given accessible names (`aria-label`/labels) and the focus-visible
ring covers them. A shared shadcn/Radix `Select` component (deps already installed) was not built;
controls remain native `<select>`. Follow-up: introduce `components/ui/select.tsx` and migrate
the order add-item, bill-settle, KDS, users, and filter selects for consistent styling/keyboard UX.

### UX-4 — Toast system
`loading.tsx` skeletons and key empty states were added. A global toast/notification layer was not
added; success feedback currently relies on revalidation and inline messages. Follow-up: add a
toast provider and fire on send-to-kitchen, finalize, void decisions, and shift open/close.

### F-2 — Line-level partial refunds
Partial refunds by amount are implemented (cumulative cap, `PARTIALLY_REFUNDED`, stock reversed
only on full refund). Line-item selection with proportional/partial stock reversal is a follow-up.
