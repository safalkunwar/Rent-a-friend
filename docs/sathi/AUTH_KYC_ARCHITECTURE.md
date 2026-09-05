# Authentication + KYC + Companion Onboarding Architecture

**Last updated:** 2026-08-26 · Status: Phase-1 foundation implemented & live-verified

## Core rule

```
LOGIN ≠ KYC ≠ COMPANION
Firebase Auth UID → users/{uid} (profile) → separate application/KYC state → admin review → companion activation
```

## Authentication

| Method | Mechanism | Status |
|---|---|---|
| Email + password | Firebase Auth (`authService.signup/login`) | ✅ live |
| Google popup | `signInWithPopup` | ✅ live |
| Anonymous guest | `signInAnonymously` | ✅ live |
| Phone OTP | Firebase phone auth | planned (service stub only) |

One canonical Firebase Auth UID per person; profile doc is keyed by that UID. Passwords never touch Firestore.

## Data model

```
users/{uid}                          PUBLIC-ish profile + lifecycle state
  name, email, avatar, role ('customer'|'companion'|'admin'),
  phone?, bio?, location?, favorites[], createdAt/updatedAt

companion_applications/{appId}       APPLICATION + KYC metadata (owner-only read)
  userId, status: DRAFT|SUBMITTED|UNDER_REVIEW|CHANGES_REQUIRED|APPROVED|REJECTED
  applicationData { displayName, bio, categories[], languages[], location,
                    hourlyRate, imageUrl? }
  kyc { legalFullName, documentType, documentNumberMasked (last-4 only),
        documentFileUrl (Storage), verificationStatus }
  rejectionReason?, requestedChanges?, reviewedBy?, reviewedAt?,
  submittedAt?, createdAt, updatedAt

companions/{userId}                  PUBLIC companion profile — created ONLY on approval
admin_audit_logs/{logId}             Immutable admin action trail (admins create/read, nobody updates/deletes)
```

KYC documents live in **Firebase Storage** (`kyc-documents/*`); Firestore stores only references + masked metadata (document number truncated to last 4 digits client-side before write).

## Lifecycle

```
USER (role=customer)
  └─ Become a Companion → application DRAFT → SUBMITTED
        └─ Admin review (status filter / search / reason capture)
              ├─ approve          → status APPROVED, users.companionStatus=APPROVED,
              │                     kyc VERIFIED, companions/{uid} activated, audit logged
              ├─ reject           → REJECTED + reason shown to user
              └─ request_changes  → CHANGES_REQUIRED + reviewer note; owner edits & resubmits
```

`LOGIN ≠ KYC ≠ COMPANION`: booking requires profile completeness (`canBook`), companion features require `role='companion'` which is granted **only** through the admin approval path above.

## Security model (firestore.rules)

- `users` self-updates: strict field whitelist AND explicit denial of any change touching `role`, `companionStatus`, `verificationStatus`, `adminRole`. Create path additionally forbids those keys entirely (blocks upsert-based self-promotion) and restricts initial `role` to customer/guest.
- `companion_applications`: owner create (own uid, status ∈ DRAFT/SUBMITTED, kyc UNVERIFIED at create), owner update only while DRAFT/CHANGES_REQUIRED and only profile/status→SUBMITTED keys; read own or admin; full control for `isKYCReviewer()`/`isAdmin()`.
- `admin_audit_logs`: admins create/read; **update/delete impossible by anyone**.
- Privilege escalation attempts are enforced server-side and were verified LIVE (see scripts/verify-auth-kyc.mjs).

Admin roles map onto the existing RBAC layer in `src/services/admin.ts`
(`super_admin > platform_admin > kyc_reviewer > …`) via custom claims OR the
`admins/{uid}` collection; helpers already exist per tier (`isKYCReviewer`,
`isBookingAdmin`, `isSuperAdmin`, …).

## Verification performed (production hamrosathi1)

`scripts/verify-auth-kyc.mjs` signs in as a REAL non-admin account and asserts:

| Check | Result |
|---|---|
| Create own SUBMITTED application | 200 ✅ |
| Write `admin_audit_logs` as normal user | 403 ✅ |
| Self-promote `users.role='admin'` (upsert path) | 403 ✅ |
| Self-set `users.companionStatus='APPROVED'` | 403 ✅ |
| Cross-user application edit | 403 ✅ |

Two real vulnerabilities found by this matrix during hardening (create-time upsert privilege injection) were fixed and re-verified. Exploit-created test artifacts were purged from production.

## Booking integration

`canBook(user)` (`src/services/bookingEligibility.ts`) is the single eligibility gate used by the booking flow. `BookingFlowModal` prefills name/phone/email from `users/{uid}`, saves previously-missing fields back to the profile on Review (explicitly surfaced to the user), stores `userNameAtBooking/userPhoneAtBooking/userEmailAtBooking` snapshots on every booking, and resets all contact fields whenever the authenticated UID changes.

## Known limitations

1. Phone-OTP sign-in UI not yet wired (Firebase mechanism ready).
2. Aggregate-counter delta enforcement still relies on repository transactions; Cloud Functions (Blaze pending) will move it fully server-side.
3. Social-crawler link unfurling needs server-rendered meta (SPA limitation).
4. Storage-level per-file access rules for `kyc-documents/*` should be added alongside `storage.rules` when file uploads expand beyond images.
