# SATHI Companion-First Release Audit — 2026-11-26

## Git checkpoint

- Source branch: `staff-rbac-containment-2026-09-13`
- Source HEAD and backup target: `acec355721e30f7c9a3d1e2c60a133fc975b85c7`
- Verified backup branch: `backup-pre-companion-only-release-2026-11-26`
- Development branch: `feat/free-companion-first-release`
- The two pre-existing untracked booking debug scripts remain untouched.

## Existing implementation

### Works

- Email/social authentication and editable account/profile fields.
- Companion discovery with text, interest, city, language, rating, and saved-profile filters.
- Companion cards and profile viewing; saved profiles persist through the existing repository.
- User-selected interests already save to the user's profile. Existing rules permit users to update their own `interests`, `languages`, and `availability` fields.
- Existing reports can be submitted to the `reports` collection and reviewed by authorized staff.
- Companion profiles now expose the existing report form for signed-in users; guests are sent to sign-in before reporting.
- Coins and identity-review functionality has server-side gates; this release does not enable those workflows.
- Admin application routes and existing records remain available.

### Partial or missing

- The prior `recommended` sort did not use compatibility; it preserved source order.
- Profile fields do not include a supported self-described social style/personality or activity-preference model. No sensitive traits are inferred.
- User language and availability editing was not previously part of the companion discovery path.
- No connection-request / accept / decline repository or Firestore contract exists.
- No user-operable block workflow was found in app code or root Firestore rules. Reports exist, but they do not provide a substitute for blocking.
- The profile report action submits into the existing report flow; it does not add blocking or establish an operations response policy.
- Current rules permitted signed-in users to create a conversation with another UID and send messages as a conversation member. Historical threads could therefore be used to start new messages without a fresh consent decision.

## Validation

- Root TypeScript check (`npm run lint`): passed.
- Focused discovery, directory, and messaging tests: 47/47 passed after adding the availability regression test.
- Companion profile release-presentation tests: 5/5 passed, including the signed-out report action.
- Firestore rules emulator suite: 29 passed, including the companion-first history-read/new-message-denial case.
- Production web build: passed. Vite reports the existing large JavaScript chunk advisory (about 1.93 MB minified).
- No Firebase Rules or Functions deployment, production data change, bulk grant, or financial activation occurred.

## Candidate behavior changed

- Companion discovery is now the default application route. Legacy user routes for Events, Explore, Bookings, Partners, Community content, Payments, and the old dashboard redirect into companion discovery or account settings; admin application routes remain intact.
- User-facing navigation focuses on companions, saved profiles, messages, profile/settings, and account notices. Wallet navigation and wallet UI are hidden; Coins and other financial code/data were not removed.
- The companion list includes only profiles whose stored hourly rate is explicitly `0`. Paid or unknown-rate profiles remain in storage and are excluded from this release's directory.
- The onboarding panel lets users optionally edit interests, languages, and availability, and explains that recommendations use chosen information. Fields remain editable later through the same panel.
- Recommendations rank only by overlapping chosen interests, languages, available days, and exact chosen city. Results show plain-language reasons. There is no external AI call, numerical compatibility claim, exact-GPS ranking, age/gender ranking, or identity-data use.
- Existing message history can be read, but the candidate chat UI is read-only. Local Firestore rules reject creation of new conversations and messages and disallow writing a conversation's `lastMessage`. This is a temporary fail-closed release gate, not the final connection-request design.
- Existing age/service eligibility controls, account schema outside the existing user fields, ID-review gates, admin permissions, Storage rules, and financial gates are not changed.

## Required before a companion-first launch

| Owner | Missing decision/evidence | If unresolved |
| --- | --- | --- |
| Product owner | Connection-request states, pending-request presentation, duplicate behavior, decline/retry or cooldown policy, cancellation/withdrawal, and accepted-thread reopening behavior | Requests cannot be built without inventing rules; messaging remains paused |
| Safety/product owner | Block/unblock behavior, what happens to accepted conversations after a block, and whether block is reversible | Users cannot control unwanted contact; messaging stays paused |
| Product/privacy owner | Public profile fields for activity and social-style preferences, and consent to show each field | Keep recommendations limited to currently supported, voluntarily selected fields |
| Operations/safety owner | Report handling ownership, response expectations, escalation, and coverage | Reports remain records only; do not imply active response |
| Infrastructure/security owner | Reviewed connection schema/rules contract, emulator acceptance, exact future Rules release, rollout and rollback authorization | No production Rules or Functions deployment |
| Product owner | Confirm which free profiles (`hourlyRate == 0`) qualify for the release and how empty discovery should be handled | Paid and unknown-rate profiles stay excluded; do not relabel them as free |

## Release status

This candidate improves discovery and safely hides monetized routes, but it is **not launch-ready**. The actual request/accept/decline, block/unblock, and fresh-consent messaging journey is absent. New messaging is intentionally paused in both candidate UI and local Firestore rules until that contract is implemented and tested. No production data migration, bulk grant, Firebase deployment, Rules release, Functions deployment, or financial activation is authorized or performed by this task.
