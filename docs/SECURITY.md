# Security

## Current State

- Firebase Authentication with email/password and Google sign-in
- Custom claims for roles: customer, companion, admin
- Production Firestore security rules with RBAC (`firestore.rules`)
- Production Firebase Storage rules (`storage.rules`)
- Client-side route guards (`AuthGuard`, `AdminGuard`)
- Session persistence via Firebase SDK (`browserLocalPersistence`)
- Environment variable configuration for all Firebase keys
- Audit logging for admin privileged actions
- Separate admin application (`/admin`) with independent authentication boundary

## Authentication & Authorization

- Firebase Authentication (email/password, Google, phone)
- Custom claims for roles: customer, companion, admin
- Admin roles: `super_admin`, `platform_admin`, `safety_admin`, `moderation_admin`, `support_agent`, `booking_admin`, `finance_admin`, `kyc_reviewer`, `content_admin`, `analytics_admin`, `read_only_admin`
- Firebase Security Rules enforce authorization for all Firestore collections
- Client-side route guards for protected pages (presentation only)
- Session persistence via Firebase SDK
- Admin application is completely separate from user application

## Firestore Security Rules

- Users can read/write their own profile (limited fields)
- Companions are readable by all, writable by owner/admin
- Bookings readable by participants and admin, writable by system
- Messages readable by participants only
- Admin endpoints require custom claim or `admins` collection membership
- All admin writes are audited via `auditLogs` collection

## Input Validation

- React default escaping for XSS prevention
- File upload validation (size, type) before Firebase Storage upload
- Form validation in booking and auth flows

## Secrets Management

- All keys in environment variables, never committed
- Firebase config loaded from `VITE_FIREBASE_*` environment variables
- Server-side secrets only in Cloud Functions (pending Blaze plan)
- `.env` files are git-ignored

## Rate Limiting

- Firestore query limits via security rules
- Client-side debouncing on search inputs
- Atomic booking locks to prevent double-booking

## Payment Security

- Server-side verification of all Khalti/eSewa webhooks (pending Cloud Functions)
- Never trust client-side payment status
- Use HTTPS only in production
- PCI compliance via payment gateway SDKs (no card data touches server)

## Trust & Safety

- Government ID verification (KYC) stored in Firebase Storage with restricted rules
- SOS button triggers real-time location share + FCM alert
- Emergency contacts stored in user document
- User blocking via `blockedUsers` array in user doc
- Report workflow to create `reports` collection for admin review
- Admin audit logs for all privileged actions

## Admin Security

- Admin application runs on separate port (3001) and has separate build
- Admin routes are NOT exposed in the main SATHI user application
- Every admin action requires Firebase Authentication + server-side authorization
- Admin operations are logged to immutable `auditLogs` collection
- Role-based access control enforced in both frontend and Firestore rules
