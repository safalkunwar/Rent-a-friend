# Admin Functionality Matrix

**Project:** hamrosathi1  
**Date:** 2026-08-14  
**Status:** AUDIT COMPLETE  

---

## Capability Matrix

| Feature | User Side | Admin Action | Firebase Needed | Current Status |
|---------|-----------|--------------|-----------------|----------------|
| Users | Real (creation, profile, role) | Suspend/restore/view/search/bulk actions | Auth + Firestore | **WORKING** |
| Companions | Real (profile, verification requests) | Verify/suspend/edit/search | Firestore | **WORKING** |
| Bookings | Real (create, cancel, complete) | Manage/cancel/confirm/reject/view | Firestore | **WORKING** |
| Comments | Real (create, edit, delete) | Moderate (hide/restore/remove) | Firestore | **WORKING** |
| Likes | Real (create, delete) | Inspect/moderate | Firestore | **WORKING** |
| Stories | Real (create, like) | Moderate (hide/remove) | Firestore + Storage | **PARTIAL** (no dedicated page) |
| SOS | Real (create, update) | Monitor/escalate/assign/dispatch | Firestore | **WORKING** |
| Messages | Real (send, read) | Support workflow (read only) | Firestore | **NOT IMPLEMENTED** |
| Analytics | Real data | Dashboard metrics | Firestore aggregation | **WORKING** (basic) |
| Reports | Real (create) | Triage/resolve/dismiss | Firestore | **WORKING** |
| Guide Applications | Real (submit) | Review/approve/reject | Firestore | **WORKING** |
| Notifications | Real (receive) | Mark read/bulk actions | Firestore | **WORKING** |
| Feedback | Real (submit) | Read/resolve/reply | Firestore | **WORKING** |
| Activities | Admin-managed | CRUD | Firestore | **PARTIAL** (delete works, create/edit coming soon) |
| Events | Admin-managed | CRUD | Firestore | **PARTIAL** (delete works, create/edit coming soon) |
| Payments | Real (initiate via Khalti/eSewa) | View/update status | Firestore | **NOT IMPLEMENTED** (no admin page) |
| Audit Logs | Auto-generated | View/search | Firestore | **WORKING** |
| Suspicious Activity | Admin-created | Investigate/resolve | Firestore | **WORKING** |
| System Health | Firebase status | Monitor | Firebase Admin SDK | **WORKING** |

---

## Category A: WORKS NOW ON CURRENT FIREBASE SETUP

These features are fully functional with the current Firebase setup (no Blaze required):

### 1. User Management
- **List all users** with pagination
- **Search** by name/email
- **Bulk actions**: warn, restrict, suspend, restore, ban, unban
- **View user details**
- **Audit logging** for all actions
- **Rate limiting** and **idempotency**

### 2. Companion Management
- **List all companions** with pagination
- **Search** by name/location/email
- **Verify/unverify** companions
- **Suspend/restore/ban** companions
- **Bulk actions** for companions
- **Audit logging**

### 3. Booking Management
- **List all bookings** with pagination
- **Filter by status** (pending, confirmed, cancelled, completed)
- **Search** by ID, user, companion, meeting point
- **Confirm/reject** pending bookings
- **Complete/cancel** confirmed bookings
- **View booking details** in modal
- **Audit logging**

### 4. Community Moderation
- **List community posts** with search
- **Hide/restore/remove** posts
- **List comments** with search
- **Hide/restore/remove** comments
- **Audit logging**

### 5. Reports Center
- **List all reports** with pagination
- **Filter by status** (open, triaged, under_review, escalated, resolved, dismissed)
- **Filter by type** (user, companion, post, comment, message, booking, safety, other)
- **Search** by reason/target ID
- **Resolve/dismiss** reports
- **Audit logging**

### 6. Safety & Trust
- **List SOS alerts** with severity/status
- **Assign** alerts to agents
- **Change priority** (critical, high, medium, low)
- **Dispatch/resolve** alerts
- **False alarm** marking
- **List suspicious activity**
- **Investigate/resolve** suspicious activity
- **Audit logging**

### 7. Guide/KYC Review
- **List pending guide applications**
- **Review application details**
- **Approve/reject** applications
- **Link** to companion profile on approval
- **List active guides**
- **Verify/suspend/restore** guides
- **Audit logging**

### 8. Content Management
- **List activities** with search
- **List events** with search
- **Delete** activities/events
- **Create/edit** UI placeholder (coming soon)

### 9. Notifications & Feedback
- **List system notifications**
- **Mark all as read**
- **List user feedback**
- **Reply/resolve** feedback
- **Audit logging**

### 10. Audit Logs
- **View all audit logs** with search
- **Filter by action/actor/target**
- **Append-only** (no delete)

### 11. Dashboard & Analytics
- **Real-time metrics** from Firestore
- **Booking trends** chart
- **User registration** chart
- **System health** monitoring
- **Quick actions** navigation

---

## Category B: REQUIRES BLAZE / SERVER-SIDE INFRASTRUCTURE

These features require Cloud Functions, Cloud Run, or external APIs:

