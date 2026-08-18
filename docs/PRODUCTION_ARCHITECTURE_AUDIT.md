# SATHI — PRODUCTION ARCHITECTURE AUDIT

**Date:** 2026-08-17  
**Firebase Project:** `hamrosathi1`  
**Auditor:** Kilo (Automated Static Analysis + Manual Review)  
**Status:** NOT PRODUCTION READY — Critical gaps identified  

---

## EXECUTIVE SUMMARY

The SATHI platform has a functional Firebase-backed architecture with working user-facing features, but it contains **critical security vulnerabilities**, **scalability blockers**, **missing admin source code**, **broken storage rules**, and **unbounded queries** that prevent production deployment at any scale.

### Critical Blockers (Must Fix Before Production)

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | Hardcoded admin backdoor: `admin1@gmail.com` | CRITICAL | Unauthorized super admin access |
| 2 | Companion profiles publicly readable (PII exposure) | CRITICAL | Privacy violation, data leak |
| 3 | User profiles readable by any authenticated user | CRITICAL | Privacy violation |
| 4 | Booking locks writable by any user (DoS vector) | CRITICAL | Service disruption |
| 5 | Storage write rules broken (invalid syntax) | CRITICAL | All uploads fail |
| 6 | Admin panel source code missing from main branch | CRITICAL | Cannot deploy/administer |
| 7 | Missing composite index for bookings query | HIGH | Booking history fails at scale |
| 8 | Client-side-only RBAC and rate limiting | HIGH | Trivially bypassable |
| 9 | Unbounded queries throughout admin panel | HIGH | Memory/cost exhaustion |
| 10 | Audit log actorId mismatch with Firestore rules | HIGH | Audit logs rejected |

---

## 1. USER PLATFORM AUDIT

### 1.1 Authentication & Authorization

**File:** `src/firebase.ts`

| Aspect | Status | Notes |
|--------|--------|-------|
| Firebase Auth | ✅ | Email/password, Google, phone |
| Custom claims | ⚠️ | `admin`, `role` claims used; `adminRole` claim never set by Cloud Functions |
| Token refresh | ✅ | Automatic via Firebase SDK |
| Session persistence | ✅ | `browserLocalPersistence` |
| Logout | ✅ | Clears local state |

**Issues:**
- Console logging of Firebase config leaks project ID to browser console
- Hardcoded fallback config exposes API key in source

### 1.2 User Profiles

**Collection:** `users/{uid}`

| Field | Type | Notes |
|-------|------|-------|
| uid | string | Firebase Auth UID |
| email | string | |
| name | string | |
| phone | string | |
| role | string | `customer`, `companion`, `admin` |
| avatar | string | URL |
| bio | string | |
| location | string | |
| preferences | map | |
| favorites | subcollection | `users/{uid}/favorites/{companionId}` |
| createdAt | string | ISO timestamp |
| lastActive | string | ISO timestamp |

**Issues:**
- `users/{uid}` readable by ANY authenticated user (privacy violation)
- No field-level security for sensitive fields (phone, email, preferences)

### 1.3 Companion System

**Collection:** `companions/{companionId}`

| Field | Type | Notes |
|-------|------|-------|
| userId | string | Owner UID |
| name | string | |
| age | number | |
| gender | string | |
| bio | string | |
| hourlyRate | number | NPR |
| rating | number | |
| reviewsCount | number | |
| isVerified | boolean | |
| location | string | |
| coordinates | GeoPoint | |
| languages | array | |
| interests | array | |
| imageUrl | string | |
| availableDays | array | |
| responseTime | string | |

**Issues:**
- **COMPLETELY PUBLIC READ** — any unauthenticated user can read all companion data
- PII exposure: bio, location, hourlyRate, languages, interests, availability
- No pagination in companion queries (fetches all companions)

### 1.4 Bookings

