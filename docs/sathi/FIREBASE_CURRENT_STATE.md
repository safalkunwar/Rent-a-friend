# SATHI — Firebase current state

Audit snapshot: 2026-09-05, local working tree. **This maps code-referenced collections, not a live database census.** A collection appearing in rules or scripts does not prove that it currently contains production documents. Deployed rules/indexes/billing/Functions state were not independently inspected. The project instruction says Functions deployment is paused until Blaze upgrade confirmation; this audit did not deploy anything.

## Configuration and trust boundary

`firebase.json` points to `firestore.rules`, `firestore.indexes.json`, `storage.rules`, Functions and a `dist` SPA. `.firebaserc` selects `hamrosathi1`. Root `src/firebase.ts` resolves environment -> applet config -> hardcoded fallback, catches initialization errors and can export nullable clients. It can reuse the first initialized app without verifying its project. This contradicts “strict main validation.” Standalone `admin/src/firebase.ts` has stronger configuration/project checks but separate initialization/role handling.

Firebase Web API keys identify a project and are not treated here as server secrets. Payment merchant secrets referenced through `VITE_*` are a different category: if configured they are browser-exposed. No actual merchant secret was read or proven present in deployment.

Client Firestore rules are the security boundary for browser writes. UI guards, TypeScript interfaces, client rate limiting and repository transactions do not stop a modified client from sending another allowed request. Admin SDK scripts and Functions bypass these rules and need their own authorization and operational controls.

## Notation

- R/W identify source readers/writers; **A** means standalone `admin/src/repositories/AdminRepository.ts` and associated pages/generic admin Firestore service. An admin SDK script may write independently of client rules.
- **H** in the query column means discovery head/page query: document-ID ordered `getDocs`, 15 companions/10 other source documents, cursor load-more; no discovery snapshot listener.
- **D** means direct document get/write, ordinarily requiring no composite index. **L** means real-time subscription. **B** means bounded query without a complete user-facing page traversal. **U** means no normal active consumer established.
- `isAdmin` below is the actual overbroad helper, not a secure role boundary. Collection rules are located by `match /<collection>/{...}` in `firestore.rules`.
- Composite requirements below describe actual ordered queries. Local manifest presence does not prove deployed readiness; run the exact queries in an isolated project to validate uncertain combinations.

## Collection ownership, access and scaling map

