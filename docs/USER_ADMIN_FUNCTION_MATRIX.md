# SATHI — USER ↔ ADMIN FUNCTION MATRIX

**Date:** 2026-08-17  
**Firebase Project:** hamrosathi1  
**Purpose:** Complete mapping of every user-facing feature to its corresponding admin capability and data flow  

---

## HOW TO READ THIS MATRIX

Every feature follows this flow:

```
USER ACTION
    ↓
FIRESTORE WRITE
    ↓
ADMIN SEES UPDATE (realtime/listener/poll)
    ↓
ADMIN ACTION
    ↓
FIRESTORE UPDATE
    ↓
USER SEES RESULT (realtime/listener/poll)
```

No UI-only admin controls. Every admin action must persist to Firebase and be visible to the user platform.

---

## 1. USER ACCOUNT MANAGEMENT

### 1.1 User Signup

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Submit email/password | `auth` | ✅ |
| 2 | Cloud Function | Create user document | `users/{uid}` | ⚠️ Not deployed (Blaze) |
| 3 | User | Complete profile | `users/{uid}` | ✅ |
| 4 | Admin | View new user | `users` | ✅ |
| 5 | Admin | Verify/approve user | `users/{uid}.status` | ❌ No status field |
| 6 | User | See account status | `users/{uid}` | ✅ |

**Admin Capability:** View, search, suspend, restore, restrict, deactivate users  
**Admin Roles:** `SUPER_ADMIN`, `USER_ADMIN`  
**Firestore Rules:** `users/{uid}` readable by owner or admin, writable by owner or admin  

### 1.2 User Profile Edit

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Edit profile fields | `users/{uid}` | ✅ |
| 2 | Admin | View updated profile | `users/{uid}` | ✅ |
| 3 | Admin | Correct profile data | `users/{uid}` | ✅ |
| 4 | User | See corrected data | `users/{uid}` | ✅ |

**Admin Capability:** Edit any user profile field, correct misinformation  
**Admin Roles:** `SUPER_ADMIN`, `USER_ADMIN`  

### 1.3 User Suspension

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Suspend user | `users/{uid}.status = 'suspended'` | ❌ No status field |
| 2 | Firestore | Trigger security check | `users/{uid}` | ❌ Rules don't check status |
| 3 | User | See restricted access | N/A | ❌ Not implemented |
| 4 | Admin | Restore user | `users/{uid}.status = 'active'` | ❌ No status field |

**Admin Capability:** Suspend, restrict, restore, deactivate accounts  
**Admin Roles:** `SUPER_ADMIN`, `USER_ADMIN`  
**Required:** Add `status` field to user document, update security rules  

### 1.4 User Reports

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | File report against user | `reports/{reportId}` | ✅ |
| 2 | Admin | View report | `reports` | ✅ |
| 3 | Admin | Investigate user | `users/{uid}` | ✅ |
| 4 | Admin | Take action (suspend/warn) | `users/{uid}` | ⚠️ Partial |
| 5 | User | See consequence | `users/{uid}` | ❌ No feedback |

**Admin Capability:** Review reports, inspect user activity, take disciplinary action  
**Admin Roles:** `SUPER_ADMIN`, `MODERATOR`, `SAFETY_ADMIN`  

---

## 2. COMPANION MANAGEMENT

### 2.1 Companion Registration

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Apply as companion | `guideApplications/{id}` | ✅ |
| 2 | Admin | View application | `guideApplications` | ✅ |
| 3 | Admin | Request KYC | `guideApplications/{id}.kycStatus` | ✅ |
| 4 | User | Upload KYC documents | Firebase Storage | ❌ Storage rules broken |
| 5 | Admin | Verify KYC | `users/{uid}.isVerified` | ✅ |
| 6 | User | See verified badge | `companions/{id}.isVerified` | ✅ |

**Admin Capability:** Review applications, request KYC, verify/reject companions  
**Admin Roles:** `SUPER_ADMIN`, `COMPANION_ADMIN`  
**Required:** Fix Storage rules for KYC uploads  

