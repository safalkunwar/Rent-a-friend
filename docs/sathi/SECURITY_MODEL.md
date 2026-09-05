# Security Model

**Last updated:** 2026-08-26 · Enforced by `firestore.rules` (deployed) — frontend hiding is never the control.

## Identity

- Firebase Auth is the only identity source. One UID per person.
- `users/{uid}` is keyed 1:1 by that UID; client-supplied userIds are always compared against `request.auth.uid` in rules.

## Privilege boundaries (verified live)

| Attempt | Enforcement | Verified |
|---|---|---|
| User edits another user's profile/application/comment/like | ownership checks → 403 | ✅ live |
| User sets own `role='admin'` (update or create-upsert) | whitelist + forbidden-keys on users path → 403 | ✅ live |
| User sets own `companionStatus='APPROVED'` | same → 403 | ✅ live |
| User writes `admin_audit_logs` | admin-only create/read, update/delete impossible → 403 | ✅ live |
| User approves own application | application updates restricted to owner-limited keys/status transitions; approval requires `isKYCReviewer()/isAdmin()` → 403 | ✅ live |
| Duplicate like by same user | doc-ID `${uid}_${postId}` + existing-doc create denial | ✅ |
| Negative/garbage engagement counters | counter-update rule requires numeric ≥ 0 | ✅ |

## Admin roles

Existing RBAC (`src/services/admin.ts`) defines
`super_admin > platform_admin > safety_admin > moderation_admin >
booking_admin > finance_admin > kyc_reviewer > content_admin >
analytics_admin > read_only_agent`. Rules helpers (`isAdmin`, `isSuperAdmin`,
`isKYCReviewer`, `isBookingAdmin`, …) accept **custom claims OR the
`admins/{uid}` collection** — never client-sent fields.

KYC review actions additionally require `isKYCReviewer()`/`isAdmin()` and every
action writes an immutable `admin_audit_logs` entry (actor, role, target,
reason, timestamp).

## Known enforcement gaps (documented, not hidden)

1. Engagement counters: values must be numeric ≥ 0 but delta-correctness needs Cloud Functions (Blaze paused). Repository code maintains them transactionally.
2. KYC Storage object rules should be added when document uploads expand (currently images via the standard upload path).
3. Phone-OTP auth UI pending.
