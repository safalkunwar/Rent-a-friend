# Spark capability and backend limits — Phase 2

2026-09-05. No plan upgrade, Functions deployment or new cloud project was performed. Local emulators use the hamrosathi1 namespace on loopback only; they are not a second provisioned Firebase project.

| Solution | Classification | Boundary |
| --- | --- | --- |
| TypeScript/reference fixes, UID preflight/profile bootstrap, truthful UI | SPARK-COMPATIBLE NOW | No new cloud service. |
| Firestore security rules, deterministic interaction IDs, atomic getAfter relationships | SPARK-COMPATIBLE NOW | Subject to rules access-call limits and Spark quotas; emulator cases are not scale/load qualification. |
| Atomic day-level booking + lock state changes | SPARK-COMPATIBLE NOW | Conservative one booking per companion/date; no trusted auto-expiry, anti-abuse service or provider verification. |
| Local Firestore/Storage emulator tests | SPARK-COMPATIBLE NOW | Local test machinery does not prove live service availability. |
| Canonical Storage upload/download runtime | REQUIRES BLAZE/BACKEND LATER | Firebase's current policy requires Blaze for Cloud Storage, including default buckets. Emulator testing is available locally. |
| Khalti/eSewa verification, merchant secret handling, webhooks, refunds/settlement | REQUIRES BLAZE/BACKEND LATER | A trusted backend and provider integration are required; it could be an explicitly approved non-Firebase backend. No browser verification/paid state permitted. |
| Cloud Functions, scheduled lock expiry, push dispatcher and replay-safe aggregates | REQUIRES BLAZE/BACKEND LATER | Existing paused Functions must be reconciled/tested before deployment, not merely switched on. |
| Staffed emergency response/contact delivery | REQUIRES BLAZE/BACKEND LATER plus operations | Billing alone does not create emergency monitoring, live tracking, staffing or contact acknowledgement. |

## Storage is not presently a Spark feature

Firebase now requires the Blaze plan for Cloud Storage access. This corrects any earlier assumption that only Functions were blocked. Existing data/billing status was not queried or changed. See [Firebase's official Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

The earlier `VITE_ENABLE_STORAGE_UPLOADS` opt-in was removed by the intervening Stories work and is not an active runtime gate. The media foundation now attempts authenticated uploads through the shared media contract. This does not establish live billing/service availability. Owner-confirmed billing, tested/deployed rules and indexes, authenticated reviewer CORS, and legacy-media inventory remain rollout prerequisites. See [current media implementation](MEDIA_UPLOAD_FOUNDATION.md).

Canonical objects: avatars/UID/random-id.extension, posts/UID/random-id, stories/UID/random-id.extension, events/UID/random-id.extension; public JPEG/PNG/WebP <=10 MiB. KYC: kyc/UID/random-id, JPEG/PNG/PDF <=5 MiB, reviewer-only reads. Metadata binds ownerUid/category (and contentId for the newer shared media paths); overwrite denied. KYC Firestore fields retain the existing documentFileUrl name for compatibility but now hold a private path, not a bearer URL. Public photo and identity document state are separate. Reviewer preview fetches authenticated bytes, not a public token URL. Signature sniffing is client-side defense-in-depth, not server malware scanning.

Legacy token URLs, private SDK disk caches and already-installed older service workers require a release/migration review; new code removes broad Firebase HTTP caching and uses SDK memory caching. It cannot remotely erase an old offline binary or invalidate already-shared token URLs. No live media deletion/token rotation is performed here.

## Booking operational limits

No automatic timeout is claimed. Abandoned pending reservations need explicit customer/companion/operator cancellation until an approved backend schedules expiry. Day-level exclusivity is deliberately more conservative than time-slot capacity and preserves the existing lock key. Rates are estimates, not a payment ledger. No browser—including an admin browser—may mark a payment verified. Abuse/rate limiting and production multi-device/load verification remain release gates.

## Safe testing

Unit tests mock app Firebase initialization. Rules tests import only test SDKs, require exact loopback emulator environment variables and never fall back to live services. [Firebase documents the emulator rules-testing model](https://firebase.google.com/docs/rules/unit-tests). Firebase CLI is test-only tooling; its Java-17-compatible pinned version currently reports transitive deprecation warnings. Do not bundle it into the user app; review/update the local toolchain separately before CI production use.
