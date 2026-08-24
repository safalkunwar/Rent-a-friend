# 04 — System Architecture

**Last updated:** 2026-08-24

---

## Topology

```
┌─────────────────────────┐      ┌─────────────────────────┐
│  User Platform (web/PWA)│      │  Admin Panel (/admin)   │
│  React + Vite + TS      │      │  React + Vite (separate)│
│  Tailwind v4, RRv7      │      │  own build/tests/deploy │
└───────────┬─────────────┘      └───────────┬─────────────┘
            │                                │
            └────────────┬───────────────────┘
                         ▼
            ┌─────────────────────────┐
            │  Firebase  hamrosathi1  │   ← SINGLE source of truth
            │  Auth · Firestore       │
            │  Storage · Messaging    │
            │  (Functions: BLOCKED,   │
            │   needs Blaze plan)     │
            └─────────────────────────┘
```

## Main App Stack

- React 18 + Vite + TypeScript, Tailwind CSS v4, React Router DOM v7
- State: React Context (`AppContext`, `ToastContext`) — no Redux
- Data: Firestore `onSnapshot` real-time listeners wrapped in `src/hooks/useFirestoreData.ts`
- Offline: IndexedDB cache (`offlineStorage`), PWA precache via `vite-plugin-pwa`
- Entry: `src/main.tsx → App.tsx → ClientApp.tsx` (ClientApp is the desktop+mobile shell)

## Admin App Stack

- Separate Vite app in `/admin` with its own `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, Firebase init (`admin/src/firebase.ts`)
- Shares **only** the Firebase backend — zero component/code sharing with the user app
- Services: RBAC (`admin/src/services/admin.ts`, 11 roles), rate limiting, idempotency, audit logging, health monitoring, aggregation, virtualized tables

## Layering Rules (Main App)

```
UI components (ClientApp, DiscoveryFeed, cards, modals)
        │  props/callbacks only
        ▼
Hooks (useDiscoveryFeed, useFirestoreData, AppContext)
        │  orchestration only
        ▼
Services (firestore.ts, feedGenerator.ts, socialRepository,
          eventParticipantsService, payments.ts, booking services)
        │  ALL Firebase access lives here
        ▼
Firebase SDK (src/firebase.ts — validated init)
```

**Rule:** UI components must never call Firebase directly. All reads/writes go through the service layer so desktop/mobile/admin share identical logic.

## Routing (Main App)

- `/` home, `/explore`, `/companions`, `/messages`, `/bookings`, `/dashboard`, `/partner`, `/settings`
- Desktop: left sidebar navigation + header + central feed + right sidebar (xl+)
- Mobile (`lg:hidden`): bottom tab bar (Home, Search, Companions, Messages, Alerts) + profile drawer
- Admin panel is NOT routed from the main app (removed feature; deep-link from profile dropdown opens the admin origin only for `admin` role)

## Data Flow

1. Hooks subscribe via `onSnapshot` with bounded `limitCount`
2. Results cached to IndexedDB; cache renders first on cold start
3. Feed composition happens in `generateDiscoveryFeed` (pure function, no I/O)
4. Writes go through services with optimistic UI **only where safe** (likes, read states) and rollback on failure
5. Writes that must be authoritative (bookings, payments, rewards) require backend transactions — see `08_CONCURRENCY_BOOKING.md`

## Environments

- Single Firebase project (`hamrosathi1`) for all environments today
- Env config via `VITE_FIREBASE_*` vars, validated in `src/firebase.ts` (fails fast on wrong project id)
- No staging Firebase project exists; **do not create one** without explicit approval (rule 2, `15_NON_NEGOTIABLE_RULES.md`)
