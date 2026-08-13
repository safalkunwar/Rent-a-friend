# Admin Setup Helper

Grant admin access to a Firebase user for the SATHI Admin Panel.

## Prerequisites

1. **Firebase Admin credentials** must be available:
   - Option A: Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account JSON path
   - Option B: Run `firebase login` and `firebase use --add` so the Firebase CLI can pick up credentials

2. **User must already exist** in Firebase Authentication.

## Usage

```bash
cd scripts
npm install
npm run grant-admin
```

You will be prompted for:
- User email or UID
- Admin role (default: `SUPER_ADMIN`)

## Supported Roles

- `SUPER_ADMIN`
- `PLATFORM_ADMIN`
- `SAFETY_ADMIN`
- `MODERATION_ADMIN`
- `SUPPORT_AGENT`
- `BOOKING_ADMIN`
- `FINANCE_ADMIN`
- `KYC_REVIEWER`
- `CONTENT_ADMIN`
- `ANALYTICS_ADMIN`
- `READ_ONLY_ADMIN`

## Security

- This script uses Firebase Admin SDK and must NOT be run in the browser.
- Never commit service account keys to the repository.
- This helper is intended for local development only.
