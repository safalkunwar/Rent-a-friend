# Firebase Data Architecture

**Last updated:** 2026-08-26

## Collections (production `hamrosathi1`)

| Collection | Owner | Contents | Notes |
|---|---|---|---|
| `users/{uid}` | the user | profile, role, favorites[], phone?, companionStatus? | privilege keys admin-only |
| `companions/{userId}` | platform | public companion profile (no KYC data) | created on application approval |
| `companion_applications/{id}` | the user (metadata) | lifecycle + applicationData + masked KYC metadata | owner read/edit-limited; admins full |
| `admin_audit_logs/{id}` | platform | immutable admin action trail | create/read admin-only |
| `community_posts/{id}` | author | title/content/category/likesCount/commentsCount snapshots | counters transactional |
| `comments/{id}` | author | postId + userId + text + createdAt | realtime panel per opened post |
| `likes/{uid}_{postId}` | liker | one-per-user-per-post by document ID | idempotent |
| `stories/{id}`, `story_likes/{uid}_{storyId}` | author/liker | experience stories | engagement zeroed for seeded docs |
| `bookings/{id}` | booker/companion | date/time/duration/participants/status/totalPrice/meetingPoint + contact snapshot (`userNameAtBooking/userPhoneAtBooking/userEmailAtBooking`) | slot-lock prevents double booking |
| `activities`, `events`, `partners` | platform catalog | discovery content | paginated reads only |
| `notifications/{id}` | recipient | userId + message metadata | composite index deployed |
| `conversations`, `messages` | participants | messaging | unchanged |

## Firestore indexes (deployed, 60 total)

Notable composites: notifications(userId+timestamp), comments(postId+createdAt),
bookings(companionId+createdAt), community_posts(status+createdAt),
companion_applications(status+submittedAt) and (userId+updatedAt).

## Access boundaries

- KYC documents → **Storage** (`kyc-documents/*`); Firestore holds references/metadata.
- Public companion profiles never contain KYC fields.
- Historical bookings keep contact **snapshots**; live profile stays canonical.

## Performance strategy

Cursor-paginated discovery reads (document-ID), bounded queries everywhere,
session-level request cache, one-listener-per-open-comment-panel, denormalized
counters maintained transactionally.