### 2.2 Companion Profile Management

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Companion | Edit profile | `companions/{id}` | ✅ |
| 2 | Admin | View profile | `companions/{id}` | ✅ |
| 3 | Admin | Edit/correct profile | `companions/{id}` | ✅ |
| 4 | Admin | Suspend companion | `companions/{id}.status` | ❌ No status field |
| 5 | User | See updated profile | `companions/{id}` | ✅ |

**Admin Capability:** Edit any companion field, suspend/restore, correct misinformation  
**Admin Roles:** `SUPER_ADMIN`, `COMPANION_ADMIN`  

### 2.3 Companion Verification

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Verify companion | `companions/{id}.isVerified = true` | ✅ |
| 2 | Admin | Reject companion | `companions/{id}.isVerified = false` | ✅ |
| 3 | User | See verified badge | `companions/{id}` | ✅ |

**Admin Capability:** Verify, reject, revoke verification  
**Admin Roles:** `SUPER_ADMIN`, `COMPANION_ADMIN`  

---

## 3. BOOKING ARCHITECTURE

### 3.1 Booking Request

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Request booking | `bookings/{bookingId}` | ✅ |
| 2 | Cloud Function | Notify companion | `notifications/{id}` | ⚠️ Not deployed |
| 3 | Companion | Accept/decline | `bookings/{bookingId}.status` | ✅ |
| 4 | User | See confirmation | `bookings/{bookingId}` | ✅ |
| 5 | Admin | View booking | `bookings` | ✅ |

**Admin Capability:** View all bookings, modify status, cancel, refund  
**Admin Roles:** `SUPER_ADMIN`, `OPERATIONS_ADMIN`  

### 3.2 Booking Modification

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Reschedule booking | `bookings/{id}.date`, `.time` | ✅ |
| 2 | Admin | Change companion | `bookings/{id}.companionId` | ✅ |
| 3 | Cloud Function | Notify both parties | `notifications/{id}` | ⚠️ Not deployed |
| 4 | User | See updated booking | `bookings/{id}` | ✅ |
| 5 | Companion | See updated booking | `bookings/{id}` | ✅ |

### 3.3 Booking Cancellation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Cancel booking | `bookings/{id}.status = 'cancelled'` | ✅ |
| 2 | Cloud Function | Process refund | `payments/{id}` | ⚠️ Not deployed |
| 3 | Cloud Function | Notify both parties | `notifications/{id}` | ⚠️ Not deployed |
| 4 | User | See cancellation | `bookings/{id}` | ✅ |
| 5 | Companion | See cancellation | `bookings/{id}` | ✅ |

### 3.4 Booking Completion

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Leave review | `reviews/{reviewId}` | ✅ |
| 2 | Cloud Function | Update companion rating | `companions/{id}.rating` | ⚠️ Not deployed |
| 3 | Admin | View review | `reviews` | ✅ |
| 4 | Admin | Remove inappropriate review | `reviews/{id}` | ✅ |
| 5 | User | See review status | `reviews/{id}` | ✅ |

---

## 4. MESSAGING

### 4.1 Conversation Flow

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User A | Send message | `conversations/{cid}/messages/{mid}` | ✅ |
| 2 | Firebase | Realtime delivery | `messages` | ✅ |
| 3 | User B | Receive message | `messages` | ✅ |
| 4 | Admin | View conversation | `conversations`, `messages` | ✅ |
| 5 | Admin | Monitor for abuse | `messages` | ✅ |

**Admin Capability:** View all conversations, read all messages, flag abusive content  
**Admin Roles:** `SUPER_ADMIN`, `MODERATOR`, `SAFETY_ADMIN`, `SUPPORT_ADMIN`  
**Required:** Support access must be strictly role-controlled  