| Collection / purpose / intended ownership | Actual readers and writers | Current rule contract | Query, listener, pagination and risk |
| --- | --- | --- | --- |
| `users/{uid}` — private account; UID-owned | R/W AuthModal, AppContext, UserRepository; W application review, A, paused onUserCreate/onUserDelete/role callable; chat tries peer reads | Self/admin read; self create restricted role but incomplete schema; update allowlist; admin broad write | D bootstrap; A ordered name pages; peer reads denied; cached profile/account race; public and private identity not separated. |
| `users/{uid}/favorites/{id}` — saved companions; parent owner | UserRepository/legacy favorite path; active context also writes `users.favorites` array | Owner/admin read; **any auth write** overrides owner rules | D/list legacy; active full-array overwrite loses concurrent edits. Cross-user nested writes possible. |
| `companions/{id}` — public discovery; intended approved user | R Home, CompanionRepository, profile/dashboard, A; W legacy becomeCompanion, application approval, A, embedded review service, seed | Public read; **any auth may create own userId with arbitrary other fields**; owner update allowlist; admin CUD | H15; ID versus UID inconsistency; approval categories versus interests; public field schema not enforced; forged verification/rating possible at create. |
| `activities/{id}` — public activity; companion owner | R Home/extra sections/A; W A, seed; owner service/rule capability | Public read; isCompanion owner create/update/delete; admin CUD | H10; companion status can be obtained via document existence; unguarded update fields/ownership; no full activity reservation contract. |
| `events/{id}` — public event catalog; platform-owned | R Home/eventParticipants/A; W A/seed | Public read; admin CUD | H10; direct event get during join; visible catalog is not verified capacity reservation. |
| `events/{eventId}/participants/{uid}` — legacy registrations | Rules/legacy structure, not the active eventParticipants collection | Self/admin read/update/delete; self create | U/D; parallel schema invites orphan/invisible registrations. |
| `event_participants/{eventId_uid}` — active registration; user-owned | R/W `services/eventParticipants.ts`; dashboard joined-event reads | All auth read; self create/update/delete, admin CUD; no field immutability/capacity enforcement | eventId+joinedAt B100; userId+status+joinedAt B50; join attempts unsupported transaction Query get; full-event count scan; no enforced deterministic ID/capacity. |
| `bookings/{id}` — commercial booking; customer + companion | R/W BookingRepository, AppContext, bookings service, dashboard/A; W paused booking triggers/seed | Read booker or companionId==UID/admin; customer self create; participant update status/updatedAt but no transition values; admin CUD | Context two L queries limit30, no order; userId+createdAt B30 available; companionId+createdAt missing locally. Incremental merge retains disappeared records. Price/status/eligibility not authoritative. |
| `booking_locks/{companion_date}` — reservation lock; intended booking-owned | R/W BookingRepository; W booking service; context status path bypasses it | All auth read/create; **only admin update/delete** | D transaction; date granularity, no expiry/ownership/link enforcement; abandoned/forged locks and impossible non-admin release. |
| `payments/{id}` — payment record; intended trusted processor-owned | R A; W `services/payments.ts` client recordPayment, A | Own/admin read; self create accepts client payload; admin CUD | A status/createdAt bounded; no verified provider webhook/ledger, amount/status spoofable at creation. |
| `reviews/{id}` — intended booking review; customer-owned | R rule/public/admin-generic capability; W seed or future caller; paused onReviewCreate reads | Public read; customer self create without completion/uniqueness validation; own rating/comment edit; admin CUD | Companion-related indexes exist; active review service instead writes companion arrays. No tested canonical path or pagination. |
| `community_posts/{id}` — public community content; author-owned | R H/CommunityFeed/PostPage/A; W SocialRepository, CommunityFeed, A/seed | **All statuses publicly readable**; self create weak schema; author update allowlist; author delete absent; any auth limited-key numeric nonnegative counter updates; admin CUD | H10 published; PostPage D; other createdAt indexes present. Cache retains stale/moderated content; mutable counters not tied to interactions. |
| `comments/{id}` — post comments; author-owned | R `usePostComments`, SocialRepository, A; W SocialRepository/A/seed | Public read; self create; owner update/delete without immutable target/author contract; admin CUD | L postId+createdAt ascending, index present; unbounded history. Timestamp IDs can collide; orphan targets/story misuse; count consistency not secured. |
| `likes/{uid_postId}` — post interaction; liker-owned | R/W SocialRepository and feed/community/card consumers; R/W A/seed/purge scripts | Public read; self create/delete but no enforced ID relationship/target; admin create/delete | D check + target/like transaction; admin user/date queries bounded; duplicate arbitrary IDs and independent counter writes remain allowed. Public graph/privacy decision required. |
| `stories/{id}` — story media/text; author-owned | R H/Stories viewer/A; W create modal/SocialRepository/A/seed | Public read; self create; owner limited edit, no owner delete; any auth counter update weakly validated; admin CUD | H10; no expiry filter/TTL; multiple UI counters; upload mismatch and wrong share/comment destination. |
| `story_likes/{uid_storyId}` — story interaction; liker-owned | R/W SocialRepository/viewer/feed/A/seed/purge | Public read; self create/delete, no deterministic-ID enforcement; admin create/delete | D tx/check; duplicate/counter integrity risks mirror likes. |
| `conversations/{id}` — participant envelope; jointly owned | R/W MessagesTab/messaging service/AppContext booking; R/W A | Participant/admin read, but **any authenticated write** permits overwrite/delete and participant takeover | L participantIds array-contains, no bounded history established; parent takeover enables message access. Virtual IDs require actual parent creation before update. |
| `conversations/{id}/typing/{uid}` — typing marker | `services/messaging.ts` helper; not wired to active MessagesTab | Self marker writes; read based on conversation-ID participants, not a unified membership contract | Helper subscribes through an invalid document-shaped collection path; active typing not established. |
| `messages/{id}` — actual chat messages; sender-owned with participant reads | R L MessagesTab/messaging/A; W messaging service/A | Participant/admin reads; sender+membership create; participant receipt/status edits; admin broad writes | L conversationId+timestamp ascending (present); unbounded history. Receipt query conversationId/isRead/senderId inequality needs index validation; parent rule compromises membership. |
| `conversations/{id}/messages/{id}` — obsolete trigger target | Paused `onMessageCreate` watches this; browser writes top-level `messages` instead | No corresponding client subcollection match found | U for active app; trigger will not respond to actual message path. |
| `notifications/{id}` — recipient inbox | R L AppContext; W own notification service/context, paused Functions, A | Owner read/update; own create; admin CUD **without general admin read** | L userId+timestamp descending, index present; bounded UI history; admin list denied; unrestricted owner update fields; Functions timestamp/recipient mismatch. |
| `companion_applications/{id}` — private KYC/application; user-owned/reviewer-managed | R/W new CompanionApplicationRepository + modal/card + embedded AdminApplicationsPage | Owner/admin read; own DRAFT/SUBMITTED create; restricted lifecycle owner updates but nested KYC replacement weak; reviewer/admin update | userId+updatedAt, status+submittedAt composites present; bounded/query workflow; no uniqueness/atomic activation; not the standalone guide list. |
| `guideApplications/{id}` — legacy companion application | AuthModal guide writer; A AdminGuides reader/reviewer | Own userId create/read; admin update | A createdAt bounded; AuthModal omits required userId, so create denied; duplicate onboarding model. |
| `verification_requests/{id}` — older verification structure | Rules/legacy administrative service surface; no current main flow established | Companion self create/read; admin read/update | U/legacy indexes; overlaps new applications and document stores. |
| `admins/{uid}` — admin assignment; privileged authority | Standalone admin role resolution/self lookup; W admin services/scripts | Self read; **isAdmin write**, where mere existing admin doc grants isAdmin | D; admin collection listing denied; low-privilege admin can gain broad writer authority through helper. |
| `admin_audit_logs/{id}` — new KYC audit | Application review W; reviewer/admin access | Admin read/create; immutable | Ordered audit query as needed; client-origin audit not atomic with approval; parallel audit collection. |
| `auditLogs/{id}` — general admin audit | R A AdminAuditLogs; W services/audit and AdminRepository | Admin read; authenticated create only actorId==UID; no update/delete | Ordered timestamp/user filters per services; AdminRepository literal actorId `admin` fails after preceding mutation for ordinary UID. |
| `reports/{id}` — abuse reports; reporter-owned | W reports service/modal; R/W A AdminReports/Moderation | Self create; admin read/update, no delete | Admin status/date queries bounded; user “my reports” reads not allowed; no immutable attribution schema. |
| `support_tickets/{id}` — support request; requester-owned | R/W support service/modal/A AdminSupport | Self create; owner/admin read/update unrestricted fields | Own userId+createdAt query needs exact index validation; owner can alter operational fields; response delivery not established. |
| `feedback/{id}` — feedback; submitter-owned | W feedback service/modal; R A; service has own-feedback read helper | Own create; admin read/update only | A createdAt pages inherit broken admin cursor; user read helper denied. |
| `sosAlerts/{id}` — emergency request; user-owned | W/R `services/sos.ts`, SafetyWidget, A security page | Owner/admin read/update; self create; no delete | Admin status+timestamp exists; own userId+timestamp needs index; one-shot location, no dispatcher/contact delivery/live tracking. |
| `suspiciousActivity/{id}` — operational risk records | R/W A AdminSecurity; no automatic detector found | Admin read/create/update, no delete | Status/time bounded queries; no evidence of real detection pipeline. |
| `analytics/{id}` — intended aggregate metrics | Admin analytics surface/rules; alternate client calculations used | Admin read; client write denied | U producer; hardcoded/sample metrics elsewhere are not this collection's authoritative rollup. |
| `partners/{id}` — business catalog | R H/A; W A/seed | Public read; admin CUD | H10 although not composed; partner dashboard numbers are hardcoded, not metrics from this collection. |
| `hotels/{id}` — venue catalog | R/W A AdminHotels/Venues; seed/generic reads | Public read; admin CUD | B admin listings; no demonstrated full end-user booking integration. |
| `restaurants/{id}` — venue catalog | R/W A AdminRestaurants/Venues; seed/generic reads | Public read; admin CUD | B; same catalog-versus-commercial distinction. |
| `cafes/{id}` — venue catalog | R/W A AdminCafes/Venues; seed/generic reads | Public read; admin CUD | B; same distinction. |
| `cities/{id}` — geographic catalog | R/W A AdminCities; seed/generic reads | Public read; admin CUD | B; not proof of geospatial discovery. |
| `booking_locations/{bookingId}` — intended live session | `services/locationTracking.ts`; no normal UI consumer found | Owner/admin read; create/update references **resource.data** for companion identity | D/L utility; non-admin create cannot use nonexistent resource ownership; no active live-tracking pipeline. |
| `booking_locations/{id}/locations/{id}` — intended position history | locationTracking utility only | Participant/admin read; companion creates; admin update/delete | Potential unbounded location history; no retention/active verified sender. |
| `presence/{uid}` — intended availability | `services/presence.ts`; not used by active chat | Self read/write only | D/L utility; cannot read other people's presence; UI green online indicators are not this data. |
| `booking_reminders/{id}` — intended reminders | `services/reminders.ts`; no active scheduler established | Booker/companion/admin read; admin writes only | userId+sent+reminderTime query missing locally; client scheduler cannot create under current rules; no delivered reminders demonstrated. |

