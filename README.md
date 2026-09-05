# SATHI - Nepal's Premier Social Experiences Marketplace

SATHI is an elite social experience platform connecting travelers with verified local companions for authentic cultural tours, chiya spots, and safe hikes across Nepal.

---

## 🌟 Key Architecture & Stack
* **Framework:** React 19 + TypeScript + Vite 6
* **Styling:** Tailwind CSS 4 (with modern light-luxury aesthetic tokens)
* **Icons:** Lucide React
* **Database & Auth:** Firebase (Firestore & Firebase Auth)
* **Animations:** Motion (from motion/react)
* **Interactive Maps:** Leaflet + OpenStreetMap Nominatim (MapPreview)

---

## Repository Layout
- / - main SATHI user app (port 3000)
- /admin - standalone SATHI admin app (port 3001) with 11 RBAC roles and its own build / Firebase init
- /functions - Cloud Functions (implemented; deployment paused - Blaze plan not active)
- /docs/ - operational docs; see also docs/sathi/ for the authoritative spec set
- /scripts/ - operational scripts (e.g. purge-fake-engagement.mjs, erify-auth-kyc.mjs)

## Status (2026-09-04)
- **164/164 tests passing** (126 in main app across 7 files, 38 in admin app across 5 files).
- Production Firebase project: hamrosathi1. All collections read/write strictly against live data.
- Deep-linkable community posts (/post/:postId), unified comment pipeline, deterministic cursor-paginated Home feed.
- Companion application / KYC flow shipped (docs/sathi/AUTH_KYC_ARCHITECTURE.md).
- Engagement integrity: 1,350 fake post-likes + 838 fake story-likes purged from hamrosathi1 on 2026-08-25.

## Documentation
Start with AGENTS.md (high-level briefing) and docs/sathi/CHANGELOG.md (session log). See docs/PROJECT_STATUS.md for the current phase and milestones.
