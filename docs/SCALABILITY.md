# SATHI — SCALABILITY, HIGH-CONCURRENCY & LOW-LATENCY ARCHITECTURE AUDIT

## Executive Summary

This document presents the complete architectural audit, scalability hardening, capacity modeling, and stress-testing strategy for **SATHI** aimed at supporting **10,000 concurrent users** under commercial deployment constraints.

---

## 1. System Bottlenecks Identified & Fixed

During the full-codebase audit, several critical bottlenecks were identified in the initial demo implementation and remediated:

| Subsystem | Identified Bottleneck | Risk at 10,000 Concurrent Users | Hardening Action Applied |
| :--- | :--- | :--- | :--- |
| **Firestore Subscriptions** | Unbounded `subscribe()` on `companions`, `stories`, `activities`, `events`, `partners`, and `community_posts` | 10,000 clients fetching full collections (10,000 x N docs) simultaneously causing massive database read explosion and bandwidth exhaustion | Applied strict `limitCount` bounds (`20` - `30` docs) and index ordering across all `useFirestoreData` hooks. |
| **Booking Race Conditions** | Unprotected booking document creation allowing simultaneous duplicate submissions for the same companion slot | Two users booking the same companion for slot X at the exact same millisecond both succeed | Implemented atomic `runTransaction` slot locking using isolated lock documents (`booking_locks/lock_{companionId}_{date}`). |
| **Messaging Queries** | Loading full message history in conversations | Extended chat logs downloading hundreds of messages on initial tap | Enforced `limitCount: 50` on message history subscriptions + active conversation isolation. |
| **Reaction Hot Docs** | Updating central document counters without isolated user reaction documents | Write locks and transaction retries when thousands like the same post simultaneously | Created per-user isolated reaction keys (`likes/${userId}_${postId}`) and atomic transaction increment/decrement mechanics. |
| **Image Egress** | Heavy image loading without lazy attributes | High network payload and CPU layout thrashing during scroll | Added `loading="lazy"` native image loading in `SafeImage` + responsive fallbacks. |
| **Notification Overhead** | Listening to full user notification history | Massive snapshot bandwidth for long-time active users | Applied `orderBy('timestamp', 'desc')` + `limitCount: 20` subscriber filtering. |

---

## 2. 10,000 Concurrent Users Capacity & Workload Model

### Workload Breakdown Assumptions (Peak Commercial Usage)

- **Total Active Concurrent Users**: 10,000
- **User Activity Distribution**:
  - **Feed / Companion Browsers (60%)**: 6,000 users searching companions, viewing stories, and reading posts.
  - **Active Chatters (25%)**: 2,500 users actively messaging companions or customers.
  - **Community Engagers (10%)**: 1,000 users creating posts, commenting, or liking content.
  - **Booking / Checkout Users (5%)**: 500 users completing bookings or managing schedules.

---

### Projected Query & Read Load

| Action | Query Type & Bounds | Freq / User | Total System Reads/sec |
| :--- | :--- | :--- | :--- |
| **Companion List View** | Bounded `companions` query (`limit: 30`) | 1 query / 60s | ~100 reads/sec |
| **Community Feed View** | Bounded `community_posts` query (`limit: 20`) | 1 query / 45s | ~133 reads/sec |
| **Stories Bar View** | Bounded `stories` query (`limit: 20`) | 1 query / 60s | ~100 reads/sec |
| **Active Conversation Chat** | Bounded `messages` subscription (`limit: 50`) | Real-time delta | ~166 reads/sec |
| **Notification Listener** | Bounded `notifications` query (`limit: 20`) | Background stream | ~50 reads/sec |
| **Total Estimated Reads** | | | **~549 reads/sec** |

*Note: Firestore natively scales to over 10,000 reads/sec. SATHI's optimized workload utilizes <6% of standard single-region database read capacity.*

---

### Projected Transaction & Write Load

| Action | Write Pattern & Isolation | Freq / User | Total System Writes/sec |
| :--- | :--- | :--- | :--- |
| **Send Message** | Add doc to `/messages/{id}` + update conversation metadata | 1 msg / 15s (2.5k chatters) | ~166 writes/sec |
| **Like / Reaction** | Write doc `/likes/{userId}_{postId}` + transaction increment | 1 like / 120s (1k engagers) | ~8 writes/sec |
| **Create Comment** | Add doc to `/comments/{id}` + transaction increment | 1 comment / 300s | ~3 writes/sec |
| **Slot Reservation Lock** | Transactional `booking_locks` + `bookings` creation | 500 checkout sessions / 600s | ~1.6 writes/sec |
| **Total Estimated Writes** | | | **~178.6 writes/sec** |

*Note: Firestore enforces a maximum of 1 write/second per individual document. Since writes are distributed across unique conversation paths, individual message documents, and isolated user reaction keys, no single document exceeds 1 write/sec.*

---

## 3. High Availability & Failure Degradation Strategy

1. **Offline & Unstable Network Resilience**:
   - Local caching layer via `offlineStorage` (IndexedDB / localStorage wrapper) renders cached content immediately while background queries reconcile deltas.
   - Network failure alerts handle graceful degradation without freezing the UI.
2. **Transaction Conflict Protection**:
   - In the event of high contention on a specific companion's booking slot, `BookingRepository` catches transaction conflicts and returns a friendly user prompt (`"This slot is currently being booked by another user"`).
3. **Firestore Composite Indexes**:
   - Pre-configured composite indexes (`firestore.indexes.json`) cover multi-field queries across `users`, `companions`, `bookings`, `conversations`, `messages`, `notifications`, `comments`, `community_posts`, and `stories`.

---

## 4. Load Testing & Staging Validation Plan

### Staging Environment Setup
- Deploy test suite against a dedicated Firebase Staging Project (`sathi-staging`).
- Use headless load generator scripts (e.g., k6 / Locust) simulating authentic user journeys:
  - Phase 1: 100 concurrent virtual users (baseline verification).
  - Phase 2: 1,000 concurrent virtual users (moderate load).
  - Phase 3: 5,000 concurrent virtual users (stress load).
  - Phase 4: 10,000 concurrent virtual users (peak capacity model validation).

### Measured Performance Targets
- **P50 Latency**: < 120 ms for feed queries.
- **P95 Latency**: < 350 ms for message delivery and transactional likes.
- **P99 Latency**: < 800 ms under 10,000 active sessions.
- **Error Rate Target**: < 0.01% non-network errors.

---

## 5. Commercial Pre-Launch Checklist

- [x] Apply strict query bounds (`limitCount`) on all collection hooks and listeners.
- [x] Deploy atomic double-booking slot locks using Firestore transactions.
- [x] Configure composite indexes in `firestore.indexes.json`.
- [x] Enable native lazy loading on `SafeImage` components.
- [x] Secure `firestore.rules` for all collections including `booking_locks`.
- [ ] Upgrade Firebase Project to the **Blaze Plan** prior to enabling high-volume Cloud Functions.
- [ ] Execute automated k6 load test suite against staging project before public commercial announcement.