Any additional collection reachable through a generic string-based admin/script utility must be inventoried before migration; this table maps discovered named contracts, not every possible arbitrary collection name a privileged script could choose.

## Rule findings with source anchors

1. **`firestore.rules:17 isAdmin`:** accepts all listed admin roles, user role admin and admin-document existence. Most collection mutations use this broad helper rather than the granular role helpers. A `read_only_admin` is not read-only at the data boundary. Admin assignment must itself require a stronger root authority.
2. **`:129 favorites allow write` and `:239 conversations allow write`:** Firestore matching allow clauses are additive. The permissive clause does not become narrower because a preceding clause checks ownership. Conversation parent takeover also undermines top-level message membership checks.
3. **`:134 companions`:** public read comment says no private fields, but create rule does not enforce that schema or require approved KYC. Users can create verified/rating-shaped data and a document at their UID, which `isCompanion` accepts.
4. **`:166 bookings` / `:189 booking_locks`:** booking read assumes companionId is UID while an update branch resolves companion document userId; state transitions and lock linkage are not constrained. Legitimate release denied, arbitrary authenticated lock creation allowed.
5. **`:298 posts`, `:321 comments`, `:379 likes`, `:395 stories`:** status privacy, target validity, immutable ownership, author deletion, counter deltas, deterministic interaction IDs and story counter validation are incomplete.
6. **`:281 notifications`, `:493 admins`, `:530 feedback`:** current client/admin read paths do not all match allowed reads. Do not “fix” them with blanket authenticated read; query and role-specific policy must be designed together.

