# SATHI — OBSERVABILITY & MONITORING REQUIREMENTS

**Date:** 2026-08-17  
**Firebase Project:** hamrosathi1  
**Purpose:** Production monitoring, alerting, and incident response  

---

## 1. MONITORING STACK

### 1.1 Required Services

| Service | Purpose | Provider | Status |
|---------|---------|----------|--------|
| Error Tracking | Client-side errors, crashes | Sentry | ❌ Not configured |
| Performance Monitoring | Page load, API latency | Firebase Performance | ❌ Not configured |
| Analytics | User behavior, funnels | Firebase Analytics | ❌ Not configured |
| Crash Reporting | Native crashes | Firebase Crashlytics | ❌ Not configured |
| Server-side Logging | Cloud Function logs | Cloud Logging | ✅ Available |
| Alerting | Error rates, latency | Cloud Monitoring | ❌ Not configured |
| Uptime Monitoring | Availability | Cloud Monitoring / UptimeRobot | ❌ Not configured |
| Audit Logging | Admin actions | Firestore `auditLogs` | ⚠️ Partial |

### 1.2 Recommended Stack

```
Client → Sentry (errors) + Firebase Performance (metrics)
Server → Cloud Logging + Cloud Monitoring
Firebase → Crashlytics + Analytics + Performance
Alerts → Cloud Monitoring → Email/Slack/PagerDuty
```

---

## 2. CLIENT-SIDE MONITORING

### 2.1 Error Tracking (Sentry)

**Required Events:**
- Unhandled promise rejections
- React component errors
- Firebase permission errors
- Network failures
- Payment failures
- Booking creation failures
- Message send failures

**Required Context:**
- User ID (anonymized)
- Active tab/screen
- Firebase project ID
- App version
- Device info
- Network status

**Implementation:**
```typescript
// src/utils/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.user) {
      event.user.id = event.user.id?.slice(0, 8) || 'unknown';
    }
    return event;
  }
});
```

### 2.2 Performance Monitoring

**Required Metrics:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- Firestore query duration
- Firestore read count per page
- Bundle load time

**Firebase Performance Traces:**
- `app_start` → `first_meaningful_paint`
- `search_companions` → `results_rendered`
- `create_booking` → `booking_confirmed`
- `send_message` → `message_delivered`

---

## 3. SERVER-SIDE MONITORING

### 3.1 Cloud Functions Logging

**Required Logs:**
- Function invocation count
- Function duration
- Function errors
- Cold start frequency
- Memory usage
- Billing impact

**Log Levels:**
- `ERROR`: Payment failures, booking failures, auth failures
- `WARN`: Rate limit hits, retry attempts, quota warnings
- `INFO`: Admin actions, user actions (PII-redacted)
- `DEBUG`: Query patterns, cache hits/misses

### 3.2 Cloud Monitoring Metrics

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| Firestore reads/sec | Gauge | > 8,000 (80% of burst limit) |
| Firestore writes/sec | Gauge | > 8,000 |
| Auth sign-in failures | Counter | > 10/min |
| Payment failures | Counter | > 5/min |
| Booking creation failures | Counter | > 5/min |
| Message delivery failures | Counter | > 10/min |
| SOS alerts (active) | Gauge | > 5 |
| Admin audit log failures | Counter | > 1/min |
| Error rate (5xx) | Ratio | > 1% |
| Latency p95 | Gauge | > 2s |

---

## 4. FIRESTORE MONITORING

### 4.1 Query Performance

**Monitor:**
- Slow queries (>500ms)
- High read count queries (>100 reads)
- Unindexed queries
- Hot document reads (>100 reads/sec on single doc)

### 4.2 Security Rules

**Monitor:**
- Permission denied errors
- Rule evaluation latency
- Unauthorized access attempts

### 4.3 Storage

**Monitor:**
- Storage growth rate
- Upload failures
- Download bandwidth
- Cache hit ratio

---

## 5. ALERTING RULES

### 5.1 Critical Alerts (PagerDuty/SMS)

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| Payment system down | Payment failure rate > 10% for 5 min | 15 min |
| Booking system down | Booking creation failure > 10% for 5 min | 15 min |
| Auth system down | Sign-in failure rate > 20% for 5 min | 15 min |
| SOS alerts unresponsive | > 5 active alerts without admin response for 10 min | 5 min |
| Firestore quota exceeded | > 80% of daily quota used | 1 hour |
| High error rate | > 5% 5xx errors for 10 min | 30 min |

### 5.2 Warning Alerts (Email/Slack)

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| Slow queries | p95 query latency > 1s for 15 min | 4 hours |
| High read volume | > 5,000 reads/sec for 15 min | 4 hours |
| Rate limit hits | > 50 rate-limited requests/min for 15 min | 4 hours |
| Storage growth | > 10GB/month growth rate | 1 day |
| Admin audit failures | > 1 audit log failure/min for 10 min | 4 hours |

### 5.3 Info Alerts (Dashboard)

