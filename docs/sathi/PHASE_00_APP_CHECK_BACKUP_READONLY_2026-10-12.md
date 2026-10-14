# Phase 0 App Check and backup read-only snapshot — 2026-10-12

Production metadata was captured 2026-10-12. Follow-up Firebase app registration and local config retrieval occurred 2026-10-13. This is not a production certification or authorization to change enforcement, backup schedules, database protection, or billing.

## Production metadata

| Check | Observed state |
| --- | --- |
| Project | `hamrosathi1` (project number `932995524964`) |
| Firestore database | `(default)`, Native mode, location `nam5` |
| Point-in-time recovery | `POINT_IN_TIME_RECOVERY_DISABLED` |
| Delete protection | `DELETE_PROTECTION_DISABLED` |
| Managed backup schedules | 0 returned by the database backup-schedules API |
| Managed backups | 0 returned for location `nam5` |
| Project billing | Enabled; this does not establish backup cost or authorize a paid configuration |
| Firestore data and index storage | 6,277,897 bytes (5.987 MiB), Cloud Monitoring gauge sampled at `2026-10-12T14:42:00Z` |
| Firebase App Check service configs | 0 explicitly configured service entries returned by the App Check `projects.services.list` API |

The one-hour Cloud Monitoring query returned a data/index storage series only; no PITR or backup storage series was returned. This is consistent with the disabled/absent controls above. Google's [Firestore metric reference](https://cloud.google.com/monitoring/api/metrics_gcp_d_h) defines `firestore.googleapis.com/storage/data_and_index_storage_bytes` as a per-database gauge. The observed gauge is a point-in-time size including Firestore storage overhead and indexes, not a PITR retained-history measurement or a billing export.

The App Check service-list API returns services explicitly configured through its update methods; the official `EnforcementMode` reference states an unconfigured mode defaults to `OFF`. Treat App Check enforcement as off for the observed project state. This does not prove that tokens are never generated or establish metrics for every registered app. See the [service list API](https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.services) and [enforcement-mode reference](https://firebase.google.com/docs/reference/appcheck/rest/v1/EnforcementMode).

Firebase CLI inventory on 2026-10-12 listed two registered apps, both WEB: `Sathi` (`1:932995524964:web:bae2033ae87165adbb3271`) and `ai-studio-applet-webapp` (`1:932995524964:web:6d0ca922cccf6dfabb3271`). On 2026-10-13, the Android and iOS apps were registered in `hamrosathi1` using the repository's declared native IDs (`com.sathi.app`): Android app ID `1:932995524964:android:57f1c61369de623bbb3271`; iOS app ID `1:932995524964:ios:64d1711973a740d0bb3271`. Firebase CLI SDK configuration was retrieved to `android/app/google-services.json` and `ios/App/App/GoogleService-Info.plist`. These are client configuration files, not server credentials. Registration and config retrieval do not configure an App Check provider or enable enforcement.

## Local integration state

| Surface | Firebase identity / hosting evidence | App Check integration | Readiness gap |
| --- | --- | --- | --- |
| Consumer web | Registered `Sathi` web app ID; code allows only `hamrosathi.vercel.app` | Production-only reCAPTCHA Enterprise initializer with public site key and token-state marker | Service config list is empty; no recorded production token acceptance or monitor metrics |
| Admin web | Separate Vite app; `VITE_FIREBASE_APP_ID` is runtime-supplied. Root `firebase.json` has only the consumer `dist` target; actual deployed host/app ID is unverified | Local initializer added behind production + exact-host + explicit site-key env guards; no initialization when unset. No production token acceptance | Resolve hosting URL and deployed Firebase app ID, configure provider, then complete token/monitor acceptance |
| Android/iOS | Both IDs are `com.sathi.app`; Android app `1:932995524964:android:57f1c61369de623bbb3271` and iOS app `1:932995524964:ios:64d1711973a740d0bb3271` are registered; SDK configs are in the native app directories | No native App Check initialization found | Select and configure Play Integrity and Apple App Attest/DeviceCheck, add supported Capacitor/native initialization, then perform physical-device acceptance |

These code paths do not establish production token acceptance, registered-provider correctness, or readiness to enforce. Resolve admin hosting identity and configure providers for each registered client; then verify token acquisition on each actual client, collect monitor metrics, and only after that consider a separate enforcement review. Native registration is complete, while provider setup and client acceptance remain open.

The new admin guard passed its focused 3/3 unit checks; the admin TypeScript check exited 0 and its production build completed on 2026-10-13. The build retains existing chunk-size and mixed dynamic/static import warnings. This validates the local inactive-by-default code only, not provider setup or production acceptance. Firebase CLI readback and local config parsing confirmed the native project/app IDs and package/bundle IDs. On 2026-10-13, the corrupt Gradle wrapper JAR was replaced with the Gradle 8.14.3 wrapper artifact after its SHA-256 matched Gradle's published checksum; `distributionSha256Sum` was added to the wrapper properties. `:app:processDebugGoogleServices` and `:app:assembleDebug` then passed using a temporary JDK 21. The local debug APK is not device acceptance. iOS build validation, App Check provider setup, native initialization and physical-device acceptance remain open.

## Recovery boundary and next gate

No Firestore-managed backup was available in the enumerated location and no PITR history was enabled in this snapshot. Cloud Storage exports or other external archives were not inventoried, so this is not a claim that no external copy exists. No restore drill was attempted.

Before any recovery control is enabled, the owner must select PITR and/or a recurring backup schedule and retention after reviewing expected cost. Firestore pricing has no free usage for PITR, backups, or restores: PITR is billed by retained storage, backups by database size and retention duration, and restore by restored GiB. A project-specific estimate needs current database size, retention choice, and current `nam5` rates; billing being enabled is not a cost estimate. See [Firestore pricing](https://cloud.google.com/firestore/pricing?hl=en) and the [PITR guide](https://firebase.google.com/docs/firestore/use-pitr). The official [backup schedule reference](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.backupSchedules) allows daily or weekly schedules and defines a maximum retention period of 14 weeks. After an approved configuration exists, rehearse restore into an isolated target and verify data access, integrity, and recovery procedures; do not use an in-place restore as the drill. App Check should first cover consumer web, admin, and native callers, then collect monitoring metrics before any separately reviewed enforcement rollout.

No configuration or user data was changed during this snapshot.
