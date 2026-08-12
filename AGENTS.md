# Agent Continuity Guide - SATHI Project

This file serves as a high-level briefing for any AI agent resuming work on the SATHI project.

## Current Status (2026-08-12)

The Firebase backend has been fully audited, redesigned, and implemented. The admin panel has been extracted into a completely standalone application at `/admin` with its own build, routing, Firebase initialization, and test suite. The project is in a "Production Ready" state for the admin panel.

### Critical Implementation Details

1.  **Firebase Initialization:** `src/firebase.ts` enforces strict validation of `VITE_FIREBASE_*` environment variables. `admin/src/firebase.ts` does the same for the admin app. Both validate against the expected project ID `hamrosathi1`.
2.  **Security Model:** We use a Role-Based Access Control (RBAC) system. Rules are in `firestore.rules`. Access is governed by custom claims (`admin`, `role: 'companion'`, `role: 'customer'`).
3.  **Performance:** Composite indexes are defined in `firestore.indexes.json`. Do not run complex queries without checking if an index exists.
4.  **Cloud Functions:** The logic for bookings, messaging, and ratings is implemented in `functions/src/index.ts`. 
    - **PAUSED:** Deployment is currently blocked because the Firebase project is **not** on the Blaze plan, and the user is unable to upgrade at this time. Do not attempt to deploy functions until the user confirms the upgrade.
5.  **Admin Application:** The admin panel is a standalone Vite + React app in `/admin` with:
    - Its own `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`
    - 11 RBAC roles defined in `admin/src/services/admin.ts`
    - Rate limiting, idempotency, audit logging, and health monitoring services
    - Virtualized tables for large datasets
    - Error boundaries and comprehensive error handling utilities
    - 38 passing unit tests

### Ongoing Tasks & Priorities

- **Blaze Plan Upgrade:** Deferred. Paused until the user confirms billing is enabled.
- **User Experience Improvements:** Make the client-side features more functional (booking flow, messaging, dashboard, map interactions).
- **Testing:** Expand Vitest coverage. Both root and admin apps have test suites.

### Documentation Reference

- `docs/AI_MEMORY.md`: The primary source of truth for project history and tech stack.
- `docs/firebase/`: Detailed architectural blueprints for the Firebase implementation.
- `FIREBASE_IMPLEMENTATION_REPORT.md`: Summary of the latest backend work.
- `admin/src/__tests__/`: Admin unit tests covering RBAC, rate limiting, idempotency, health, and aggregation.

## Constraint Rules

- **Preserve UI:** Do not modify React components or styling unless fixing a direct integration bug.
- **Firebase Scope:** Focus on `src/services/`, `functions/`, and Firebase config files. Admin app changes can touch `admin/src/`.
- **Nepal Market:** All currency must remain in **NPR**.
- **Blaze Plan:** Do not attempt to deploy Cloud Functions until the user explicitly confirms the Firebase Blaze plan upgrade is complete.
- **Admin Tests:** Run `cd admin && npx vitest run` for admin tests, `npx vitest run` from root for main app tests.
