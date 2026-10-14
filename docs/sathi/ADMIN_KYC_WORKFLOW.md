# Admin KYC / Companion Application Workflow

> **Current qualification note (2026-09-30):** The workflow below describes the August 26 design/implementation, not a currently qualified approval path. The main application review UI and repository now default to paused behind `VITE_COMPANION_REVIEW_ENABLED`; standalone legacy Guide/Companion screens are read-only. Private evidence, age, case assignment and 40 historical noncanonical identities still need review. See [the authority gate](COMPANION_AUTHORITY_CONTAINMENT_GATE_2026-09-26.md) and [Phase 1 proposal](PHASE_01_IDENTITY_EVIDENCE_DECISION_2026-09-30.md).

**Last updated:** 2026-08-26 · Page: `/admin/applications` (guarded by `companions.verify`)

## Flow

1. User opens **Settings → Become a SATHI Companion** → fills public profile + KYC metadata + document photo upload.
2. Submit creates the application as `SUBMITTED` and it appears in the admin queue.
3. Admin filters by status (`SUBMITTED`, `UNDER_REVIEW`, `CHANGES_REQUIRED`, `APPROVED`, `REJECTED`) or searches by application ID / user ID / name.
4. Reviewer opens a row, inspects profile data, categories, rate and masked KYC document info, then chooses:
   - **Approve** — application `APPROVED`, KYC `VERIFIED`, `users/{uid}.companionStatus = APPROVED`, public `companions/{userId}` profile activated, audit entry written.
   - **Request Changes** — status `CHANGES_REQUIRED` + reviewer note; user sees "Changes required" with the note and an **Update Application** action; resubmission returns it to `SUBMITTED`.
   - **Reject** — status `REJECTED` + mandatory reason shown to the user. Records are retained for audit.

## Rules

Only `kyc_reviewer` / admin roles may transition someone else's application or read others' applications. Every review writes an immutable `admin_audit_logs/{id}` entry containing actor, role, target, reason and timestamp.

## User-facing visibility

Settings → account section shows the live status badge
(Not applied / Submitted / Under review / Changes required / Approved / Rejected)
plus reviewer notes where applicable.

## Access

`/admin/applications` is wrapped in `AdminGuard requiredPermission="companions.verify"` — non-admins are redirected. The old dead `localhost:3001` admin link was replaced by this page.
