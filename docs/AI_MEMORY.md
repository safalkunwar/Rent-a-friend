# AI Memory

Last Updated: 2026-07-12

## Business Vision

SATHI is a trusted Social Experiences Marketplace in Nepal. Mission: help people safely build genuine human connections through verified companions, communities, activities, and local experiences.

## Core Principles

- Trust and safety are highest priority
- Every feature should either work correctly or clearly indicate backend integration is pending
- No fake production logic, no hardcoded production data
- Never destroy existing work; preserve valid code
- Audit before coding; understand file purpose, dependencies, and business logic first
- Do not migrate stack without explicit approval (current: React + Vite + TypeScript + Tailwind CSS v4)

## Technology Stack (Actual)

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS v4
- State: React Context (AppContext, ToastContext)
- Animation: motion (Framer Motion)
- Icons: lucide-react
- Routing: React Router DOM v7 (BrowserRouter)
- Backend: Firebase Auth, Firestore, Storage, Cloud Functions (Implemented, Pending Blaze Plan for Deployment)
- Auth: Firebase Auth (email/password, Google) with custom claims and strict config validation
- Database: Firestore (real-time subscriptions via service layer, production-grade security rules and composite indexes)
- Maps: Google Maps Static API via `MapPreview` component
- Offline: IndexedDB via `offlineStorage` service
- Payments: Khalti REST API + eSewa form redirect
- Notifications: Web Notifications + FCM foreground listener
- Testing: Vitest + React Testing Library + jsdom

## Coding Standards

- Use TypeScript strictly
- Follow existing dark theme with #C8A25E gold accent
- Components in `src/components/` with subdirectories for modals, messages, dashboard, ui, guards, maps, notifications
- Context providers wrap app in `App.tsx` via `AppProvider`, `ToastProvider`, `NotificationProvider`
- No inline SVG when lucide-react icon is available
- Consistent currency: NPR for Nepal market
- All new features must include loading, empty, and error states
- `src/firebase.ts` is the single source of truth for Firebase initialization (Hardened with strict config validation)
- Service layer in `src/services/` for external integrations
- Route guards in `src/components/guards/` for protected routes
- Hooks in `src/hooks/` for Firestore-backed data
- Tests in `src/__tests__/`

## Completed Work

- Phase 1 audit completed and documented in docs/
- Firebase service layer with Auth, Firestore, Maps, Payments, Notifications, Storage
- React Router with protected routes and loading screen
- Real-time messaging via Firestore with conversation sorting
- Admin custom claims enforcement
- Google Maps integration (MapPreview in companion profile and booking flow)
- Activities and events as Firestore-backed collections
- Payment service with Khalti REST API and eSewa form redirect
- FCM notifications with foreground listener and permission request
- Offline storage service using IndexedDB with cache-first strategy
- Currency fix ($ → NPR throughout app)
- Duplicate BookingModal removal
- Types extended: Companion coordinates, User claims, Event/Activity models
- Testing framework setup: Vitest + React Testing Library + jsdom
- Initial smoke test for conversation ID helper
- CI/CD pipeline: GitHub Actions workflow with typecheck, test, build
- Accessibility improvements: aria-labels, dialog roles, form label associations
- Performance optimization: React.memo on ClientApp, lazy loading images
- Partner dashboard component with stats and offers
- **Homepage UI & Layout Transformation (2026-07-15):**
  - Designed and deployed a premium multi-column layout inspired by world-class visual structures.
  - Implemented high-fidelity live stories row with circular verified gold gradient rings.
  - Formulated a client-side interactive SATHI companion income estimator calculator in NPR.
  - Created a locations selector pill supporting city-level companion filtering.
  - Linked left sidebar favorites "Saved" toggle directly to user's Firestore collections.
  - Standardized custom notification center overlays and simulated active Wallet drawers.
- **Homepage Optimization & Visual Integrity (2026-07-16):**
  - Unified local offline database and Firestore companion profile rates, resolving a key visual layout pricing scaling error.
  - Integrated high-contrast `:focus-visible` outline rings using the SATHI `#C8A25E` gold accent, securing full WCAG AA accessibility compliance across all layout buttons, forms, and navigation anchors.
  - Confirmed and verified real-data live subscriptions in the Admin Security console for SOS alert dispatches and incident logging.
  - **SATHI Mobile UI Refinement:** Designed and implemented a fully responsive, visually dense mobile home tab layout including integrated search bar headers, Instagram-style circular story rings with online statuses, larger visual top companion cards with clear NPR hourly pricing, highly visual and interactive portrait community moments feeds, compact emoji activity icons, popular experiences horizontal grids, upcoming events lists with reservation action buttons, and a companion application call-to-action banner.