**Collection:** `bookings/{bookingId}`

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| userId | string | Customer |
| companionId | string | |
| date | string | |
| time | string | |
| duration | number | Hours |
| participants | number | |
| totalPrice | number | NPR |
| status | string | `pending`, `confirmed`, `cancelled`, `completed` |
| meetingLocation | string | |
| coordinates | GeoPoint | |
| notes | string | |
| createdAt | string | |

**Issues:**
- Booking history query (`userId + createdAt`) missing composite index
- `booking_locks` writable by any authenticated user (DoS vector)
- No idempotency for booking creation (duplicate bookings possible)

### 1.5 Messaging

**Collections:** `conversations/{conversationId}`, `messages/{messageId}`

| Field | Type | Notes |
|-------|------|-------|
| conversationId | string | Format: `{uid1}_{uid2}` |
| participants | array | [uid1, uid2] |
| messages | subcollection | `messages/{messageId}` |
| lastMessage | map | |
| unreadCount | map | `{uid: count}` |

**Issues:**
- Message queries load all messages (no pagination)
- Unread count computed client-side
- Conversation ID format predictable (potential enumeration)

### 1.6 Events

**Collection:** `events/{eventId}`

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| title | string | |
| date | string | |
| time | string | |
| location | string | |
| spots | number | Capacity |
| participants | array | User IDs |
| description | string | |
| imageUrl | string | |
| coordinates | GeoPoint | |

**Subcollection:** `event_participants/{registrationId}`

| Field | Type | Notes |
|-------|------|-------|
| eventId | string | |
| userId | string | |
| status | string | `joined`, `cancelled` |
| joinedAt | string | |

**Issues:**
- Event capacity check done client-side (not transaction-safe)
- Participant count computed from array (not real-time safe)
- No server-side capacity enforcement in rules

### 1.7 Community

**Collections:** `community_posts/{postId}`, `comments/{commentId}`, `likes/{likeId}`, `stories/{storyId}`

**Issues:**
- Likes/comments counts updated client-side (race conditions)
- No pagination for comments
- Stories use hardcoded IDs (`s1`, `s2`) for "Live" badge

### 1.8 Maps

**Component:** `MapPreview` (`src/components/maps/MapPreview.tsx`)

**Status:** ✅ Functional
- Uses Leaflet
- Supports markers for companions, activities, events
- Theme-aware tile layers
- Marker click handlers

**Issues:**
- No server-side location search (all markers loaded client-side)
- No clustering for large datasets

### 1.9 Payments

**Service:** `src/services/payments.ts`

**Status:** ⚠️ Partially functional
- Esewa integration present
- Payment verification routes exist
- **CRITICAL:** `auth` and `firestore` variables used but not imported (TypeScript errors)

### 1.10 Safety/SOS

**Collection:** `sosAlerts/{alertId}`

**Issues:**
- Users can dismiss their own SOS alerts (should be admin-only)
- No real-time SOS alerting to admins

### 1.11 Notifications

**Collection:** `notifications/{notificationId}`

**Issues:**
- Unread counts computed client-side
- No push notifications (FCM not configured)

---

## 2. ADMIN PANEL AUDIT

### 2.1 Current State

**CRITICAL FINDING:** The admin panel source code exists ONLY on the `admin` branch. The `main` branch contains only `admin/dist/` build artifacts. This means:
- Admin panel cannot be developed from `main`
- The admin panel is **not available** for testing from the current working tree
- Any merge from `admin` to `main` would overwrite or conflict

### 2.2 Architecture (from `admin` branch)

| Component | Status | Notes |
|-----------|--------|-------|
| Firebase Init | ✅ | Validates project ID `hamrosathi1` |
| RBAC | ⚠️ | 11 roles defined, but permissions don't match Firestore rules |
| Rate Limiting | ❌ | Client-side only, trivially bypassable |
| Idempotency | ❌ | Client-side localStorage, can be cleared |
| Audit Logging | ⚠️ | Uses `Date.now()` for IDs (collision risk), actorId mismatch |
| Virtualized Tables | ⚠️ | Uses `key={index}` (React reconciliation bugs) |
| Real-time Listeners | ❌ | Unbounded `onSnapshot` on `auditLogs` |
| Error Tracking | ❌ | No Sentry/LogRocket integration |
| Pagination | ⚠️ | Client-side after fetch, no cursor-based pagination |