### 4.2 Message Moderation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Flag message | `messages/{id}.flagged = true` | ❌ No flagged field |
| 2 | Admin | Delete message | `messages/{id}` | ✅ |
| 3 | Cloud Function | Notify sender | `notifications/{id}` | ⚠️ Not deployed |
| 4 | User | See message removed | `messages` | ✅ |

---

## 5. COMMUNITY SYSTEM

### 5.1 Post Creation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Create post | `community_posts/{postId}` | ✅ |
| 2 | User | Upload photo | Firebase Storage | ❌ Rules broken |
| 3 | Other users | Like post | `likes/{likeId}` | ✅ |
| 4 | Other users | Comment | `comments/{commentId}` | ✅ |
| 5 | Admin | View post | `community_posts` | ✅ |

**Admin Capability:** Hide, restore, remove posts; ban abusive users  
**Admin Roles:** `SUPER_ADMIN`, `MODERATOR`  

### 5.2 Post Moderation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Hide post | `community_posts/{id}.status = 'hidden'` | ✅ |
| 2 | Admin | Remove post | `community_posts/{id}` | ✅ |
| 3 | Cloud Function | Notify author | `notifications/{id}` | ⚠️ Not deployed |
| 4 | User | See post removed | `community_posts/{id}` | ✅ |

### 5.3 Comment Moderation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Hide comment | `comments/{id}.status = 'hidden'` | ✅ |
| 2 | Admin | Remove comment | `comments/{id}` | ✅ |
| 3 | User | See comment removed | `comments/{id}` | ✅ |

---

## 6. EVENTS

### 6.1 Event Browsing

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Browse events | `events/{eventId}` | ✅ |
| 2 | User | View event details | `events/{eventId}` | ✅ |
| 3 | Admin | View events | `events` | ✅ |

**Admin Capability:** Create, edit, publish, unpublish, cancel events  
**Admin Roles:** `SUPER_ADMIN`, `OPERATIONS_ADMIN`  

### 6.2 Event Join

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Click Join | `event_participants/{regId}` | ✅ |
| 2 | Cloud Function | Check capacity (transaction) | `events/{id}` | ⚠️ Client-side only |
| 3 | Cloud Function | Decrement spots | `events/{id}.spots` | ⚠️ Not atomic |
| 4 | Admin | View participant | `event_participants` | ✅ |
| 5 | Admin | Remove participant | `event_participants/{id}` | ✅ |
| 6 | User | See Joined state | `event_participants` | ✅ |

**Admin Capability:** View participants, manage capacity, remove registrations, cancel events  
**Admin Roles:** `SUPER_ADMIN`, `OPERATIONS_ADMIN`  

### 6.3 Event Cancellation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Cancel event | `events/{id}.status = 'cancelled'` | ❌ No status field |
| 2 | Cloud Function | Notify all participants | `notifications/{id}` | ⚠️ Not deployed |
| 3 | Cloud Function | Process refunds | `payments/{id}` | ⚠️ Not deployed |
| 4 | User | See cancellation | `events/{id}` | ✅ |

---

## 7. SEARCH + DISCOVERY

### 7.1 Companion Search

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Search companions | `companions` | ⚠️ Client-side filter |
| 2 | User | Filter by category | `companions` | ⚠️ Client-side filter |
| 3 | User | Filter by location | `companions` | ⚠️ Client-side filter |
| 4 | Admin | View search analytics | `analytics` | ⚠️ Not implemented |

**Required:** Server-side search with indexed queries, pagination  

### 7.2 Activity Search

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Browse activities | `activities/{id}` | ✅ |
| 2 | User | Filter by category | `activities` | ⚠️ Client-side filter |
| 3 | Admin | Manage activities | `activities` | ✅ |

---

## 8. PAYMENTS

### 8.1 Payment Flow

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Initiate payment | `payments/{paymentId}` | ✅ |
| 2 | Esewa | Process payment | External | ✅ |
| 3 | Cloud Function | Verify payment | `payments/{id}` | ⚠️ Not deployed |
| 4 | Cloud Function | Confirm booking | `bookings/{id}.status` | ⚠️ Not deployed |
| 5 | Admin | View transaction | `payments` | ✅ |
| 6 | Admin | Process refund | `payments/{id}.status` | ✅ |

