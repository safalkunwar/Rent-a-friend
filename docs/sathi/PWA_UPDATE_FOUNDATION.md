# PWA update foundation — 2026-09-12

## Scope

SATHI now registers its generated service worker from one application component and treats a waiting worker as a user-controlled update. The app shows a refresh banner only after a replacement service worker is installed and waiting; it does not force an active browser/PWA session to reload.

## Why

The prior configuration used automatic update activation with no UI state. That made update timing opaque and did not provide a recovery path for an installed client that continued serving an old asset. The new path keeps the existing client controlling the page until the user chooses **Refresh SATHI**. The button sends Workbox's `SKIP_WAITING` message and reloads only after `controllerchange`.

## Deliberate limits

- This is not physical-device or installed-PWA acceptance. Browser/PWA/Capacitor testing remains required after release.
- It does not cache private Firebase data, alter App Check, change authentication, or replay writes.
- Refresh remains user initiated; the UI does not claim unsaved drafts/forms can be preserved across a reload.
- Service worker registration failures are non-fatal for ordinary web use.

## Verification

- `src/__tests__/pwa-update-prompt.test.tsx` verifies the update banner exposes refresh and defer actions.
- TypeScript completed with no errors.
- The production build generated `dist/sw.js`, `dist/workbox-dcdb27f2.js`, and `dist/manifest.webmanifest`. The emitted worker contains the `SKIP_WAITING` message listener used by **Refresh SATHI**.
- Post-release browser acceptance: install the current site, publish a version change, reopen/focus the installed app, confirm the banner, defer once, then choose refresh and verify the new bundle is served.