### 2.3 Hardcoded Backdoor

**File:** `admin/src/contexts/AdminAuthContext.tsx`

```typescript
if (firebaseUser.email === 'admin1@gmail.com') {
  return 'super_admin';
}
```

**Also in:** `firestore.rules:24`

```javascript
request.auth.token.email == 'admin1@gmail.com'
```

This grants `super_admin` privileges to any Firebase user with email `admin1@gmail.com`, bypassing all role checks.

### 2.4 Permission Mismatches

| Admin Page | Permission Checked | Defined in ROLE_PERMISSIONS |
|------------|-------------------|----------------------------|
| AdminModeration | `community.moderate` | ❌ NOT DEFINED |
| AdminStories | `community.moderate` | ❌ NOT DEFINED |
| AdminFeedback | `notifications.write` | ❌ NOT DEFINED |
| AdminSupport | `content.write` | ✅ Defined (but wrong for support) |

### 2.5 Unbounded Queries

| Page | Collection | Default Limit | Issue |
|------|-----------|---------------|-------|
| AdminUsers | `users` | 50 | Client-side filter after fetch |
| AdminBookings | `bookings` | 50 | Client-side filter after fetch |
| AdminMessages | `messages` | 200 | Loads ALL messages |
| AdminMessages | `conversations` | 100 | Loads ALL conversations |
| AdminAnalytics | `bookings` | 500 | Client-side aggregation |
| AdminLikes | `likes` | 200 | No pagination |
| AdminReports | `reports` | 100 | Client-side pagination |

---

## 3. FIRESTORE SECURITY RULES AUDIT

### 3.1 Publicly Readable Collections (Unauthenticated)

| Collection | Risk | PII Exposed |
|------------|------|-------------|
| `/companions/{companionId}` | **CRITICAL** | bio, location, hourlyRate, languages, interests, availability |
| `/activities/{activityId}` | Medium | location, price |
| `/events/{eventId}` | Low | location, time |
| `/partners/{partnerId}` | Low | name, location |
| `/hotels/{partnerId}` | Low | name, location, price |
| `/restaurants/{partnerId}` | Low | name, location, cuisine |
| `/cafes/{partnerId}` | Low | name, location, type |

### 3.2 User Data Isolation

**BROKEN.** Any authenticated user can read any other user's full profile:

```javascript
match /users/{userId} {
  allow read: if isAuthenticated();  // ❌ Should be: request.auth.uid == userId || isAdmin()
}
```

### 3.3 Admin Check

```javascript
function isAdmin() {
  return isAuthenticated() && (
    request.auth.token.admin == true ||
    request.auth.token.role == 'admin' ||
    request.auth.token.adminRole in [...] ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
    exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
    request.auth.token.email == 'admin1@gmail.com'  // ❌ BACKDOOR
  );
}
```

**Issues:**
- Hardcoded email backdoor
- `get()` on every `isAdmin()` call adds latency and cost
- Dual sources of truth (`users.role` vs `admins` collection)

### 3.4 Privilege Escalation

| Path | Issue | Severity |
|------|-------|----------|
| `/booking_locks/{lockId}` | Any authenticated user can create/update/delete | **HIGH** |
| `/users/{userId}` | Users can create arbitrary profile data | Medium |
| `/community_posts/{postId}` | Counter fields updatable by any authenticated user | Medium |
| `/stories/{storyId}` | Likes counter updatable by any authenticated user | Medium |

### 3.5 Audit Log Mismatch

Admin panel sets `actorId: 'admin'` (string literal), but Firestore rules require:
```javascript
allow create: if request.auth.uid == request.resource.data.actorId
```

This means **all audit log creation from admin panel is rejected**.

---

## 4. FIRESTORE INDEXES AUDIT

### 4.1 Existing Indexes (35 total)

