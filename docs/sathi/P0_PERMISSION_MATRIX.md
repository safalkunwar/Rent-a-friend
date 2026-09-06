# P0 permission matrix — before rule implementation

2026-09-05. Canonical identity is Firebase Auth UID. Client helpers are preflight only; rules enforce this matrix. Real deployed documents/claims must be inventoried before rollout. No production migration/deployment in this phase.

Roles: root = super_admin (or legacy server-issued admin=true only when no adminRole is present); KYC = root/kyc_reviewer; content = root/content_admin/moderation_admin as appropriate; booking operator = root/booking_admin. An explicit lesser adminRole never inherits root from admin=true. An email address, users.role or mere document existence never grants admin.

| Resource | Read | Create | Update | Delete | Admin |
| --- | --- | --- | --- | --- | --- |
| users/UID | owner; explicitly authorized staff | own UID, customer role, editable/basic fields only | owner editable allowlist, never verification/role/financial | root only pending deletion workflow | root role assignment; KYC limited companionStatus only |
| users/UID/favorites | owner | owner | owner | owner | root |
| admins/UID | own assignment; root list | root | root | root | only root grants/revokes validated roles |
| companion_applications | owner/KYC | owner draft/submitted unverified | owner editable lifecycle/data, KYC review lifecycle | root | KYC cannot self-review |
| companions | public approved projection (legacy catalog reads retained until inventory) | KYC/root only | owner public allowlist, KYC trusted approval fields | root | no self-approved create, immutable userId |
| bookings | booker/canonical companion UID/operator | booker UID, pending, no verified payment, atomic reservation | canonical actor/state/lock contract (P0-E) | denied client | operator uses same lifecycle, no payment verification |
| booking_locks | authenticated (no contact data) | paired booking only (P0-E) | paired valid transition/reuse only | no unpaired deletion | no bypass of reservation integrity |
| payments | owner/finance/root | denied pending backend | denied | denied | no browser actor may assert provider verification |
| reviews/aggregates | public | disabled until completed-booking authoritative contract | disabled | moderation/root | no browser-authored financial/reward/rating aggregate |
| community_posts | published public, own drafts/content reviewers | authenticated own author, zero counters | own content fields; atomic own interaction deltas only | own/content moderator | moderator cannot impersonate another author |
| comments | public post context | own UID, existing published post, paired count | own text only | own/moderator with paired count | immutable author/postId |
| likes/story_likes | public interaction graph retained | UID_target key + own UID + paired counter | none | own + paired counter | no arbitrary author/counter forging |
| stories | public | own UID, zero counters | own caption/media; paired like delta | own/moderator | comments not implemented as story post mutations |
| conversations | participant; root/moderation review | two distinct UIDs including self | participant metadata only, immutable membership | root | no global authenticated write |
| messages | parent participant/reviewer | own sender + membership | recipient receipt fields only | root/moderation | no editing someone else's message text |
| typing | parent participant | own UID marker + membership | own marker | own marker | no ID-splitting authorization |
| notifications | owner/support/root | self informational record | own isRead only | owner/root | server dispatcher later; no fake delivery |
| events/activities/catalog venues | public | content operator; activity approved owner | catalog owner/operator bounded fields | operator | registrations separate from catalog |
| event_participants | own/operator | denied until atomic capacity integration | own joined->cancelled only | own | do not keep unsafe joining enabled |
| legacy events participants | owner/operator | denied; current app uses flat records | cancellation only | owner | no parallel reservation producer |
| reports/feedback | owner/operator | own UID | operator; owner text fields if supported | root | immutable reporter identity |
| support_tickets | owner/support | own UID | owner message/subject only; support status | root | requester cannot change assignee/status |
| sosAlerts | owner/safety operator | own UID | owner cancellation; operator acknowledgement | denied | database record is not emergency monitoring |
| auditLogs/admin_audit_logs | permitted operator | actual actor UID; append only | denied | denied | no literal actorId 'admin' |
| presence | own UID (active public presence deferred) | own | own | own | no invented online signal |
| verification_requests, booking_locations, booking_reminders, analytics, suspiciousActivity, legacy guideApplications | scoped owner/relevant operator where applicable | deny unimplemented client producers | relevant operator only | root where appropriate | retain legacy records; do not invent features |
| public Storage avatars/posts/stories/UID/file | public | owner UID + immutable metadata + MIME/size | no overwrite | owner/root | no private KYC path admitted |
| Storage kyc/UID/file | KYC reviewer, not uploader/other users | own UID + MIME/size/metadata | no overwrite | root | private path reference, no token URL persisted |

Storage billing is a separate prerequisite: current Firebase Cloud Storage requires Blaze. Emulator success is not a Spark deployment capability. Ordinary client Firestore rules/transactions and local emulator tests do not require Functions deployment.

## Post-media clarification (2026-09-06)

The table above records the pre-implementation permission plan, not a replacement for current rules. The intervening media foundation narrowed Stories/public photo/event-image visibility and protected moderation/report fields. Read [MEDIA_UPLOAD_FOUNDATION.md](MEDIA_UPLOAD_FOUNDATION.md) for those exact contracts. Client writes to reviews are entirely denied; the table's proposed moderation deletion is not implemented. Profile-photo review does not give a moderation-only operator permission to read the entire private users document. The final role tests exercise all 11 adminRole claims with a conflicting legacy admin=true value to ensure lesser explicit roles do not inherit root authority.