**Admin Capability:** View all transactions, process refunds, flag suspicious payments  
**Admin Roles:** `SUPER_ADMIN`, `FINANCE_ADMIN`  

### 8.2 Refund Processing

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Initiate refund | `payments/{id}.status = 'refunded'` | ✅ |
| 2 | Cloud Function | Process Esewa refund | External | ⚠️ Not deployed |
| 3 | Cloud Function | Notify user | `notifications/{id}` | ⚠️ Not deployed |
| 4 | User | See refund status | `payments/{id}` | ✅ |

---

## 9. SAFETY & SOS

### 9.1 SOS Alert

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Trigger SOS | `sosAlerts/{alertId}` | ✅ |
| 2 | Firebase | Realtime alert | `sosAlerts` | ✅ |
| 3 | Admin | View alert | `sosAlerts` | ✅ |
| 4 | Admin | Dispatch help | `sosAlerts/{id}.status` | ✅ |
| 5 | User | See response | `sosAlerts/{id}` | ✅ |

**Admin Capability:** View SOS alerts, dispatch emergency contacts, mark resolved  
**Admin Roles:** `SUPER_ADMIN`, `SAFETY_ADMIN`  

### 9.2 Report Handling

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | File report | `reports/{reportId}` | ✅ |
| 2 | Admin | View report | `reports` | ✅ |
| 3 | Admin | Investigate | `users`, `companions`, `posts` | ✅ |
| 4 | Admin | Take action | Target resource | ✅ |
| 5 | User | See consequence | N/A | ❌ No feedback |

---

## 10. NOTIFICATIONS

### 10.1 Notification Delivery

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | System | Create notification | `notifications/{id}` | ✅ |
| 2 | Firebase | Realtime delivery | `notifications` | ✅ |
| 3 | User | See notification | `notifications` | ✅ |
| 4 | User | Mark as read | `notifications/{id}.isRead` | ✅ |
| 5 | Admin | View all notifications | `notifications` | ✅ |

**Admin Capability:** Send platform-wide notifications, view user notifications  
**Admin Roles:** `SUPER_ADMIN`, `OPERATIONS_ADMIN`  

### 10.2 Admin Broadcast

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Create broadcast | `notifications/{id}` | ✅ |
| 2 | Firebase | Deliver to all users | `notifications` | ⚠️ No targeting |
| 3 | User | See broadcast | `notifications` | ✅ |

---

## 11. REVIEWS & RATINGS

### 11.1 Review Flow

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Submit review | `reviews/{reviewId}` | ✅ |
| 2 | Cloud Function | Update companion rating | `companions/{id}.rating` | ⚠️ Not deployed |
| 3 | Admin | View review | `reviews` | ✅ |
| 4 | Admin | Remove review | `reviews/{id}` | ✅ |
| 5 | User | See review status | `reviews/{id}` | ✅ |

**Admin Capability:** View all reviews, remove inappropriate reviews  
**Admin Roles:** `SUPER_ADMIN`, `MODERATOR`  

---

## 12. FAVORITES

### 12.1 Favorite Companion

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Add favorite | `users/{uid}/favorites/{companionId}` | ✅ |
| 2 | Admin | View user favorites | `users/{uid}/favorites` | ✅ |
| 3 | User | See favorites | `users/{uid}/favorites` | ✅ |

**Admin Capability:** View user favorites (for abuse investigation)  
**Admin Roles:** `SUPER_ADMIN`, `USER_ADMIN`  

---

## 13. STORIES

### 13.1 Story Creation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | User | Create story | `stories/{storyId}` | ✅ |
| 2 | User | Upload media | Firebase Storage | ❌ Rules broken |
| 3 | Other users | View story | `stories/{storyId}` | ✅ |
| 4 | Admin | View stories | `stories` | ✅ |