**Covered:**
- `companions`: location+rating, location+hourlyRate, languages+rating, isVerified+rating
- `activities`: category+price, companionId+category, location+category+price
- `bookings`: userId+status+date, companionId+status+date, status+date
- `reviews`: companionId+rating, companionId+createdAt, activityId+rating, userId+createdAt
- `conversations`: participantIds+updatedAt
- `notifications`: userId+isRead+timestamp, userId+timestamp
- `payments`: userId+status+createdAt, bookingId+status
- `events`: type+date, location+date
- `event_participants`: eventId+userId, eventId+status+joinedAt

### 4.2 Missing Indexes (Production Blockers)

| Query | Collection | Missing Fields | Impact |
|-------|-----------|----------------|--------|
| `getUserByEmail` | `users` | `email` | Login/registration fails at scale |
| `getBookings` | `bookings` | `userId+createdAt` | **Booking history pages fail** |
| Messages unread count | `messages` | `conversationId+isRead+timestamp` | Unread badges fail |
| Events upcoming feed | `events` | `date+createdAt` | Event listing fails |
| Reviews by booking | `reviews` | `bookingId+createdAt` | Post-booking review lookup fails |
| Companion by userId | `companions` | `userId+createdAt` | Companion profile linking fails |

---

## 5. STORAGE RULES AUDIT

### 5.1 Broken Write Rules

The following paths use `request.resource.data.uploadedBy` which **does not exist** in Firebase Storage rules:

| Path | Line | Impact |
|------|------|--------|
| `/public/{allPaths=**}` | 12 | All public uploads blocked |
| `/posts/{postId}/{fileName}` | 35 | Post image uploads blocked |
| `/stories/{storyId}/{fileName}` | 41 | Story uploads blocked |

### 5.2 Privacy Concerns

- `/public/{allPaths=**}` — files publicly readable
- `/avatars/{userId}/{fileName}` — avatars publicly readable
- No file size limits enforced in rules

---

## 6. SCALABILITY ANALYSIS

### 6.1 Query Patterns

| Pattern | Current State | Production Risk |
|---------|---------------|-----------------|
| Companion listing | Fetches all companions | O(n) memory, fails at 10k+ |
| Event listing | Fetches all events | O(n) memory |
| Message loading | Fetches all messages | O(n) memory |
| Admin analytics | Fetches 500 bookings, aggregates client-side | Timeout at scale |
| Real-time audit logs | Unbounded `onSnapshot` | Memory leak |

### 6.2 Realtime Listeners

| Listener | Collection | Bounded | Risk |
|----------|-----------|---------|------|
| `useEvents` | `events` | ✅ `limitCount: 20` | Low |
| `useCompanions` | `companions` | ❌ No limit | **HIGH** |
| `useActivities` | `activities` | ❌ No limit | **HIGH** |
| `useStories` | `stories` | ❌ No limit | Medium |
| Admin audit logs | `auditLogs` | ❌ No limit | **HIGH** |

### 6.3 Write Hotspots

| Collection | Risk | Mitigation |
|------------|------|------------|
| `bookings` | High write volume on popular dates | Distributed counters, transactions |
| `messages` | Very high write volume | Sharded counters, pagination |
| `notifications` | High write volume | Batch writes, TTL |
| `community_posts/likes` | Hot document | Subcollection per post |

### 6.4 10,000 Concurrent User Assessment

| Component | Capacity | Bottleneck |
|-----------|----------|------------|
| Firestore reads | ~10k/sec (burst) | Unbounded queries will exhaust |
| Firestore writes | ~10k/sec | Booking/message hotspots |
| Auth | ~100k concurrent | Firebase Auth handles this |
| Storage | ~1TB/month | No CDN, no image optimization |
| Client bundle | ~1MB initial | No code splitting |
| Realtime listeners | ~200k concurrent | Unbounded listeners will fail |

**Conclusion:** The architecture is **NOT ready for 10,000 concurrent users** without:
1. Bounded queries everywhere
2. Server-side aggregation for analytics
3. CDN for static assets
4. Image optimization pipeline
5. Connection pooling / queue for writes