These are source-proven policy problems. The exact production exposure depends on deployed policy matching this file, which remains unverified. Emulator tests should prove both intended access and denial for each role, including anonymous Firebase users.

## Storage: paths and mismatches

| Rule path | Current policy | Actual caller/contract problem |
| --- | --- | --- |
| `public/**` | Public read; any auth image write <10 MB | No owner binding; another user can overwrite an object if its path is known. |
| `avatars/{uid}/{file}` | Public read; owner writes | No rule MIME/size bound; caller must actually include UID path segment. |
| `posts/{postId}/{file}` | Public read; any auth write | Upload helper with folder `posts` emits `posts/{filename}`, which does not match; matching three-segment paths lack ownership/size limits. |
| `stories/{storyId}/{file}` | Public read; any auth write | Same two-versus-three segment mismatch and overwrite risk. |
| `activities/{id}/{file}`, `events/{id}/{file}` | Public read; admin write | Admin helper validity and broad role policy need correction. |
| `kyc/{uid}/{file}` | Reviewer read; self upload <5 MB with `image/(jpeg|jpg|png|pdf)` | New caller uses `kyc-documents`, allows different size; actual PDF MIME is not image/pdf. Owner upload helper then calls getDownloadURL, which conflicts with reviewer-only read even after renaming path. |
| `private/{uid}/{file}` | Owner read/write/delete | No size/MIME/retention restriction; not currently a complete KYC contract. |
| `admin/**`, `verification/{id}/{file}` | Admin write/reviewer read variants | Same helper/role issues; not proof of safe KYC delivery. |

