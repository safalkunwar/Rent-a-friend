# 11 — Mobile Web Architecture

**Last updated:** 2026-08-24

---

## Context

SATHI mobile today is a **responsive mobile-web experience** (PWA) inside the same React app — not a separate codebase. Native apps are FUTURE (see `01_PRODUCT_VISION.md`) and would reuse the same Firebase backend and business logic.

## Layout (mobile: `lg:hidden`)

- Single column; bottom tab bar: **Home, Search, Companions, Messages, Alerts**
- Sliding profile drawer (16 options) + sliding nav drawer
- Home tab composition, in order:
  1. Header with integrated search + filter button + avatar (this is the ONLY search bar on mobile home — do not add another)
  2. Instagram-style stories row (no logo above it, no search bar above it — non-negotiable)
  3. Dynamic category-based mixed feed (progressive reveal)
  4. Community Feed section
  5. Activities horizontal section (real activity cards)
  6. Upcoming Events list
  7. "Become a Companion" CTA banner

## Shared Logic Rule

> Desktop and mobile MUST NOT have separate business logic.

The same modules serve both:
- `useFirestoreData` / `useDiscoveryFeed` hooks
- `generateDiscoveryFeed` (pure feed logic)
- services layer (firestore, social, bookings, payments, messaging)
- AppContext state

Only **presentation** differs: mobile groups feed items by category with horizontal scroll rows; desktop renders the same `feedItems` in the `DiscoveryFeed` component with grids and full-width cards.

## Mobile-Specific Behaviors (presentation-level)

- Scroll position persistence per tab (`scrollPositionsRef` + restore on tab switch)
- Body scroll lock on messages tab
- Progressive category reveal via scroll sentinel (`visibleMobileCategoryCount`, starts at 2)
- Story viewer with touch-friendly nav zones, progress bars, owner-only delete
- Bottom sheets instead of drawers (filters, profile)

## PWA & Offline

- `vite-plugin-pwa` generateSW precache; IndexedDB cache for read data
- Offline: cached reads render; writes fail explicitly (never fake success)
- Push notifications: foreground FCM only; background push requires Cloud Functions (blocked on Blaze)

## Constraints

- No mobile-only features that lack a desktop equivalent in business logic (and vice versa)
- No second search bar above stories; no duplicate navigation surfaces
- Any new mobile section must be backed by real Firebase data or it must not ship