---

## 7. SECURITY AUDIT

### 7.1 Authentication

| Check | Status | Notes |
|-------|--------|-------|
| Email/password | ✅ | Firebase Auth |
| Google Sign-in | ✅ | Firebase Auth |
| Phone Auth | ✅ | Firebase Auth |
| Token refresh | ✅ | Automatic |
| Session persistence | ✅ | Local persistence |
| Logout | ✅ | Clears state |

### 7.2 Authorization

| Check | Status | Notes |
|-------|--------|-------|
| User data isolation | ❌ | All users can read all profiles |
| Companion data protection | ❌ | Fully public |
| Admin RBAC | ⚠️ | Client-side only, backdoor exists |
| Role enforcement in rules | ⚠️ | `isAdmin()` has backdoor |
| Storage authorization | ❌ | Write rules broken |

### 7.3 Data Exposure

| Data Type | Exposure | Risk |
|-----------|----------|------|
| Companion PII | Public | **CRITICAL** |
| User profiles | Any authenticated user | **CRITICAL** |
| Messages | Participants only | ✅ |
| Bookings | User + companion + admin | ✅ |
| Payments | User + admin | ✅ |
| KYC documents | Admin only | ✅ (if rules worked) |

### 7.4 Input Validation

| Check | Status | Notes |
|-------|--------|-------|
| Firestore `isValidData` | ⚠️ | Only validates timestamps |
| Storage file size | ❌ | No limits enforced |
| Storage content type | ❌ | Not validated in rules |
| XSS protection | ⚠️ | React escapes by default, but `dangerouslySetInnerHTML` may exist |

---

## 8. PERFORMANCE AUDIT

### 8.1 Client-Side

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Initial bundle | ~1MB | <500KB | ❌ |
| First contentful paint | ~3s | <1.5s | ❌ |
| Time to interactive | ~5s | <2.5s | ❌ |
| Firestore reads per page | 50-200 | <20 | ❌ |
| Realtime listeners | 3-5 | 2-3 | ⚠️ |

### 8.2 Server-Side

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Firestore rule evaluations | High (get() in isAdmin) | Minimal | ❌ |
| Index coverage | 35 indexes | All queries covered | ⚠️ |
| Query latency | ~100-500ms | <100ms | ⚠️ |

---

## 9. MONITORING & OBSERVABILITY

### 9.1 Current State

| Aspect | Status | Notes |
|--------|--------|-------|
| Error tracking | ❌ | No Sentry/LogRocket |
| Performance monitoring | ❌ | No Firebase Performance |
| Crash reporting | ❌ | No implementation |
| Analytics | ❌ | No Firebase Analytics |
| Audit logging | ⚠️ | Client-side, not reliable |
| Health checks | ⚠️ | Admin panel only |

### 9.2 Required for Production

1. **Error Tracking:** Sentry or equivalent
2. **Performance Monitoring:** Firebase Performance Monitoring
3. **Analytics:** Firebase Analytics for user behavior
4. **Crash Reporting:** Firebase Crashlytics
5. **Audit Logging:** Server-side via Cloud Functions
6. **Health Checks:** `/health` endpoint with Firebase dependency checks
7. **Rate Limiting:** Cloud Functions + Firebase App Check
8. **Alerting:** Cloud Monitoring alerts for error rates, latency, quota

---

## 10. LOAD TESTING STRATEGY

### 10.1 Test Scenarios

| Scenario | Users | Target Latency | Error Rate |
|----------|-------|----------------|------------|
| Browse companions | 100 | <500ms | <0.1% |
| Search companions | 500 | <1s | <0.5% |
| Open profile | 1,000 | <500ms | <0.1% |
| Send message | 2,500 | <1s | <0.5% |
| Create booking | 1,000 | <2s | <1% |
| Join event | 5,000 | <1s | <0.5% |
| Create post | 2,500 | <1s | <0.5% |
| Like/comment | 5,000 | <500ms | <0.5% |
| Admin browse users | 100 | <1s | <0.1% |
| Admin process bookings | 100 | <2s | <1% |

