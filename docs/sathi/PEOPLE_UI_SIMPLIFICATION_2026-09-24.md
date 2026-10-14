# People and discovery simplification — 2026-09-24

Local implementation only. No hosting/Firebase deployment, security-rule changes, sample-data writes or commercial-mode activation.

## Follow-up verification — September 24

Selected service-mode state now lives in ClientApp, so responsive remounts do not reset it. Selecting an interest now groups every filtered result under that interest, including matches through secondary interests; profile data remains unchanged. Browser verified Guides across desktop→390px→1440px and two Conversations matches under the correct heading.

Latest main run: **331/332 passed**, including all 11 directory/category tests. The unchanged first booking-availability test exceeded its existing 5-second timeout in both the full run and focused retry. This supersedes the earlier all-green count below; no timeout was raised or unrelated booking logic modified. TypeScript and final Vite/PWA build pass (main JS 1,965.71 kB / gzip 516.06 kB). Production/device acceptance remains open.

## What was corrected

The real `/companions` page reused the Explore introduction and mixed People/Activities/Events tabs. The planned Free Friend/Local Host/Guide presentation existed only in a separate fixture preview. Large hero panels, duplicate desktop search controls and an unrelated event rail competed with the directory.

- Both desktop and mobile now render `PeopleDirectory`, backed by the existing shared filtered companion window and pagination callbacks. People no longer embeds Explore's mixed-content tabs or introduction.
- One search, an interest selector, saved-only control, optional filter drawer and reset. Profiles remain grouped by primary listed interest, without duplicating them or manufacturing extra category members.
- People desktop has no unrelated event/sidebar widgets. Desktop/drawer navigation consistently says People. The development fixture link is removed from normal navigation; its isolated entry remains available directly.
- Compact profile cards have readable names/location/rates, a labelled 44px save control and a real keyboard-operable View profile button. Legacy `isVerified` is not used for a trust badge on these cards; zero-review ratings are omitted. Removed premature save-success toast; existing optimistic favorite persistence still needs separate hardening.
- Home retains the profile-interest editor and real feed but removes the large marketing hero/repeated logo and reduces four shortcuts to compact links. Explore gets a short title instead of a second promotional hero. Existing navy/gold/light theme tokens and dark-mode variables remain.

## Important product boundary

All people continues to show existing listings. Free Friends, Local Hosts and Guides are explicitly **Coming soon** and explain the intended service, without displaying legacy records as eligible examples. There is no authoritative service-mode projection in the current client contract. Neither an NPR 0 rate, a guide-like interest nor legacy approval proves capability/credentials/agency affiliation. No inferred classification, free-message access, hangout request or paid checkout was introduced.

These tabs are explanatory navigation, not implemented service filters. The correct next functional work is the separately scoped authoritative projection/eligibility and request flow from docs 21/22/30/31, not removing the Coming soon labels. Phase 1/2/4/10 completion is not claimed.

## Verification

- Main suite: **330/330 tests across 40 files** passed with one worker. Five new directory/card tests cover callback delegation, category rendering, pagination, empty/loading/reset states, unavailable service modes, accessible actions and absence of inferred trust.
- TypeScript and final Vite/PWA build passed (main JS 1,965.49 kB / gzip 515.91 kB). Existing bundle warning remains.
- Initial parallel run: existing booking availability test timed out; fixture isolation test still expected the deliberately removed preview link. Updated that assertion to require its absence; unchanged booking test and complete suite passed on the serial rerun. No timeout was raised or booking implementation altered.
- Local browser: People at 1440×900 and 390×844; no duplicate search or event rail, grouped real loaded profiles, Free Friends disclosure/back navigation, Coffee interest (2 of 15 loaded profiles), nonexistent search (0 matches), Reset, and navigation back to compact Home. No test writes to Firebase.
- Existing large JS bundle warning remains. Real-device/PWA, exhaustive dark/zoom/accessibility, production persistence and full service-mode eligibility acceptance are not certified.

## Remaining data/UI constraints

Counts cover loaded pages, not total matching database records. Legacy interest names remain unnormalized; sparse categories can still have one profile. Existing legacy profile detail/booking behavior is not redesigned by this change. Fixture-only stage examples remain a separate development prototype, not live people. Mixed Home feed ranking/content association and existing sample data were not rewritten in this UI scope.
