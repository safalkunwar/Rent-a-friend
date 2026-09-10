# 00 — Master Objective

**Status:** Foundational product intent; target architecture extended on 2026-09-10.
**Precedence:** The current owner-requested target decisions and implementation contracts are [20_TARGET_ARCHITECTURE.md](20_TARGET_ARCHITECTURE.md) through [32_DESIGN_TOKENS.md](32_DESIGN_TOKENS.md), entered through [ANTIGRAVITY_HANDOFF.md](ANTIGRAVITY_HANDOFF.md). They supersede conflicting historical target statements below and in 01–16 (including overloaded roles, diamond currency and client financial authority). Actual source and deployment evidence determine what exists today; target documents do not certify deployment. Implementation/release still requires the selected phase's approval.
**Historical body date:** 2026-08-24

---

## What SATHI Is

SATHI is intended to become a **real-world commercial platform** connecting travelers and local users with KYC-verified local companions, guides, and experiences in Nepal (expanding outward later).

## What SATHI Is NOT

SATHI is **NOT**:

- a static demo
- a mock application
- a collection of hardcoded screens
- a prototype that only works with scripted data

Any code path that only works with seeded/fake data is, by definition, incomplete.

## What SATHI Must Eventually Operate Using (Real Data)

The platform must run on real, user-generated, backend-persisted:

- users
- authentication
- companions
- bookings
- payments
- messages
- events
- activities
- community posts
- comments
- likes
- stories
- reviews
- referrals
- rewards (diamond system)
- notifications
- admin operations

## Multi-User Correctness Requirement

The system must be designed so that **real users can simultaneously use the platform** without:

- data corruption
- cross-user data leakage
- duplicate actions (double bookings, duplicate payments, duplicate rewards)
- inconsistent states (UI showing availability that no longer exists)

## Foundational Principles (Quoted Verbatim Everywhere)

> **"Correctness comes before visual complexity."**

> **"Real Firebase data is the source of truth."**

> **"Never fake successful operations."**

> **"Never claim a feature works unless the complete backend-to-UI flow works."**

## Current Honest Status

- Main app + standalone admin app build and pass tests (146 main / 38 admin as of 2026-08-24 audit).
- Firebase project `hamrosathi1` is live and is the **single** backend.
- Cloud Functions are **NOT deployed** (Firebase project is not on the Blaze plan). Server-authoritative booking, payment webhooks, and FCM background push are therefore **blocked** until Blaze is enabled.
- Booking concurrency is currently protected by a `booking_locks` collection and client-side checks — this is **not yet fully server-authoritative** and is a known gap (see `08_CONCURRENCY_BOOKING.md`).
- Feed pagination currently scales `limitCount` by page; **cursor-based pagination (`startAfter`) is not yet implemented** (see `12_FEED_LOADING_STRATEGY.md`).

## Non-Negotiable Identity

- Firebase project **`hamrosathi1`** is the single source of truth. No second project, ever, without explicit written approval.
- All currency is **NPR**.
- Desktop and mobile share **identical business logic**; only layout may differ.