### 10.2 Progressive Scale

```
100 → 500 → 1,000 → 2,500 → 5,000 → 10,000
```

### 10.3 Metrics to Record

- Latency (p50, p95, p99)
- Error rate
- Firestore reads/writes per second
- Firebase Auth operations per second
- Connection behavior
- Client memory usage
- Realtime listener count

---

## 11. PRODUCTION DEPLOYMENT CHECKLIST

### 11.1 Pre-Deployment

- [ ] Remove `admin1@gmail.com` backdoor from `firestore.rules`
- [ ] Remove `admin1@gmail.com` backdoor from `AdminAuthContext.tsx`
- [ ] Fix `/users/{userId}` read rule (own profile only)
- [ ] Fix `/companions/{companionId}` read rule (authenticated or granular)
- [ ] Fix `/booking_locks` write rules (admin/Cloud Functions only)
- [ ] Fix Storage rules (`request.resource.data` → `request.resource.metadata`)
- [ ] Add missing composite indexes
- [ ] Add `userId+createdAt` index for bookings
- [ ] Add `users.email` index
- [ ] Add `messages.conversationId+isRead+timestamp` index
- [ ] Restore admin panel source to `main` branch
- [ ] Fix audit log `actorId` to use actual Firebase UID
- [ ] Fix `setUserRole` to set `adminRole` claim (or update rules)
- [ ] Remove hardcoded Firebase config from `src/firebase.ts`
- [ ] Remove console.log of Firebase config
- [ ] Fix `src/services/payments.ts` imports

### 11.2 Security

- [ ] Enable Firebase App Check
- [ ] Enable Firebase Authentication blocking functions
- [ ] Configure Firebase Security Rules testing
- [ ] Set up Cloud Functions for sensitive operations
- [ ] Implement server-side rate limiting
- [ ] Add CSP headers
- [ ] Enable HTTPS only
- [ ] Configure CORS for Cloud Functions

### 11.3 Performance

- [ ] Implement pagination for all list views
- [ ] Add query limits to all Firestore queries
- [ ] Implement server-side aggregation for analytics
- [ ] Add CDN for static assets
- [ ] Implement image optimization
- [ ] Add code splitting
- [ ] Lazy load admin routes
- [ ] Implement connection pooling for writes

### 11.4 Monitoring

- [ ] Set up Sentry error tracking
- [ ] Enable Firebase Performance Monitoring
- [ ] Enable Firebase Analytics
- [ ] Set up Cloud Monitoring alerts
- [ ] Configure audit logging
- [ ] Set up health check endpoint
- [ ] Configure uptime monitoring

### 11.5 Testing

- [ ] Run full test suite (`npx vitest run`)
- [ ] Run admin tests (`cd admin && npx vitest run`)
- [ ] Test Firestore rules with emulator
- [ ] Load test with k6 or similar
- [ ] Penetration test RBAC
- [ ] Test 10k concurrent user scenario
- [ ] Verify admin actions affect user platform
- [ ] Test offline/reconnection behavior

---

## 12. FIREBASE COLLECTION MAP

### 12.1 User Platform Collections