| Alert | Condition |
|-------|-----------|
| New admin login | Any admin login from new device/IP |
| Unusual traffic | > 2x normal traffic for 30 min |
| Cache miss rate | > 30% cache misses |
| Cold start frequency | > 10% of invocations are cold starts |

---

## 6. AUDIT LOGGING

### 6.1 Required Audit Events

| Event | Actor | Data | Retention |
|-------|-------|------|-----------|
| User signup | System | uid, email, timestamp | 7 years |
| User login | User | uid, IP, device, timestamp | 1 year |
| Admin login | Admin | uid, IP, device, timestamp | 7 years |
| Role change | Admin | target uid, old role, new role, timestamp | 7 years |
| User suspension | Admin | target uid, reason, timestamp | 7 years |
| Booking creation | User | booking id, companion id, timestamp | 7 years |
| Booking modification | Admin/Companion | booking id, changes, timestamp | 7 years |
| Booking cancellation | Admin/User | booking id, reason, timestamp | 7 years |
| Payment | User/Admin | payment id, amount, status, timestamp | 7 years |
| Refund | Admin | payment id, amount, reason, timestamp | 7 years |
| Report filed | User | report id, target type, target id, timestamp | 7 years |
| Report resolved | Admin | report id, action, timestamp | 7 years |
| SOS alert | User | alert id, location, timestamp | 7 years |
| SOS resolved | Admin | alert id, resolution, timestamp | 7 years |
| Content moderation | Admin | content id, action, timestamp | 7 years |
| Data export | Admin | user id, data type, timestamp | 7 years |
| Settings change | Admin | setting key, old value, new value, timestamp | 7 years |

### 6.2 Audit Log Structure

```typescript
interface AuditLog {
  id: string; // audit_{timestamp}_{random}
  actorId: string; // Firebase UID or 'system'
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  success: boolean;
  error?: string;
}
```

### 6.3 Audit Log Retention

- **Hot storage** (Firestore): 90 days
- **Warm storage** (Cloud Storage): 1 year
- **Cold storage** (Archive): 7 years

---

## 7. HEALTH CHECKS

### 7.1 Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/health` | Overall system health | `{ status: 'healthy', services: {...} }` |
| `/health/firestore` | Firestore connectivity | `{ status: 'connected', latency: '45ms' }` |
| `/health/auth` | Auth service status | `{ status: 'operational' }` |
| `/health/storage` | Storage bucket status | `{ status: 'accessible' }` |
| `/health/functions` | Cloud Functions status | `{ status: 'deployed', count: 12 }` |

### 7.2 Health Check Implementation

```typescript
// Cloud Function: /health
export const healthCheck = https.onRequest(async (req, res) => {
  const checks = {
    firestore: await checkFirestore(),
    auth: await checkAuth(),
    storage: await checkStorage(),
    timestamp: new Date().toISOString()
  };
  
  const isHealthy = Object.values(checks).every(c => c.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(checks);
});
```

---

## 8. DASHBOARD REQUIREMENTS

### 8.1 Admin Dashboard

| Widget | Data Source | Update Frequency |
|--------|-------------|------------------|
| Active users | `analytics` | Real-time |
| Bookings today | `bookings` | 1 min |
| Revenue today | `payments` | 1 min |
| SOS alerts | `sosAlerts` | Real-time |
| Open reports | `reports` | 5 min |
| Pending KYC | `verification_requests` | 5 min |
| System health | `/health` | 30 sec |
| Error rate | Cloud Logging | 1 min |

### 8.2 User Dashboard

| Widget | Data Source | Update Frequency |
|--------|-------------|------------------|
| Upcoming bookings | `bookings` | Realtime |
| Unread messages | `messages` | Realtime |
| Notifications | `notifications` | Realtime |
| Joined events | `event_participants` | Realtime |

---

## 9. INCIDENT RESPONSE

### 9.1 Severity Levels

| Level | Definition | Example | Response |
|-------|------------|---------|----------|
| P1 | Complete service outage | All users unable to book | 15 min, all hands |
| P2 | Major feature broken | Payment system down | 1 hour, on-call |
| P3 | Minor feature broken | Search slow | 4 hours, next business day |
| P4 | Cosmetic issue | UI alignment off | Next sprint |

### 9.2 Runbooks

**Payment Failure Runbook:**
1. Check Esewa/Khalti status pages
2. Check Cloud Function logs for errors
3. Verify webhook endpoints are responding
4. Check Firestore `payments` collection for stuck `pending` payments
5. Notify users via push notification if widespread

**Booking Failure Runbook:**
1. Check Firestore `bookings` write errors in logs
2. Verify booking_locks are not exhausted
3. Check companion availability rules
4. Verify `isCompanion()` and `isCustomer()` rules are correct

**Auth Failure Runbook:**
1. Check Firebase Auth status page
2. Verify Firebase config in `firebase.ts`
3. Check for rate limiting (too many sign-in attempts)
4. Verify custom claims are being set correctly