**Admin Capability:** Remove inappropriate stories, restrict abusive users  
**Admin Roles:** `SUPER_ADMIN`, `MODERATOR`  

### 13.2 Story Moderation

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Admin | Remove story | `stories/{id}` | ✅ |
| 2 | Admin | Restrict user | `users/{uid}` | ✅ |
| 3 | User | See story removed | `stories/{id}` | ✅ |

---

## 14. ANALYTICS & REPORTING

### 14.1 Platform Metrics

| Metric | Source | Admin View | Status |
|--------|--------|------------|--------|
| Total users | `users` | Dashboard | ⚠️ Client-side aggregation |
| Total bookings | `bookings` | Dashboard | ⚠️ Client-side aggregation |
| Revenue | `payments` | Dashboard | ❌ Hardcoded `avgBookingValue` |
| Active companions | `companions` | Dashboard | ⚠️ Client-side aggregation |
| Community posts | `community_posts` | Dashboard | ⚠️ Client-side aggregation |
| Messages sent | `messages` | Dashboard | ⚠️ Client-side aggregation |
| SOS alerts | `sosAlerts` | Dashboard | ⚠️ Client-side aggregation |

**Required:** Server-side aggregation via Cloud Functions or Firestore aggregate queries  

### 14.2 User Analytics

| Metric | Source | Admin View | Status |
|--------|--------|------------|--------|
| User activity | `analytics` | User detail | ⚠️ Not implemented |
| Booking history | `bookings` | User detail | ✅ |
| Payment history | `payments` | User detail | ✅ |
| Reports filed | `reports` | User detail | ✅ |

---

## 15. ADMIN-ONLY FEATURES

### 15.1 Role Management

| Step | Actor | Action | Firebase Collection | Status |
|------|-------|--------|---------------------|--------|
| 1 | Super Admin | Assign role | `admins/{uid}` | ✅ |
| 2 | Cloud Function | Set custom claim | `auth` | ⚠️ Not deployed |
| 3 | Admin | See updated permissions | `admins/{uid}` | ✅ |

**Required:** Move role assignment to Cloud Functions with proper validation  

### 15.2 System Configuration

| Setting | Current State | Required |
|---------|---------------|----------|
| Maintenance mode | ❌ Not implemented | Add `settings/{id}` |
| Feature flags | ❌ Not implemented | Add `settings/{id}` |
| Rate limits | ❌ Client-side only | Cloud Functions |
| Email templates | ❌ Hardcoded | Firestore `email_templates/{id}` |

---

## 16. DATA FLOW DIAGRAMS

### 16.1 Booking Flow

```
User creates booking
    ↓
bookings/{id} created
    ↓
[Realtime listener on bookings]
    ↓
Admin sees new booking
    ↓
Admin approves
    ↓
bookings/{id}.status = 'confirmed'
    ↓
[Realtime listener on bookings]
    ↓
User sees confirmed booking
    ↓
Cloud Function sends notification
    ↓
Both parties notified
```

### 16.2 Event Join Flow

```
User clicks Join
    ↓
event_participants/{eventId_uid} created
    ↓
[Realtime listener on event_participants]
    ↓
Admin sees new participant
    ↓
Admin can remove participant
    ↓
event_participants/{id} deleted
    ↓
[Realtime listener on event_participants]
    ↓
User sees "Leave Event" button
```

### 16.3 Report Flow

```
User files report
    ↓
reports/{id} created
    ↓
[Realtime listener on reports]
    ↓
Admin sees new report
    ↓
Admin investigates
    ↓
Admin takes action (suspend/warn)
    ↓
users/{uid}.status updated
    ↓
[Realtime listener on users]
    ↓
User sees restricted account
```

---

## 17. MISSING FEATURES FOR PRODUCTION

