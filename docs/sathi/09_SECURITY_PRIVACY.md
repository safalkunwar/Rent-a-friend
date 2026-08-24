# 09 — Security & Privacy

**Last updated:** 2026-08-24

---

## Prime Directive

> **Never trust the client for authorization.** Every rule, every backend path, every admin action assumes the client is hostile.

## User Isolation

- Users read/write **only their own** private data (profile fields via diff-whitelist, favorites, own bookings, own conversations, own notifications)
- Cross-user leakage classes to test: booking details, conversation contents, notification contents, payment records
- Firestore rules enforce participant checks on conversations/messages via `participantIds` and conversation-id split

## Firestore Security Rules (deployed config: `firestore.rules`)

- Role helpers: `isAdmin()` (custom claims, 11 adminRole values, users doc, admins collection), `isCompanion()`, `isCustomer()`, granular role checkers (safety/moderation/booking/KYC/content admin)
- Field-diff whitelists prevent privilege escalation (e.g., user update cannot touch `role`, `createdAt`)
- Message deletes disabled for clients; payment deletes disabled
- **Rule-change protocol:** every rule change requires a security test update + CHANGELOG entry

## Role-Based Access & Admin Authorization

- Admin panel authenticates through the same Firebase Auth; RBAC gates every admin service call
- Admin UI presence ≠ authorization — the rules layer is the enforcer; admin app failures are expected and surfaced, not bypassed
- Super-admin-only: role assignment, payout configuration

## Financial & Payment Information

- Payment provider credentials/secret keys: server-side only (Cloud Functions config) — never in client env vars or bundles
- `payments` collection: owner-or-admin read; client may create initiation records; **only the server path transitions status to paid/verified**
- No card data touches SATHI systems (gateway-hosted flows for Khalti/eSewa)
- Wallet/ledger values must come from Firestore; the current hardcoded wallet modal numbers are fake data and must be removed/replaced (tracked in CHANGELOG)

## Personal Information (PII)

- KYC documents (`guideApplications`, Storage): readable only by owner + kyc_reviewer/super_admin
- Phone/email: own-profile only; never in public companion docs
- Location coordinates: coarse location public on listings; precise coordinates only with explicit share (SOS)

## File Uploads

- Storage rules: size limits, content-type allowlist (images), per-user path prefixes (`users/{uid}/...`)
- `SafeImage` + fallbacks on render; never trust client-declared image dimensions

## Malicious Input, Spam & Abuse

- All user text (bio, captions, comments, messages, post content) rendered as text — no `dangerouslySetInnerHTML` anywhere
- Length limits + client throttling on comment/story creation
- `reports` flow for users; `suspiciousActivity` logging for anomaly signals
- Moderation queue in admin app; content_admin can unpublish

## Fraud Vectors (must be designed against)

| Vector | Defense |
|---|---|
| Referral fraud (self-referral rings) | Server-side attribution: device/phone/Payment-instrument dedup, reward grant only via backend |
| Fake accounts | Auth verification, KYC for companions, admin ban/suspend tools |
| Unauthorized booking | Transaction + rules (see `08_CONCURRENCY_BOOKING.md`) |
| Unauthorized reviews | Review create requires `bookingId` owned by the reviewer with a completed booking (rule intent; verify + test) |
| Unauthorized likes/comments spam | Deterministic like IDs + rate limits + moderation |
| Reward/diamond manipulation | Rewards are server-granted only; no client-writable balance fields, ever |
| Rating manipulation | Companion `rating`/`reviewsCount` writable only by backend aggregation |

## Privacy Operations

- Account deletion path must remove/anonymize user PII while preserving financial audit records
- Audit logs are immutable (admin-write-only) and never expose PII beyond actor/target ids