### 9.3 Communication Plan

| Incident Level | Internal | External |
|----------------|----------|----------|
| P1 | Slack #incidents, phone tree | Status page, email to all users |
| P2 | Slack #incidents | Status page |
| P3 | Slack #engineering | Status page (if user-visible) |
| P4 | Jira ticket | None |

---

## 10. DATA RETENTION

### 10.1 Firestore TTL Policies

| Collection | Retention | TTL Field |
|------------|-----------|-----------|
| `stories` | 24 hours | `createdAt` |
| `story_likes` | 24 hours | `createdAt` |
| `notifications` | 30 days | `timestamp` |
| `analytics` | 90 days | `timestamp` |
| `suspiciousActivity` | 1 year | `date` |

### 10.2 Cloud Storage Lifecycle

| Bucket Path | Retention | Action |
|-------------|-----------|--------|
| `/stories/{storyId}/` | 24 hours | Delete |
| `/posts/{postId}/` | 1 year | Archive |
| `/avatars/{userId}/` | Keep | Keep |
| `/kyc/{userId}/` | 7 years | Archive |

---

## 11. SECURITY MONITORING

### 11.1 Anomaly Detection

| Anomaly | Detection Method | Action |
|---------|------------------|--------|
| Brute force auth | > 5 failed logins/min per IP | Block IP, alert |
| Data exfiltration | > 1000 reads/min from single user | Alert, investigate |
| Unauthorized admin access | Admin login from new country | Alert, require 2FA |
| Payment fraud | > 3 failed payments/min from single user | Block, alert |
| Spam content | > 10 posts/min from single user | Rate limit, alert |
| SOS spam | > 3 SOS alerts/hour from single user | Investigate |

### 11.2 Access Monitoring

- All admin actions logged to `auditLogs`
- All permission denied events logged to Cloud Logging
- Failed auth attempts logged with IP and user agent
- Rate limit hits logged with endpoint and user ID

---

## 12. COST MONITORING

### 12.1 Budget Alerts

| Service | Monthly Budget | Alert Threshold |
|---------|---------------|-----------------|
| Firestore | $500 | $400 (80%) |
| Firebase Auth | $0 | N/A (free tier) |
| Cloud Storage | $100 | $80 (80%) |
| Cloud Functions | $200 | $160 (80%) |
| Cloud CDN | $100 | $80 (80%) |
| **Total** | **$900** | **$720 (80%)** |

### 12.2 Cost Optimization

| Optimization | Estimated Savings | Implementation |
|--------------|-------------------|----------------|
| Aggressive caching | 60-80% read reduction | Service Worker + Redis |
| Image compression | 50% storage reduction | Cloud Function on upload |
| Server-side aggregation | 70% query cost reduction | Cloud Functions |
| Query limits everywhere | 30-50% read reduction | Enforce in code |
| Archive old data | 20% storage reduction | TTL policies |
| CDN for static assets | 90% egress reduction | Firebase Hosting CDN |

---

## 13. MONITORING CHECKLIST

### 13.1 Pre-Deployment

- [ ] Sentry DSN configured
- [ ] Firebase Performance enabled
- [ ] Firebase Analytics enabled
- [ ] Cloud Monitoring alerts configured
- [ ] Uptime monitoring configured
- [ ] Health check endpoints deployed
- [ ] Audit logging implemented
- [ ] Error boundaries report to Sentry
- [ ] Cost budgets configured
- [ ] Incident response runbooks documented

### 13.2 Post-Deployment

- [ ] Verify Sentry receives test errors
- [ ] Verify Performance traces appear
- [ ] Verify Analytics events fire
- [ ] Verify Cloud Monitoring alerts trigger
- [ ] Verify health checks pass
- [ ] Verify audit logs are created
- [ ] Load test and verify metrics
- [ ] Review first 24 hours of logs

---

## APPENDIX: MONITORING QUERIES

### A.1 Firestore Hot Documents

```javascript
// Find documents with highest read count
SELECT COUNT(*) as reads, document_path
FROM `firestore_export.firestore_documents_export`
GROUP BY document_path
ORDER BY reads DESC
LIMIT 100
```

### A.2 Slow Queries

```javascript
// Find queries taking > 500ms
SELECT * FROM `region-us`.INFORMATION_SCHEMA.PARTITIONS
WHERE table_name = 'firestore_export'
AND _PARTITIONTIME > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
```

### A.3 Error Rate

```javascript
// Calculate error rate by endpoint
SELECT 
  httpRequest.requestUrl,
  COUNT(*) as total,
  SUM(CASE WHEN httpRequest.status >= 400 THEN 1 ELSE 0 END) as errors,
  ROUND(SUM(CASE WHEN httpRequest.status >= 400 THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as error_rate
FROM `project.dataset.cloudaudit_googleapis_com_data_access`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY httpRequest.requestUrl
HAVING error_rate > 1
ORDER BY error_rate DESC
```