| Feature | User Impact | Admin Impact | Priority |
|---------|-------------|--------------|----------|
| User status field | Cannot suspend users | Cannot manage accounts | **CRITICAL** |
| Server-side event capacity | Over-booking possible | Cannot enforce limits | **CRITICAL** |
| Server-side rate limiting | Spam/abuse possible | Cannot prevent abuse | **HIGH** |
| Server-side aggregation | Slow dashboards | Slow analytics | **HIGH** |
| Image optimization | Slow load times | Large storage bills | **MEDIUM** |
| Push notifications | Missing real-time alerts | Missing admin alerts | **MEDIUM** |
| Audit logging | No audit trail | No accountability | **HIGH** |
| Error tracking | Silent failures | Cannot debug | **MEDIUM** |
| Health checks | No status page | No system monitoring | **LOW** |

---

## 18. ACCEPTANCE CRITERIA

The platform is production-ready only when:

1. ✅ Every user action creates a real Firebase document
2. ✅ Every admin action updates a real Firebase document
3. ✅ User sees admin actions via realtime listeners or polling
4. ✅ Admin sees user actions via realtime listeners or polling
5. ✅ No fake data, mock responses, or local-only state for persistent actions
6. ✅ All security rules enforce data isolation
7. ✅ All queries are bounded and paginated
8. ✅ All write operations have idempotency/transaction protection
9. ✅ All async operations have loading/error/success states
10. ✅ Admin panel source is on `main` branch and deployable
11. ✅ No hardcoded backdoors or bypasses
12. ✅ All Cloud Functions deployed (Blaze plan enabled)
13. ✅ Error tracking and monitoring operational
14. ✅ Load tested to 10,000 concurrent users

---

## APPENDIX: FIREBASE COLLECTION REFERENCE

| Collection | Purpose | Access Pattern | Size |
|------------|---------|----------------|------|
| `users/{uid}` | User profiles | By UID | 10k-100k |
| `companions/{id}` | Companion profiles | List with filters | 1k-10k |
| `activities/{id}` | Activities | List | 100-1k |
| `bookings/{id}` | Bookings | By userId, companionId | 10k-100k |
| `booking_locks/{id}` | Slot locks | By companionId+date | 1k-10k |
| `conversations/{cid}` | Conversations | By participant | 10k-100k |
| `messages/{mid}` | Messages | By conversationId | 100k-1M |
| `events/{id}` | Events | List with filters | 100-1k |
| `event_participants/{regId}` | Registrations | By eventId, userId | 10k-100k |
| `community_posts/{id}` | Posts | List with pagination | 10k-100k |
| `comments/{id}` | Comments | By postId | 50k-500k |
| `likes/{id}` | Likes | By userId, postId | 50k-500k |
| `stories/{id}` | Stories | List by time | 1k-10k |
| `story_likes/{id}` | Story likes | By userId, storyId | 10k-100k |
| `notifications/{id}` | Notifications | By userId | 50k-500k |
| `reviews/{id}` | Reviews | By companionId | 5k-50k |
| `reports/{id}` | Reports | List with filters | 100-1k |
| `sosAlerts/{id}` | SOS alerts | List by status | 10-100 |
| `payments/{id}` | Payments | By userId, bookingId | 10k-100k |
| `favorites/{id}` | Favorites | By userId | 10k-100k |
| `partners/{id}` | Partners | List | 100-1k |
| `hotels/{id}` | Hotels | List by city | 100-1k |
| `restaurants/{id}` | Restaurants | List by city | 100-1k |
| `cafes/{id}` | Cafes | List by city | 100-1k |
| `cities/{id}` | Cities | List | 10-100 |
| `verification_requests/{id}` | KYC requests | List by status | 100-1k |
| `guideApplications/{id}` | Guide apps | List by status | 100-1k |
| `support_tickets/{id}` | Support tickets | List by status | 100-1k |
| `auditLogs/{id}` | Audit logs | List by time | 10k-100k |
| `analytics/{id}` | Analytics events | List by type | 100k-1M |
| `admins/{uid}` | Admin roles | By UID | 10-100 |
