# 15 — Non-Negotiable Rules

**Last updated:** 2026-08-24
Every development session (human or AI) is bound by this list. Violations must be reverted.

---

## Data & Backend

1. **Never introduce mock data into production flows.** Seed scripts are dev-only tooling against the emulator.
2. **Never create a second Firebase project without explicit approval.** `hamrosathi1` is the only backend.
3. **Never change working architecture without documenting why** (CHANGELOG entry with rationale).
4. **Never trust frontend authorization.** Rules + backend transactions are the enforcers.
5. **Never allow client-side manipulation of rewards, ratings, or financial ledgers.**
6. **Never allow race-condition booking.** Slot ownership is decided by an atomic backend transaction only (see `08_CONCURRENCY_BOOKING.md`).
7. **Never load entire Firestore collections unnecessarily.** Every query is bounded and indexed.
8. **Never fake successful operations.** No simulated delays, no local "confirmed" state without backend resolution.
9. **Never claim production readiness without testing** — including the booking race suite and rules tests.
10. **Never claim SATHI handles 10,000 concurrent users** until the load tests in `14_TESTING_STRATEGY.md` pass. It is a target, not a fact.

## UI & UX

11. **Never reintroduce intentionally removed UI** (see `16_REMOVED_FEATURES.md`). In particular:
    - no search bar above Stories
    - no logo above Stories
    - no duplicate search bars
    - no unnecessary duplicated navigation
    - no fake production feed, ratings, or reviews
12. **Never create separate business logic for mobile and desktop.** Presentation may differ; logic may not.
13. **Never automatically reshuffle already displayed feed content** when new Firebase data arrives. Append-only within a session.
14. **Never silently change existing functionality.** Behavior changes are documented and intentional.

## Process

15. **Never modify unrelated features while fixing another feature.** Scope discipline is mandatory.
16. **Every meaningful change must be documented** in `docs/sathi/CHANGELOG.md`.
17. **Every development session must update CHANGELOG.md** — including documentation-only sessions.
18. **Every feature claim must correspond to a complete backend-to-UI flow.** "The button exists" ≠ "the feature works."
19. **Currency is NPR everywhere.** No `$` in user-facing surfaces.
20. **Preserve UI stability:** do not modify React components or styling unless fixing a direct integration bug (carried from AGENTS.md constraints).

## Escalation

If a task seems to require breaking a rule (e.g., a second Firebase project for load-testing isolation), **stop and ask**. Rules are changed only by explicit user decision recorded in this file and the CHANGELOG.
