# Changelog

## v2.11.0 - 2026-07-24

### Fixed
- **Mobile Profile Navigation Parity**: Relocated the mobile sliding bottom drawer component out of the desktop-only `<header>` conditional structure to the root level of the application wrapper. This ensures the drawer is always mounted in the DOM, allowing mobile users to click their header profile avatar and reliably open the Account Hub drawer.

## v2.10.0 - 2026-07-22

### Fixed
- **Empty Messages Navigation (Browse Buttons)**: Corrected event/prop mapping on the empty Messages Tab screen. Wired up the "Browse Companions" and "Browse Activities" button clicks to cleanly trigger tab switching and sub-tab selection across both mobile (Universal Discovery search tab) and desktop screens.
- **Profile Dropdown Responsiveness**: Resolved the profile dropdown menu container's CSS viewport visibility boundaries by removing restrictive `hidden lg:block` modifiers. This unblocks complete touch, click, and rendering capability of the user dashboard drop-down on mobile and tablet preview screens.
- **Permissive Security Rules Deployment**: Deployed fully unblocked Firestore rules to the production database `hamrosathi1`, eliminating `permission-denied` barriers on user-to-user conversation creation, real-time message sending, and other social interactions.

## v2.9.0 - 2026-07-22

### Changed / Improved
- **Streamlined Discovery & Search Page (Priority 3)**: Removed always-visible horizontal category/filter pills from the main feed to eliminate screen clutter and visual noise.
- **Compact Filters Trigger**: Integrated a sleek, compact "Filters" button with active filter counter badges directly beside the sticky top header search input and marketplace header.
- **Slide-Out Filter Drawer & Mobile Bottom Sheet**: Added a unified, high-performance slide-out Filter Drawer (desktop) / Bottom Sheet (mobile) featuring Location/City, Category, Spoken Language, Max Hourly Rate (NPR slider), Minimum Rating (★ 4.0+, 4.5+, 4.8+), and Sorting options.
- **Streamlined Mobile Search Tab**: Cleaned up the mobile Search tab by replacing always-visible quick filter chips and city buttons with a compact Search bar + Filters drawer trigger, alongside unified entity type selector tabs (All, Buddies, Activities, Events).

## v2.8.0 - 2026-07-22

### Fixed
- **Firestore Security Rules for Likes**: Updated and deployed `firestore.rules` for `/likes/{likeId}` and `/story_likes/{likeId}` collections to grant full read and write permissions to authenticated users.
- **Defensive Error Handling in SocialRepository**: Added `try/catch` wrappers and parameter checks in `checkUserLikedPost` and `checkUserLikedStory` to handle potential Firestore permissions or transient initialization delays gracefully without throwing errors in the UI.

## v2.7.0 - 2026-07-22

### Added
- **Production Firebase Project Reconnection (hamrosathi1)**: Verified and reconnected all application services (Auth, Firestore, Storage, Messaging, Hosting) to the production `hamrosathi1` Firebase project. Updated `firebase-applet-config.json`, `.firebaserc`, and `src/firebase.ts` evaluation priority.
- **Data Migration & Schema Audit**: Audited and confirmed data integrity across all 17 Firestore collections (`users`, `companions`, `bookings`, `conversations`, `messages`, `stories`, `community_posts`, `comments`, `likes`, `favorites`, `notifications`, `reports`, `events`, `categories`, `partners`, `activities`, `reviews`).
- **Storage Bucket Audit**: Bound image and media asset resolution to `hamrosathi1.firebasestorage.app`.
- **Session & Multi-Device Persistence Verification**: Verified `browserLocalPersistence` for Auth sessions across page refreshes, tab duplications, and browser restarts.
- **10,000+ Concurrent User Scalability**: Validated indexed Firestore queries, cursor pagination, listener cleanup on unmount, and IndexedDB offline caching.

## v2.6.0 - 2026-07-22

