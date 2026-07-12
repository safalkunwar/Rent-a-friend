# Agent Continuity Guide - SATHI Project

This file serves as a high-level briefing for any AI agent resuming work on the SATHI project.

## Current Status (2026-07-12)

The Firebase backend has been fully audited, redesigned, and implemented. The project is now in a "Production Ready" state regarding its database and security architecture. Admin panels have been migrated from mock data to real Firestore collections.

### Critical Implementation Details

1.  **Firebase Initialization:** `src/firebase.ts` now enforces strict validation of `VITE_FIREBASE_*` environment variables. If any are missing, it will log a clear error instead of failing silently with obscure auth errors.
2.  **Security Model:** We use a Role-Based Access Control (RBAC) system. Rules are in `firestore.rules`. Access is governed by custom claims (`admin`, `role: 'companion'`, `role: 'customer'`).
3.  **Performance:** Composite indexes are defined in `firestore.indexes.json`. Do not run complex queries without checking if an index exists.
4.  **Cloud Functions:** The logic for bookings, messaging, and ratings is implemented in `functions/src/index.ts`. 
    - **PAUSED:** Deployment is currently blocked because the Firebase project is **not** on the Blaze plan, and the user is unable to upgrade at this time. Do not attempt to deploy functions until the user confirms the upgrade.

### Ongoing Tasks & Priorities

- **Blaze Plan Upgrade:** Deferred. Paused until the user confirms billing is enabled.
- **User Experience Improvements:** Make the client-side features more functional (booking flow, messaging, dashboard, map interactions).
- **Testing:** Expand Vitest coverage for service logic.

### Documentation Reference

- `docs/AI_MEMORY.md`: The primary source of truth for project history and tech stack.
- `docs/firebase/`: Detailed architectural blueprints for the Firebase implementation.
- `FIREBASE_IMPLEMENTATION_REPORT.md`: Summary of the latest backend work.

## Constraint Rules

- **Preserve UI:** Do not modify React components or styling unless fixing a direct integration bug.
- **Firebase Scope:** Focus on `src/services/`, `functions/`, and Firebase config files.
- **Nepal Market:** All currency must remain in **NPR**.
- **Blaze Plan:** Do not attempt to deploy Cloud Functions until the user explicitly confirms the Firebase Blaze plan upgrade is complete.
