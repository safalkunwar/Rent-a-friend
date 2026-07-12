# Agent Continuity Guide - SATHI Project

This file serves as a high-level briefing for any AI agent resuming work on the SATHI project.

## Current Status (2026-07-12)

The Firebase backend has been fully audited, redesigned, and implemented. The project is now in a "Production Ready" state regarding its database and security architecture.

### Critical Implementation Details

1.  **Firebase Initialization:** `src/firebase.ts` now enforces strict validation of `VITE_FIREBASE_*` environment variables. If any are missing, it will log a clear error instead of failing silently with obscure auth errors.
2.  **Security Model:** We use a Role-Based Access Control (RBAC) system. Rules are in `firestore.rules`. Access is governed by custom claims (`admin`, `role: 'companion'`, `role: 'customer'`).
3.  **Performance:** Composite indexes are defined in `firestore.indexes.json`. Do not run complex queries without checking if an index exists.
4.  **Cloud Functions:** The logic for bookings, messaging, and ratings is implemented in `functions/src/index.ts`. 
    - **IMPORTANT:** Deployment is currently blocked by the need for a **Firebase Blaze Plan** upgrade. Do not attempt to deploy functions until the user confirms the upgrade.

### Ongoing Tasks & Priorities

- **Blaze Plan Upgrade:** The most immediate blocker for backend automation.
- **Admin Data Migration:** Transitioning remaining admin panels from mock data to real Firestore collections.
- **Testing:** Expanding Vitest coverage for the new service logic.

### Documentation Reference

- `docs/AI_MEMORY.md`: The primary source of truth for project history and tech stack.
- `docs/firebase/`: Detailed architectural blueprints for the Firebase implementation.
- `FIREBASE_IMPLEMENTATION_REPORT.md`: Summary of the latest backend work.

## Constraint Rules

- **Preserve UI:** Do not modify React components or styling unless fixing a direct integration bug.
- **Firebase Scope:** Focus on `src/services/`, `functions/`, and Firebase config files.
- **Nepal Market:** All currency must remain in **NPR**.