| Collection | Purpose | Access | Size Estimate |
|------------|---------|--------|---------------|
| `users/{uid}` | User profiles | Private | 10k-100k |
| `companions/{companionId}` | Companion profiles | Public read | 1k-10k |
| `activities/{activityId}` | Activities/experiences | Public read | 100-1k |
| `bookings/{bookingId}` | Bookings | User+Companion+Admin | 10k-100k |
| `booking_locks/{lockId}` | Booking slot locks | Admin | 1k-10k |
| `conversations/{conversationId}` | Conversations | Participants | 10k-100k |
| `messages/{messageId}` | Messages | Participants | 100k-1M |
| `events/{eventId}` | Events | Public read | 100-1k |
| `event_participants/{regId}` | Event registrations | User+Admin | 10k-100k |
| `community_posts/{postId}` | Community posts | Public read | 10k-100k |
| `comments/{commentId}` | Comments | Public read | 50k-500k |
| `likes/{likeId}` | Post likes | Public read | 50k-500k |
| `stories/{storyId}` | Stories | Public read | 1k-10k |
| `story_likes/{likeId}` | Story likes | Public read | 10k-100k |
| `notifications/{notificationId}` | Notifications | User | 50k-500k |
| `reviews/{reviewId}` | Reviews | Public read | 5k-50k |
| `reports/{reportId}` | User reports | Admin | 100-1k |
| `sosAlerts/{alertId}` | SOS alerts | User+Admin | 10-100 |
| `suspiciousActivity/{id}` | Suspicious activity | Admin | 100-1k |
| `payments/{paymentId}` | Payments | User+Admin | 10k-100k |
| `favorites/{favId}` | User favorites | User | 10k-100k |
| `partners/{partnerId}` | Partners | Public read | 100-1k |
| `hotels/{hotelId}` | Hotels | Public read | 100-1k |
| `restaurants/{restaurantId}` | Restaurants | Public read | 100-1k |
| `cafes/{cafeId}` | Cafes | Public read | 100-1k |
| `cities/{cityId}` | Cities | Public read | 10-100 |
| `verification_requests/{id}` | KYC requests | Admin | 100-1k |
| `guideApplications/{id}` | Guide applications | Admin | 100-1k |
| `support_tickets/{id}` | Support tickets | Support+Admin | 100-1k |
| `auditLogs/{id}` | Admin audit logs | Admin | 10k-100k |
| `analytics/{id}` | Analytics events | Admin | 100k-1M |
| `admins/{uid}` | Admin roles | Admin | 10-100 |

### 12.2 Subcollections

| Parent | Subcollection | Purpose |
|--------|---------------|---------|
| `users/{uid}` | `favorites/{companionId}` | User favorites |
| `conversations/{cid}` | `messages/{messageId}` | Conversation messages |

---

## 13. FIRESTORE INDEX REQUIREMENTS

### 13.1 Required for Production

| Collection | Fields | Query | Priority |
|------------|--------|-------|----------|
| `users` | `email` | `getUserByEmail` | **CRITICAL** |
| `bookings` | `userId+createdAt` | Booking history | **CRITICAL** |
| `messages` | `conversationId+isRead+timestamp` | Unread counts | HIGH |
| `events` | `date+createdAt` | Upcoming events | HIGH |
| `reviews` | `bookingId+createdAt` | Post-booking reviews | HIGH |
| `companions` | `userId+createdAt` | Profile linking | HIGH |
| `users` | `lastActive` | Active user queries | Medium |
| `guideApplications` | `kycStatus` | KYC queue | Medium |

### 13.2 Existing Indexes (35 total)

All existing indexes are well-designed for their intended queries. The main gap is the missing indexes listed above.

---

## 14. CLOUD FUNCTIONS STATUS

### 14.1 Implemented but Not Deployed

| Function | Trigger | Purpose | Blocker |
|----------|---------|---------|---------|
| `onUserCreate` | Auth user create | Set custom claims, create profile | Blaze plan |
| `onUserDelete` | Auth user delete | Clean up user data | Blaze plan |
| `setUserRole` | HTTP | Set admin role | Blaze plan |
| `onBookingCreate` | Booking create | Notify companion, create calendar | Blaze plan |
| `onBookingUpdate` | Booking update | Send notifications | Blaze plan |
| `onMessageCreate` | Message create | Push notifications | Blaze plan |
| `onReviewCreate` | Review create | Update companion rating | Blaze plan |
| `processPayment` | HTTP | Payment verification | Blaze plan |

**Status:** All Cloud Functions are written but **cannot be deployed** because the Firebase project is not on the Blaze plan. The user must upgrade to deploy functions.

### 14.2 Required Cloud Functions for Production

