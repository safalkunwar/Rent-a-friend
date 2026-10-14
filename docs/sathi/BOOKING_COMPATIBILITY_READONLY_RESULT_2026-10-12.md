# Booking compatibility read-only result — 2026-10-12

## Result

The bounded read-only preflight for Phase 0 booking/lock compatibility completed against Firebase project `hamrosathi1` at `2026-10-12T13:57:44.536Z`.

| Evidence | Result |
| --- | --- |
| Active Firestore source SHA-256 | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` |
| Active ruleset | `projects/hamrosathi1/rulesets/ad82806d-52fe-4c75-a723-a2f3cdfc81e0` |
| Candidate SHA-256 | `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f` |
| Candidate baseline comparison | Exact; only `bookings` and `booking_locks` branches plus `sathiBooking*` helpers differ |
| Bookings | 105 total: 105 legacy/other version, 0 v2 |
| Locks | 1 total; 0 orphan, 0 field mismatch, 0 noncanonical ID |
| Booking identity fields | 0 missing among bounded records |
| Deployment / migration | Not performed |

The inventory was paged under the 1,000-document cap and stores aggregate counts only. It is not an atomic database snapshot. Status counts were completed 41, confirmed 20, pending 22 and cancelled 22. Payment-status fields were missing or outside the known enum for 65; 20 were pending and 20 refunded. These are data-shape counts, not a financial reconciliation or proof of payment truth.

The rollback source and full manifest are preserved at `docs/sathi/rollbacks/booking-compatibility-2026-10-12T13-57-44-526Z/`. The complete stored artifacts contain the active rules source and should remain protected from accidental replacement.

## Status at the 13:57 pre-release capture

The existing candidate previously passed its documented 29 booking transaction emulator cases, 39 payment/staff regressions and 6 static/rollback checks. At this 13:57 read-only refresh, the source and candidate hashes were aligned but the candidate was still local and unreleased. Legacy bookings remained unmigrated.

At this capture, the candidate had not been released. The later separately approved release and dedicated-account acceptance are recorded in [the release result](BOOKING_COMPATIBILITY_RELEASE_RESULT_2026-10-12.md). This file remains the immutable pre-release inventory snapshot; its source hash and status describe 13:57 only.