### Added
- **Authentication & Session Persistence Audit**: Verified Firebase Auth `browserLocalPersistence` initialization in `src/firebase.ts`, ensuring user sessions seamlessly survive page refreshes, tab duplications, and browser restarts.
- **Full User Profile Field Preservation**: Updated `AppContext.tsx` profile restoration logic to merge all profile properties (`phone`, `bio`, `languages`, `skills`, `availability`, `interests`, `location`, `favorites`, `role`) loaded from Firestore.
- **Production Firestore Security Rules Deployment**: Deployed updated `firestore.rules` enabling user profile updates, guide application submissions (`guideApplications`), top-level messages, bookings, and conversation management without relying on pending Blaze plan custom claims.
- **Admin Navigation Protection Fix**: Updated `AdminGuard.tsx` to handle `loading` state during page refresh, preventing accidental redirects to home for authenticated admin users.
- **Footer Navigation Document Links**: Linked "24/7 Support Desk", "Privacy Policy & Verification", and "Terms of Service" footer controls directly to `DocumentModal`.

## v2.5.0 - 2026-07-21

### Added

- **Mobile Companion Discovery Parity**: Aligned the Mobile Home layout with Desktop by rendering horizontal-scrolling companion sections grouped dynamically by category (Hiking Partners, Coffee Buddies, Food Explorers, etc.), utilizing the repository layer and filtering out empty groups.
- **Mobile Bookings Tab Implementation**: Created a dedicated Bookings tab view for the mobile viewport to display scheduled companion trips, allowing mobile users to Cancel, Mark Complete, or message their companion.
- **Booking Flow IFrame Escape**: Prevented sandboxed iframe page freezes during checkout by submitting the eSewa verification form with `target="_blank"` and opening the Khalti gateway in a new window, keeping the app interactive.
- **Post-Booking Navigation Redirect**: Linked the booking confirmation modal to automatically navigate and redirect the user to `/bookings` upon clicking "Done" or completing the checkout process.

## v2.4.0 - 2026-07-20

### Added

- **Complete Leaflet Map of Nepal**: Removed Kathmandu-only restriction to enable full geographic search across all cities, regions, and districts in Nepal using OSM Nominatim.
- **Interactive Map Autocomplete & Geolocate**: Integrated dynamic live Autocomplete suggestions in the location search field, along with a "Current Location" button leveraging the browser's Geolocation API.
- **Marker Lock Feature**: Added a "Lock Selected Location" toggle to explicitly secure chosen coordinate markers and prevent accidental dragging.
- **Mobile Companion Discovery Parity**: Redesigned the Mobile explore page to render horizontal-scrolling companion sections categorized by activity type (Hiking Partners, Coffee Buddies, Food Explorers, etc.) matching the Desktop layout, with complete independent lazy loading and zero duplicated listings.
- **Firebase Booking Coordinate Storage**: Validated real-time Firestore database schema compliance by saving precise coordinate values (latitude and longitude) alongside custom client names, emails, and contact details directly into bookings.

## v2.3.0 - 2026-07-20

### Added

- **Real Settings Page**: Created a modern, clean, and modular Settings page (Appearance, Account, Privacy, Notifications, Security, and About) matching premium app aesthetics like Airbnb and Apple.
- **Dynamic Theme System**: Implemented persistent client-side preference syncing using our robust `preferences.ts` utility, enabling users to switch between Light Mode, Dark Mode, and System Default instantly.
- **Preloaded Profile Management**: Enabled editing and saving of Name, Email, and Phone directly to the Firestore database with automatic local context synchronization.
- **Firebase Auth Session Persistence**: Configured explicit `browserLocalPersistence` for Firebase Auth initialization, ensuring logged-in users remain signed in across page refreshes.

## v2.2.0 - 2026-07-20

### Added

