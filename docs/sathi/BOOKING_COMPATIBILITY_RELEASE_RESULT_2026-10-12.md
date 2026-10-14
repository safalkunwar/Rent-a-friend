# Booking/lock compatibility release result — 2026-10-12

## Result

The separately approved paired booking/lock Firestore rules candidate was released to `hamrosathi1` on 2026-10-12. Ruleset compilation succeeded, the Firestore release was activated, and an immediate active-source readback matched the exact approved candidate.

| Evidence | Result |
| --- | --- |
| Before source SHA-256 | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` |
| Approved candidate and active source SHA-256 | `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f` |
| Before ruleset | `projects/hamrosathi1/rulesets/ad82806d-52fe-4c75-a723-a2f3cdfc81e0` |
| Active ruleset | `projects/hamrosathi1/rulesets/e8b7524d-3fc8-4aa4-b19f-e89c3bedfac1` |
| Changed rules scope | `bookings`, `booking_locks`, and dedicated `sathiBooking*` helpers; unrelated source bytes preserved |
| Deployment mechanics | Rules API Ruleset create/compile, exact pre-activation source/release recheck, one release PATCH, exact source and ruleset readback |

The pre-release source and release manifest are in `docs/sathi/rollbacks/booking-release-2026-10-12T14-06-17-802Z/`. The release script is `ops/booking-containment/deploy-booking.mjs`; it uses the exact approved candidate hash, refuses source drift, and does not automatically retry or roll back an uncertain activation.

## Acceptance and inventory

The dedicated-account live SDK acceptance passed 5/5 checks on generated Auth accounts and generated fixture paths. It used the actual `reserveBooking()` and `transitionBooking()` client services to create a pending reservation and paired lock, verify cross-user read denial and payment mutation denial, confirm and cancel through paired transitions, and reuse the cancelled lock. The final readback confirmed the active source still matched the candidate.

Cleanup verified deletion of all three generated Auth accounts and all seven generated Firestore paths. An initial cleanup comparison encountered Firebase email-case normalization; the exact generated accounts were re-identified, deleted and verified in the [cleanup recovery record](rollbacks/booking-acceptance-2026-10-12T14-06-46-281Z/cleanup-recovery.json), and the final acceptance run completed with clean teardown. The temporary booking used `paymentStatus: not_started`; no payment provider, charge, migration or customer booking was involved. Sanitized acceptance evidence is in `docs/sathi/rollbacks/booking-acceptance-2026-10-12T14-09-02-888Z/result.json`; the private fixture manifest remains under the ignored `ops/booking-containment/.private/` directory.

A post-release bounded read-only inventory at `2026-10-12T14:10:52Z` read back the active candidate and found 105 bookings (zero v2), one consistent lock, zero orphan/mismatched/noncanonical locks, and no change in the pre-release status/payment-shape counts. The complete bounded snapshot is `docs/sathi/rollbacks/booking-compatibility-2026-10-12T14-10-52-117Z/`. The inventory is paged and bounded under 1,000 documents; it is not an atomic database snapshot.

## Validation and limits

- Booking transaction emulator: 29/29 passed on the exact candidate, on loopback port 8087 with the demo project.
- Static candidate/rollback checks: 6/6 passed.
- Production dedicated-account SDK acceptance: 5/5 passed; fixture cleanup passed.
- Pre-release and post-release bounded inventory: both completed under the cap; post-release source/ruleset readback matched.
- No Cloud Functions, indexes, Hosting, Storage, user claims, production documents or payment provider were changed.

This completes only the scoped booking/lock compatibility containment gate. It does not complete Phase 0 or Phase 5: legacy records remain readable and unchanged, companion approval authority remains a separate unresolved gate, and server-authoritative booking v3, provider verification, refunds, reconciliation, approved commercial terms, device/PWA acceptance, restore, App Check and broader production qualification remain open. Do not deploy root Firebase configuration or legacy Functions wholesale.
