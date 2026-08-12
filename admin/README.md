# SATHI Admin Application

## Overview

The SATHI Admin application is a completely separate frontend application for platform administration, moderation, and operations. It is **not** a subdirectory of the main SATHI user application.

## Architecture

```
                 ┌─────────────────────┐
                 │   Firebase/SATHI    │
                 │   hamrosathi1       │
                 └──────────┬──────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
      ┌───────▼────────┐         ┌────────▼───────┐
      │  SATHI App     │         │  Admin App     │
      │  /src          │         │  /admin        │
      │                │         │                │
      │ Users          │         │ Operations     │
      │ Companions     │         │ Moderation     │
      │ Bookings       │         │ KYC            │
      │ Community      │         │ Safety/SOS     │
      │ Messages       │         │ Analytics      │
      └────────────────┘         │ Audit Logs     │
                                 └────────────────┘
```

Both applications share the same production Firebase backend (`hamrosathi1`) but have completely separate:
- Entry points
- Routing
- UI
- Build processes
- Deployments
- Environment configurations
- Documentation

## Prerequisites

- Node.js 18+
- npm 9+
- Firebase project `hamrosathi1` access
- Admin role assigned in Firebase Auth custom claims or `admins` collection

## Installation

```bash
cd admin
npm install
```

## Development

```bash
npm run dev
```

The admin app runs on **http://localhost:3001**

## Production Build

```bash
npm run build
```

Output goes to `admin/dist/`

## Environment Variables

Create a `.env` file in the `/admin` directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=hamrosathi1
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=your_database_id
```

**Never commit `.env` to version control.**

## Authentication

Admin authentication is completely independent from the main SATHI user application.

1. Admin users must have one of the following roles assigned:
   - `super_admin`
   - `platform_admin`
   - `safety_admin`
   - `moderation_admin`
   - `support_agent`
   - `booking_admin`
   - `finance_admin`
   - `kyc_reviewer`
   - `content_admin`
   - `analytics_admin`
   - `read_only_admin`

2. Roles are enforced via:
   - Firebase Security Rules (`firestore.rules`)
   - Admin application role checks
   - Audit logging for all privileged actions

## RBAC (Role-Based Access Control)

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all operations |
| `platform_admin` | Users, companions, bookings, content, KYC, finance, SOS, audit |
| `safety_admin` | Users, companions, bookings, SOS, audit |
| `moderation_admin` | Users, content, comments, audit |
| `support_agent` | Users, bookings, content, comments, audit |
| `booking_admin` | Bookings, users, companions, audit |
| `finance_admin` | Finance, bookings, users, audit |
| `kyc_reviewer` | KYC, users, companions, audit |
| `content_admin` | Content, audit |
| `analytics_admin` | Analytics, users, bookings, content, audit |
| `read_only_admin` | Read-only access to all modules |

## Security

- **Never trust client-side checks for authorization.** All admin operations are protected by:
  - Firebase Authentication
  - Firebase Security Rules
  - Server-side role validation

- The admin application frontend only controls presentation. Authorization is enforced by:
  - `firestore.rules` - Firestore access control
  - `storage.rules` - Firebase Storage access control
  - Cloud Functions (when deployed on Blaze plan)

## Deployment

The admin application should be deployed independently from the main SATHI application.

### Firebase Hosting

```bash
firebase deploy --only hosting:admin
```

Configure `firebase.json` with a separate hosting target for the admin app.

### Other Options

- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting provider

## Documentation

- `docs/SECURITY.md` - Security standards and practices
- `docs/DATABASE_SCHEMA.md` - Firestore collection schemas
- `docs/firestore.rules` - Production security rules
- `docs/storage.rules` - Firebase Storage rules

## Maintenance

- Admin app dependencies are separate from the main app
- Run `npm audit` regularly in both `/` and `/admin`
- Keep Firebase SDK versions synchronized between both apps
- Update `firestore.rules` and `storage.rules` from the root directory