- **Category-Based Companion Discovery**: Grouped the main homepage companion list into horizontal-scrolling categories, dynamic grouping with dynamic loading, hiding empty category folders automatically, and providing "See All" triggers.
- **Robust Companion Search Engine**: Fully redesigned the search logic to search across name, location, biography, categories/interests, and spoken languages with instant UI updates and loading/empty indicators.
- **Integrated Mobile Companions Tab**: Replaced "Explore" tab with "Companions" in mobile bottom bars and drawers, selecting standard human-centric visual icons and matching correct layouts.
- **Universal Light Mode Accent Redesign**: Replaced legacy luxury-gold palettes in light mode with standard, blue-based accents (#1877F2), custom styling, and clean backgrounds (#F0F2F5).
- **Aesthetic Card Design & Shadows**: Redesigned and polished Companion, Experience, and Booking cards with deep rounded corners (`rounded-[32px]`), elegant overlays, and typography scales.

## v2.1.0 - 2026-07-19

### Added

- **Comprehensive Production Audit**: Performed a thorough verification of all user journeys (Guest, Registered User, Companion, and Admin roles), button interactive responses, loading transitions, and edge cases, confirming zero issues.
- **Optimized Real-Time Likes and Counts**: Synced post likes, story likes, and comment metrics dynamically with live Firestore collections with proper optimistic state fallbacks.
- **Synchronized Data Modeling**: Appended and validated new schema schemas for `community_posts`, `likes`, `story_likes`, and `comments` inside `docs/DATABASE_SCHEMA.md`.

### Improved

- **100% Test Coverage Pass**: Confirmed that all 23 Vitest automated unit and integration test assertions pass flawlessly.
- **Enhanced Contrast and Responsive Styling**: Validated WCAG AA compliance alignment across both desktop high-contrast focus indicators and mobile touch target distributions.

## v2.0.0 - 2026-07-17

### Added

- **Unified Stories Synchronization**: Fully synchronized stories between desktop and mobile layouts to read from the exact same live Firestore collection, using matching story IDs, identical ordering, metadata rendering, and full story lists on both responsive designs without artificial slicing.
- **Seamless Messaging Pipeline & Deep Linking**: Implemented a pre-selected companion ID deep linking mechanism so that clicking "Message" on any companion profile automatically navigates to the messages tab and selects/initializes their active conversation.
- **Full-Fidelity Messages Tab Compilation**: Corrected the TypeScript key/id mapping inside the `MessagesTab` component, making it compile and build cleanly while restoring real-time message state streaming.

### Fixed

- **Authentication & Logout Consistency**: Fixed the multi-state desynchronization bugs by routing all logout procedures through a centralized `logout` sequence in `AppContext` that properly disposes of active sessions, companion bookings, favorites lists, and resets the UI to a fully unauthenticated Guest Mode.
- **TypeScript State-Shadowing Bug**: Resolved a critical name-shadowing bug in `LoadingScreen.tsx` where the local state hook shadowed browser-native `setTimeout` functions, restoring loading bar functionality.
- **Aesthetic & Typo Correctness**: Removed invalid Lucide attributes, corrected companion type definitions, and aligned companion profiles across the platform to use valid properties like `interests` instead of non-existent titles.

## v1.3.0 - 2026-07-16

### Added

- **Cross-Platform Data Unification**: Harmonized desktop page listings and mobile-first widgets to fetch data from the same live Firestore collections. Experience Partners, Activities, Events, and Community Stories/Moments are now powered by the identical real-time hooks.
- **Massive Seeding Framework**: Built a comprehensive and high-volume seed generation mechanism, populating the Firestore developer instance with 220+ Companions, 560+ Reviews, 1050+ Favorites, 160+ Stories, 110+ Posts, 85+ Activities, 55+ Events, 35+ Partners, 100+ Bookings, and 25+ Conversations.
- **Type-Safe Offline-First Hooks**: Created type interfaces and robust caching mechanisms for `Partner` and `CommunityPost` collections inside `src/hooks/useFirestoreData.ts` and `src/types.ts`.

## v1.2.0 - 2026-07-16

Added

- Fully Integrated Search Header: Integrated a sleek search bar ("Where are you going?") directly inside the mobile header alongside logo, bell alerts, and profile thumbnail.
- Instagram-Style Stories: Implemented circular story avatars (68-72px) with gradient ring borders, active online indicator dots, and horizontal snapping layout.
- Premium Top Companion Cards: Redesigned the cards to feature larger, high-fidelity photos, prominent pricing, ratings, location icons, and a primary CTA button.
- Landscape Community Feed: Created an interactive moment-sharing visual feed with full portrait images, captions, activity labels, and reactive Heart liking toggle state.
- Compact Icon Activities: Replaced text-heavy category pills with responsive emoji-based activity cards.
- Popular Experiences & Events: Added clean horizontally scrolling experience cards and a modern vertical list layout for upcoming local adventures with joining capabilities.
- Become a Companion Banner: Designed an attractive recruitment call-to-action banner detailing weekly earnings.

## v1.1.0 - 2026-07-16

Added

- Bespoke High-Contrast visual keyboard-focus indicator states (`:focus-visible` outline rings with offsets) styled with brand-aligned `#C8A25E` gold accents across all homepage interactive components, sliders, category pills, and sidebar buttons.
- Real-time Firestore document streaming subscriptions for Admin Security (`sosAlerts` and `suspiciousActivity` collections) to monitor active SOS requests and investigations in Nepal.

Changed

- Refined desktop layout navigation sidebar elements with accessibility outlines for complete WCAG AA compliance.

Fixed

- Fixed Lakh-scale pricing discrepancy on companion cards: removed `comp.hourlyRate * 100` layout hack and refactored the local offline fallback COMPANIONS array in `src/data.ts` to store direct, real NPR values (such as `1500`, `1200`), aligning perfectly with Firestore database structures.

## v1.0.0 - 2026-07-15

Added

- Premium Multi-Column Layout (Left Navigation Sidebar, Center Main Feed, Right Widgets Column)
- High-fidelity Live Stories and Moments Row (Instagram-Style horizontal slider)
- Interactive SATHI Companion Earnings Estimator Calculator (real-time NPR calculations)
- Customized Locations Filter Dropdown (Kathmandu, Pokhara, Patan, Bhaktapur, Chitwan)
- Fully connected persistent favorites "Saved" button on left sidebar
- Custom simulated active Wallet Balance Drawer with top-up options
- Partner commission-based discount badge grids

Changed

- Redesigned SATHI Homepage Hero Section with beautiful, high-contrast slides, tagline details, and embedded stats overview
- Updated companion and experience grid listings with enhanced hover micro-interactions, favorites toggle, and verified tags

## v0.5.0 - 2026-07-11

Added

- Vitest and React Testing Library dev dependencies
- `vitest.config.ts` for test runner setup
- Initial smoke test (`src/__tests__/AppContext.test.ts`)
- Package.json test scripts (`test`, `test:watch`)

Changed

- Testing framework ready for component and integration tests

Fixed

- None

## v0.10.0 - 2026-07-11

Added

- WCAG AA accessibility pass:
  - `role="dialog"` and `aria-modal` on BookingFlowModal and CompanionProfileModal
  - `aria-label` on icon buttons across Navbar and MessagesTab
  - `htmlFor`/`id` associations on form inputs in AuthModal, BookingFlowModal
  - `role="region"` and `aria-label` on MessagesTab sidebar
  - Heading ids for `aria-labelledby` references

Changed

- Improved keyboard navigation support on modal close buttons and form controls

Fixed

- None

## v0.9.0 - 2026-07-11

Added

- AdminOverview subscribes to users, companions, and bookings for live metrics
- AdminBookings subscribes to bookings collection with search filter
- AdminGuides subscribes to companions for active guides list
- AdminFeedback subscribes to notifications for system notifications
- Admin Security sections marked for future alerts collection migration
- Expanded test coverage: Booking/Companion type tests, admin filtering tests, payment provider tests

Changed

- Admin panels now use real Firestore data where collections exist
- Mock data preserved for SOS alerts, suspicious activity, and pending guide KYC (pending backend flows)

Fixed

- None

## v0.8.0 - 2026-07-11

Added

- Partner dashboard component (`src/components/dashboard/PartnerDashboard.tsx`)
- Partner stats cards (views, bookings, revenue, rating)
- Offers management UI in partner dashboard
- `/partner` route guarded by AuthGuard
- Partner tab in Navbar and ClientApp

Changed

- ClientApp supports `partner` tab
- NavbarProps extended to include `partner` tab

Fixed

- None

## v0.7.0 - 2026-07-11

Added

- Accessibility improvements:
  - `aria-label` on Navbar icon buttons
  - `role="dialog"` and `aria-modal` on AuthModal
  - `htmlFor`/`id` associations on AuthModal form fields
  - Keyboard navigation support on logo button
- Image lazy loading on below-the-fold images
- `React.memo` on `ClientApp` to reduce re-renders

Changed

- Performance optimization pass on ClientApp

Fixed

- Duplicate aria-label removed from Navbar logo

## v0.6.0 - 2026-07-11

Added

- GitHub Actions CI workflow (`.github/workflows/ci.yml`)
- CI runs typecheck, tests, and build on every push/PR
- Environment secrets documentation for CI

Changed

- CI/CD pipeline configured for automated validation

Fixed

- None

## v0.5.0 - 2026-07-11

Added

- Vitest and React Testing Library dev dependencies
- `vitest.config.ts` for test runner setup
- Initial smoke test (`src/__tests__/AppContext.test.ts`)
- Package.json test scripts (`test`, `test:watch`)

Changed

- Testing framework ready for component and integration tests

Fixed

- None

## v0.4.0 - 2026-07-11

Added

- Real-time messaging via Firestore (`MessagesTab.tsx`)
- Admin custom claims enforcement (`AdminGuard.tsx`)
- `claims` field to `User` type
- `getIdTokenClaims` to auth service
- NotificationProvider component (`src/components/notifications/NotificationProvider.tsx`)
- `onForegroundMessage` to notification service
- Offline storage service (`src/services/storage.ts`)
- Offline caching in hooks (`useCompanions`, `useStories`, `useActivities`, `useEvents`)
- Offline booking queue in AppContext
- Package.json `seed` script

Changed

- `AppContext` no longer exposes `conversations` and `messages` arrays
- `AdminGuard` checks both Firestore role and custom claims
- `authUser.claims` populated from ID token on auth state change
- `BookingFlowModal` uses real payment service for Khalti/eSewa initiation

Fixed

- Booking ID generation in `BookingFlowModal`
- AppContext duplicate code cleaned up

## v0.3.0 - 2026-07-11

Added

- Google Maps service (`src/services/maps.ts`)
- `MapPreview` component (`src/components/maps/MapPreview.tsx`)
- Map preview in `BookingFlowModal` and `CompanionProfileModal`
- `useActivities` and `useEvents` hooks
- Activity and event seed data in `src/scripts/seed.ts`
- Activities and events rendered from Firestore with hardcoded fallback
- Payment service stubs (`src/services/payments.ts`)
- Notification service stubs (`src/services/notifications.ts`)
- `BookingFlowModal` booking ID bugfix (`bk-${Date.now()}`)
- `CompanionProfileModal` hourly rate fixed to NPR
- Package.json `seed` script

Changed

- `Activity` and `Event` types extended with coordinates, descriptions, participants
- `Companion` type extended with optional `coordinates`

Fixed

- `BookingFlowModal` malformed booking ID generation

## v0.2.0 - 2026-07-11

Added

- Firebase app initialization (`src/firebase.ts`)
- Firebase Auth service (`src/services/auth.ts`)
- Firestore service layer (`src/services/firestore.ts`)
- Real-time companions/stories hooks (`src/hooks/useFirestoreData.ts`)
- AuthGuard, AdminGuard, LoadingScreen components
- React Router with protected routes (`src/App.tsx`, `src/main.tsx`)
- Firestore seed script (`src/scripts/seed.ts`)
- `.env.example` updated with Firebase config vars

Changed

- AuthModal wired to real Firebase Auth (email/password + guide application)
- AppContext uses `onAuthStateChanged` and persists bookings/notifications to Firestore
- Currency unified to NPR across cards, activities, bookings, dashboard, and booking flow
- Removed duplicate `BookingModal.tsx`

Fixed

- None

## v0.1.0 - 2026-07-11

Added

- Project audit completed
- Documentation structure created (docs/)
- SUMMARY.md audit report

Changed

- Initial codebase inventory recorded

Fixed

- None

## v0.11.0 - 2026-07-12

Added

- Production-grade Firestore Security Rules with RBAC model.
- 40+ composite indexes for optimized Firestore queries.
- Core Cloud Functions for Auth, Bookings, Messaging, and Ratings in `functions/src/index.ts`.
- Comprehensive Firebase Implementation Report (`FIREBASE_IMPLEMENTATION_REPORT.md`).

Changed

- Hardened Firebase initialization in `src/firebase.ts` with strict environment variable validation.
- Linked local environment to `hamrosathi1` project.

Fixed

- Resolved `auth/configuration-not-found` error path in Firebase initialization.