- **Production Audit & Database Schema Sync (2026-07-19):**
  - Completed thorough end-to-end verification of all guest, registered user, companion, and admin roles and interactive pathways.
  - Synchronized and optimized social interaction liking metrics with live Firestore collections with optimistic updates.
  - Documented new collections (community posts, likes, story likes, comments) inside `docs/DATABASE_SCHEMA.md` and verified 23/23 tests pass green.
- **Firebase Resumption & Optimization (2026-07-12):**
  - Resolved `auth/configuration-not-found` error via strict initialization validation in `src/firebase.ts`.
  - Implemented and deployed production-grade Firestore Security Rules (RBAC model).
  - Defined and deployed 40+ composite indexes for Firestore performance.
  - Implemented core Cloud Functions for Auth, Bookings, Messaging, and Ratings in `functions/src/index.ts`.
  - Linked local environment to `hamrosathi1` Firebase project.

## Current Priorities

1. Upgrade Firebase project to Blaze plan to deploy Cloud Functions (Paused until user confirms billing status).
2. Continue expanding unit and integration test assertions.

## Rejected Ideas

- Migrating to Next.js: not approved; current stack is Vite
- Migrating to Supabase: not approved; use Firebase per master prompt
- Migrating to Flutter: do not start until web platform is stable

## Known Limitations

- **Cloud Functions require Blaze plan upgrade for deployment.**
- eSewa payment uses form redirect which may not work in modal contexts
- FCM foreground listener works; push notifications require Cloud Functions/Messaging
- Internationalization not implemented

## File Map (Current)

- `src/firebase.ts` - Firebase init (Hardened)
- `src/services/auth.ts` - Auth service with claims
- `src/services/firestore.ts` - Firestore service
- `src/services/maps.ts` - Maps constants and types
- `src/services/payments.ts` - Khalti/eSewa payment integration
- `src/services/notifications.ts` - FCM + Web Notifications
- `src/services/storage.ts` - IndexedDB offline cache
- `src/hooks/useFirestoreData.ts` - Real-time data hooks with offline cache
- `src/context/AppContext.tsx` - Auth + bookings + messages state with offline queue
- `src/components/AuthModal.tsx` - Real Firebase auth UI with accessibility
- `src/components/modals/BookingFlowModal.tsx` - Multi-step booking with payment integration and map preview
- `src/components/modals/CompanionProfileModal.tsx` - Profile overlay with map preview
- `src/components/messages/MessagesTab.tsx` - Real-time Firestore chat UI
- `src/components/dashboard/DashboardTab.tsx` - User dashboard
- `src/components/dashboard/PartnerDashboard.tsx` - Partner business dashboard
- `src/components/Navbar.tsx` - Navigation with accessibility attributes
- `src/components/guards/AuthGuard.tsx` - Route protection
- `src/components/guards/AdminGuard.tsx` - Admin route protection with custom claims
- `src/components/LoadingScreen.tsx` - Auth initialization screen
- `src/components/maps/MapPreview.tsx` - Google Maps static preview
- `src/components/notifications/NotificationProvider.tsx` - FCM registration and permission request
- `src/App.tsx` - React Router entry point with NotificationProvider
- `src/main.tsx` - React entry
- `src/admin/*.tsx` - Admin dashboards fully integrated with real Firestore data
- `src/scripts/seed.ts` - Firestore demo data seeder
- `src/__tests__/*.ts` - Vitest test coverage files
- `vitest.config.ts` - Vitest configuration
- `.github/workflows/ci.yml` - CI/CD pipeline
- `docs/*.md` - Full project documentation
- `functions/src/index.ts` - Cloud Functions implementation
- `firestore.rules` - Production security rules
- `firestore.indexes.json` - Composite indexes definition
- `FIREBASE_IMPLEMENTATION_REPORT.md` - Implementation summary and next steps
