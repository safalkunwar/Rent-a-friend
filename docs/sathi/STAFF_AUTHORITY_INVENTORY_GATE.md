# Staff authority inventory gate — P0-02

## Purpose

Before selecting a compatible replacement for the legacy broad `isAdmin()` helper, collect only bounded aggregate evidence about the three authority sources it currently combines:

- Firebase Auth custom claims (`admin`, `role == 'admin'`, `adminRole`);
- `admins/{uid}` records;
- `users/{uid}` legacy `role` / `adminRole` fields.

The gate is deliberately read-only. It saves the exact active Firestore rules source as a rollback input and writes aggregate counts only; it never emits UIDs, emails, claim payloads, profile data, or document contents.

## Command

```powershell
node ops/staff-containment/read-authority-inventory.mjs --approved-read-only
```

## Stop conditions

- Any source reaches the 1,000-record bound: inventory is partial; do not select a claims-only, document-only, or merged authority policy.
- Claims, `admins`, and legacy user role sources disagree: document an explicit migration/revocation compatibility policy before modifying rules.
- The active rules source hash changes while building a candidate: discard the candidate and restart from a fresh rollback source.

## Explicit exclusions

This gate cannot deploy rules, edit documents, update claims, read KYC/media/message bodies, change Storage/Functions/Hosting, or touch booking/payment records. It is not permission to deploy a staff or finance rule patch.
