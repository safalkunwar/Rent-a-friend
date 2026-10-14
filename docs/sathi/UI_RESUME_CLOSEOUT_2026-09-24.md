# UI resume closeout — 2026-09-24

Scope: finish local People/discovery UI validation and the recurring unit-test failure. This is not a commercial launch, production rules rollout or completion of all product phases.

## Test-isolation diagnosis and fix

The former booking section in `src/__tests__/client-services.test.ts` called `vi.resetModules()` before every test, mocked only the Firestore service and dynamically imported `services/bookings` inside each timed test. That import also loaded the real `BookingRepository`, `bookingTransactions` and Firebase SDK dependency graph. The first missing-companion case exceeded five seconds in earlier runs even though its mocked read resolved immediately. A fresh unchanged baseline passed all 38 tests; the first case took 406 ms. Slow cold dependency loading is a likely trigger, not a verified production booking failure.

Moved the five booking assertions into `src/__tests__/booking-service.test.ts`. It statically imports the real service with hoisted mocks for its two dependency boundaries: the Firestore service and booking repository. Each test resets mock behavior without discarding the module graph. No timeout increase, assertion removal, test skip, application-code change or global Firebase SDK mock was used. Seven additional assertions/cases cover exact lock lookup, absent/cancelled/reserved locks, read rejection, accepted/declined command delegation and failed transition acknowledgement.

The service tests intentionally do not test Firestore authorization or transaction atomicity. Existing `tests/booking-compatibility.test.ts` exercises actual transaction functions in emulators; those tests and production rules were not changed or rerun for this test-only closeout.

## Completed UI scope

- Dedicated shared People page, grouped profiles, one search, optional filters and compact Home/Explore introduction.
- Selected interest headings include secondary-interest matches without changing stored profiles.
- Service-tab state survives desktop/mobile remounts; checked in the browser at 390px and 1440px during the preceding UI pass.
- Free Friends / Local Hosts / Guides explicitly disclose that the new service modes are unavailable. Legacy price, interests and approval are not treated as eligibility evidence.
- No fixture profiles, fixture entry HTML or fixture identifiers found in the latest normal production build.

## Remaining outside this closeout

Authoritative service modes, agency/credential verification, hangout workflows and broader security/payment gates remain separate work. Physical-device/installed-PWA and exhaustive dark/accessibility acceptance are not certified. Existing large bundle and optimistic favorite persistence limitations remain. No commit, push, hosting publication, Firebase deployment or live data mutation was performed. Existing unrelated working-tree changes were preserved.