| Feature | Why Blaze is Needed | Current State |
|---------|---------------------|---------------|
| Scheduled notifications | Cloud Functions scheduled triggers | UI placeholder only |
| Advanced background jobs | Cloud Run / Cloud Functions | Not started |
| Payment webhooks | External API (Khalti/eSewa) + HTTPS triggers | Webhook handlers not deployed |
| Server-side aggregation | Large dataset aggregation queries | Basic client-side metrics only |
| Message moderation AI | Cloud Vision / NLP API | Not started |
| Advanced search indexing | Algolia / Elasticsearch | Not started |
| Email/SMS notifications | SendGrid / Twilio + Functions | Not started |
| Automated KYC verification | ML + Storage triggers | Manual review only |

---

## Category C: OPTIONAL FUTURE FEATURE

| Feature | Priority | Notes |
|---------|----------|-------|
| Multi-language admin UI | Low | English only for now |
| Advanced permission matrix | Medium | Current RBAC is sufficient |
| Mobile admin app | Low | Desktop-first is fine |
| White-label branding | Low | Not needed for Nepal market |
| API rate limit dashboard | Medium | Would need aggregation |

---

## Missing Admin Pages

| Collection | Has Admin Page | Status |
|------------|---------------|--------|
| users | ✅ AdminUsers | Working |
| companions | ✅ AdminCompanions | Working |
| bookings | ✅ AdminBookings | Working |
| community_posts | ✅ AdminModeration | Working |
| comments | ✅ AdminModeration | Working |
| likes | ❌ No dedicated page | Can inspect via posts |
| stories | ❌ No dedicated page | Needs implementation |
| messages | ❌ No dedicated page | Needs implementation |
| notifications | ✅ AdminFeedback | Working |
| reports | ✅ AdminReports | Working |
| sosAlerts | ✅ AdminSecurity | Working |
| suspiciousActivity | ✅ AdminSecurity | Working |
| guideApplications | ✅ AdminGuides | Working |
| activities | ✅ AdminContent | Partial |
| events | ✅ AdminContent | Partial |
| partners | ❌ No dedicated page | Needs implementation |
| hotels | ❌ No dedicated page | Needs implementation |
| restaurants | ❌ No dedicated page | Needs implementation |
| cafes | ❌ No dedicated page | Needs implementation |
| cities | ❌ No dedicated page | Needs implementation |
| payments | ❌ No dedicated page | Needs implementation |
| analytics | ❌ No dedicated page | Basic metrics in dashboard |
| auditLogs | ✅ AdminAuditLogs | Working |
| feedback | ✅ AdminFeedback | Working |
| verification_requests | ❌ No dedicated page | Covered by AdminGuides |
| support_tickets | ❌ No dedicated page | Needs implementation |

---

## Implementation Priority

### High Priority (Implement Now)
1. **Stories management page** - Users can create stories, need moderation
2. **Payments/Finance page** - Financial visibility is critical
3. **Messages/Support page** - Support workflow needs implementation
4. **Complete Activities/Events CRUD** - Create/edit buttons are placeholders

### Medium Priority (Next Sprint)
5. **Partners management** - Business partners need admin oversight
6. **Cities management** - Location data management
7. **Support tickets page** - User support workflow
8. **Advanced analytics** - More detailed metrics

### Low Priority (Future)
9. Hotels/Restaurants/Cafes management - Not actively used
10. Likes inspection page - Can be done via posts
11. Multi-language support

---

## RBAC Permission Coverage

| Permission | User Mgmt | Companions | Bookings | Moderation | Reports | Safety | Guides | Content | Notifications | Feedback | Audit |
|------------|-----------|------------|----------|------------|---------|--------|-------|---------|---------------|----------|-------|
| users.read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| users.write | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| companions.read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| companions.write | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| bookings.read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| bookings.write | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| community.read | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| community.moderate | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| community.write | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| sos.read | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sos.write | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| safety.read | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| kyc.read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| kyc.write | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| content.read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| content.write | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| notifications.write | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| finance.read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| analytics.read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| audit.read | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Data Flow Verification

### User Action → Admin Visibility

| User Action | Firebase Write | Admin Can See | Admin Can Act |
|-------------|---------------|---------------|---------------|
| User registers | users/{uid} created | ✅ AdminUsers | ✅ Suspend/restore/ban |
| Companion registers | companions/{id} created | ✅ AdminCompanions | ✅ Verify/suspend/ban |
| User books companion | bookings/{id} created | ✅ AdminBookings | ✅ Confirm/cancel/complete |
| User creates post | community_posts/{id} | ✅ AdminModeration | ✅ Hide/restore/remove |
| User comments | comments/{id} | ✅ AdminModeration | ✅ Hide/restore/remove |
| User likes post | likes/{id} | ❌ No page | ❌ No action |
| User creates story | stories/{id} | ❌ No page | ❌ No action |
| User sends SOS | sosAlerts/{id} | ✅ AdminSecurity | ✅ Assign/dispatch/priority |
| User submits report | reports/{id} | ✅ AdminReports | ✅ Resolve/dismiss |
| Companion applies | guideApplications/{id} | ✅ AdminGuides | ✅ Approve/reject |
| User submits feedback | feedback/{id} | ✅ AdminFeedback | ✅ Reply/resolve |
| Admin action | auditLogs/{id} | ✅ AdminAuditLogs | ❌ Append-only |

---

## Notes

- All admin actions use **rate limiting**, **idempotency keys**, and **audit logging**
- All writes go through **Firestore security rules** (server-side authorization)
- No fake data or placeholder buttons in working features
- Missing pages are documented honestly as "NOT IMPLEMENTED"
- Blaze-dependent features are clearly labeled
