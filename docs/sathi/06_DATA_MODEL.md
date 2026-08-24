# 06 — Data Model

**Last updated:** 2026-08-24
Firestore project: `hamrosathi1`. Currency: NPR. All timestamps ISO strings or Firestore timestamps as already established per collection.

---

## Collections (23)

### Identity & Profiles
| Collection | Purpose | Key fields |
|---|---|---|
| `users/{uid}` | Customer & companion profiles | name, email, avatar, role, phone, bio, languages, skills, availability, interests, location, favorites, fcmToken, createdAt/updatedAt |
| `users/{uid}/favorites/{companionId}` | Saved companions | companionId |
| `companions/{id}` (id = userId) | Public companion listing | userId, name, age, gender, bio, hourlyRate (NPR), rating, reviewsCount, isVerified, location, coordinates (geopoint), languages, interests, images, availableDays, responseRate, trustScore |
| `admins/{uid}` | Admin role assignments | role, permissions |
| `guideApplications/{id}` | Companion onboarding | userId, status, documents, submittedAt, reviewedAt, reviewerId |

### Booking & Money
| Collection | Purpose | Key fields |
|---|---|---|
| `bookings/{id}` | Booking records | companionId, userId, date, time, duration, participants, status, totalPrice, platformFee, companionPayout, meetingPoint, specialRequests, paymentMethod, paymentStatus, paymentId |
| `booking_locks/{lockId}` (`lock_{companionId}_{date}`) | Slot reservation | companionId, date, bookingId, status |
| `payments/{id}` | Payment initiation/records | userId, provider (khalti/esewa), amount (NPR), currency, bookingId, status, paymentUrl |
| `reviews/{id}` | Companion reviews | companionId, userId, bookingId, rating, comment/text, date |

### Messaging
| Collection | Purpose | Key fields |
|---|---|---|
| `conversations/{id}` (`{uidA}_{uidB}`) | Chat threads | participantIds, lastMessage, unreadCount |
| `conversations/{id}/typing/{userId}` | Typing indicators | timestamp |
| `messages/{id}` | Messages | conversationId, senderId, text, mediaUrls, type, isRead, status |

### Content & Social
| Collection | Purpose | Key fields |
|---|---|---|
| `activities/{id}` | Activity catalog | title, description, duration, avgPrice (NPR), imageUrl, companionCount, category, location, coordinates |
| `events/{id}` | Events/meetups | title, description, date, time, location, coordinates, spots, participants, imageUrl, createdBy, category |
| `stories/{id}` | Experience stories | userId, companionId/userName, imageUrl, caption, likes/likesCount, comments, createdAt, category, tags |
| `community_posts/{id}` | Community posts | userId, userName, userAvatar, title, content, category, tags, imageUrl, status (published), likesCount, commentsCount, sharesCount, reportsCount, location |
| `likes/{userId_postId}` | Post likes | userId, postId (deterministic id = idempotency) |
| `story_likes/{userId_storyId}` | Story likes | userId, storyId (deterministic id) |
| `comments/{id}` | Post comments | postId, userId, userName, userAvatar, text, createdAt |

### Operations & Safety
| Collection | Purpose | Key fields |
|---|---|---|
| `notifications/{id}` | In-app notifications | userId, title, message, type, isRead, link, timestamp |
| `presence/{userId}` | Online status | status, lastSeen |
| `reports/{id}` | Content/user reports | reporterId, targetType, targetId, reason, status |
| `sosAlerts/{id}` | Emergency alerts | userId, location, coordinates, status, emergencyContacts |
| `suspiciousActivity/{id}` | Security incidents | userId, type, description, ipAddress, userAgent, severity, status |
| `auditLogs/{id}` | Immutable admin audit trail | action, actorId, actorName, targetType, targetId, details, timestamp |

## Relationships

```
users 1─N bookings N─1 companions
users 1─N reviews N─1 companions        (review requires bookingId)
users 1─N messages (as sender) N─1 conversations
users 1─N notifications, favorites (subcollection), stories, posts, comments
companions 1─N activities (companionId), booking_locks
community_posts 1─N likes (deterministic), comments
stories 1─N story_likes (deterministic)
bookings 1─1 booking_locks (per companion+date slot)
```

## Integrity Conventions

1. **Deterministic IDs for one-per-user actions**: likes and story_likes use `{userId}_{targetId}` — a network retry cannot create a duplicate (write is idempotent by construction).
2. **Counter fields** (`likesCount`, `commentsCount`, `participants`, unread counts) must only ever be mutated via `FieldValue.increment` or inside transactions — never client-computed absolute values.
3. **Denormalization (intentional)**: `userName`/`userAvatar` on posts/comments/messages, `lastMessage` on conversations, `reviewsCount`/`rating` on companions. Rationale: read efficiency for feeds. Consistency: update denormalized copies in the same batch/transaction as the source change where feasible; tolerate eventual consistency on cosmetic fields only.
4. **Status enums** (do not invent new values ad hoc):
   - bookings: `pending → confirmed → completed | cancelled`
   - payments: `initiated → pending_verification → paid | failed`
   - community_posts: `published` (feed-visible) | other moderation states
   - guideApplications: `submitted → approved | rejected`
5. **Money fields**: integers or strings representing NPR; never floats in ledger-grade fields; never another currency in stored amounts.

## Query Patterns (must have matching indexes)

- companions: filter city/language/rating + sort price/rating
- community_posts: `where status=='published' + orderBy createdAt desc`
- stories: `orderBy createdAt desc`
- bookings: `where userId==X + orderBy date`, `where companionId==X + where date==Y` (availability check)
- messages: `where conversationId==X + orderBy createdAt`