`services/storage.ts:uploadImageToStorage` builds `${folder}/${timestamp_random_filename}`; the path contract is not entity/owner aware. `getDownloadURL` creates a reusable token URL model: private KYC should use a deliberately designed authenticated access/reference scheme, not casually store shareable URLs as if rules always reauthorize every URL fetch. No private document URL was accessed in this audit.

The Storage helpers contain Firestore-style `get/exists(/databases/$(database)/documents/...)` with no Storage-scope `database` binding or `firestore.get/exists` namespace. This is a **source compilation/authorization risk not compiler-verified here**. Validate with the Storage emulator/compiler before proposing any deployment. Treat local Storage policy and actual deployed policy as separate unknowns.

## Index reconciliation

The local manifest contains many composite definitions, but quantity is not correctness. Important actual query matches:

| Query | Local finding |
| --- | --- |
| comments: postId ==, createdAt ascending | Present. Does not bound thread reads. |
| messages: conversationId ==, timestamp ascending | Present. Does not supply history pagination. |
| notifications: userId ==, timestamp descending | Present. Functions documents may omit timestamp. |
| bookings: userId ==, createdAt descending | Present. |
| bookings: companionId ==, createdAt descending | Missing exact composite used by companion-facing services. |
| companion_applications: userId ==, updatedAt descending; status ==, submittedAt descending | Present. |
| event_participants: userId ==, status ==, joinedAt descending | Missing exact composite. |
| event_participants: eventId ==, joinedAt descending | Validate exact query; existing status-bearing index is not proof it serves this query. |
| messages: conversationId/isRead equality + senderId inequality receipt query | Validate inequality index/order; current definitions do not establish support. |
| support_tickets: userId ==, createdAt descending | Validate exact query; manifest status-bearing variants are not sufficient evidence. |
| sosAlerts: userId ==, timestamp descending | Missing exact composite. |
| booking_reminders: userId ==, sent ==, reminderTime order | Missing exact composite; service also lacks permitted writer/scheduler. |
| Home source document-ID paging, direct ID lookups | Do not add arbitrary createdAt composites to fix a different query. Published filter/query should be checked exactly as emitted. |

Missing index errors are sometimes hidden by generic read wrappers, making “empty” UI or healthy admin diagnostics misleading. Generate an index checklist from active query builders and run it against isolated seeded fixtures; then deploy only validated additions after approval. Prune obsolete indexes only after measuring actual use and preserving rollback.

## Functions and consistency

`functions/src/index.ts` currently defines auth-create/delete, role callable, booking-create/update, nested-message-create and review-create handlers. Deployment is paused by instruction. Before any future deployment:

- Make user creation non-destructive and reconcile ISO string versus Timestamp fields.
- Preserve/validate claims when setting role; current replacement `{role}` can discard admin-related claims.
- Use the actual top-level message path and canonical participant UID mapping.
- Make aggregate/counter/notification effects replay-safe; event delivery can repeat.
- Reconcile booking status/payment fields and notification `timestamp` with client readers.
- Implement authenticated server payment verification separately; it is not present among these handlers.

## Required production verification, not performed

Read-only owner-approved inventory should establish deployed project IDs, rules versions, index state, Functions list, provider configuration, public companion field/provenance distribution, legacy/new application counts, ID-to-UID mapping, orphan locks/interactions and media path distribution. Capture aggregate/redacted results, not private KYC/contact/message content in documentation. Any later cleanup needs a backup/export, dry run, exact target list, idempotent migration and restore test. No live deletion is authorized by this audit.