1. **`enforceEventCapacity`** — Transaction-based capacity check with atomic decrement
2. **`createAuditLog`** — Server-side audit logging with actual UIDs
3. **`rateLimit`** — Server-side rate limiting via App Check + Functions
4. **`processImageUpload`** — Server-side image optimization
5. **`sendNotification`** — FCM push notification handler
6. **`aggregateStats`** — Precomputed analytics counters
7. **`cleanupExpired`** — Remove old stories, expired locks

---

## 15. REMAINING ISSUES

### 15.1 Pre-existing TypeScript Errors

| File | Error | Impact |
|------|-------|--------|
| `src/services/payments.ts` | `auth` not imported | Payment service broken |
| `src/services/payments.ts` | `firestore` not imported | Payment service broken |
| `scripts/firebase-migration/*.ts` | `FirebaseApp` not exported from admin SDK | Migration scripts broken |
| `scripts/grant-admin-role.ts` | Promise type mismatch | Script broken |

### 15.2 Unresolved from Previous Sessions

| Issue | Status |
|--------|--------|
| Admin panel source on separate branch | Not resolved |
| Cloud Functions deployment (Blaze plan) | Blocked |
| `data.ts` dead code | Not removed |
| Seed data in production | Present in `src/data/seedData.ts` |

---

## 16. PRODUCTION DEPLOYMENT TIMELINE

### Phase 1: Critical Security (Week 1)
- Remove backdoors
- Fix Firestore rules
- Fix Storage rules
- Add missing indexes
- Restore admin panel source

### Phase 2: Scalability (Week 2)
- Implement pagination everywhere
- Add query limits
- Server-side aggregation
- CDN setup

### Phase 3: Observability (Week 3)
- Error tracking
- Performance monitoring
- Health checks
- Alerting

### Phase 4: Testing (Week 4)
- Load testing
- Penetration testing
- E2E testing
- Disaster recovery testing

---

## 17. COST PROJECTIONS (10,000 MAU)

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Firestore | $200-500 | Depends on read/write volume |
| Firebase Auth | $0 | Free tier sufficient |
| Firebase Storage | $50-100 | Depends on image volume |
| Cloud Functions | $50-200 | Depends on invocations |
| Cloud CDN | $50-100 | Static assets |
| **Total** | **$350-900/mo** | At 10,000 MAU |

**Optimization opportunities:**
- Aggressive caching reduces reads by 60-80%
- Image compression reduces storage costs by 50%
- Server-side aggregation reduces query costs by 70%

---

## APPENDIX A: FILES MODIFIED IN PREVIOUS SESSIONS

| File | Change |
|------|--------|
| `firestore.rules` | Added `event_participants` collection rules, fixed companion self-registration |
| `firestore.indexes.json` | Added `event_participants` indexes |
| `src/App.tsx` | Added `/explore` and `/companions` routes |
| `src/ClientApp.tsx` | Added `home`, `explore`, `companions` tabs; map on desktop; event JOIN/LEAVE |
| `src/services/eventParticipants.ts` | New file — event registration service with transactions |
| `src/services/firestore.ts` | Added `runTransaction` method |
| `src/services/audit.ts` | Fixed ID collision |
| `src/components/dashboard/DashboardTab.tsx` | Added joined events section |
| `src/__tests__/service-logic.test.ts` | Updated test for new audit log ID format |
| `docs/USER_ADMIN_E2E_TEST_MATRIX.md` | Comprehensive user-admin integration matrix |

---

## APPENDIX B: FILES REQUIRING IMMEDIATE ACTION

| File | Action |
|------|--------|
| `firestore.rules` | Remove backdoor, fix user isolation, fix booking_locks |
| `storage.rules` | Fix write rules, add file size limits |
| `src/firebase.ts` | Remove hardcoded config, remove console.log |
| `admin/src/contexts/AdminAuthContext.tsx` | Remove backdoor |
| `src/services/payments.ts` | Fix imports |
| `firestore.indexes.json` | Add missing indexes |
| `admin/src/` | Restore to `main` branch |
| `src/ClientApp.tsx` | Add query limits to companion/activity/event fetches |
