# SATHI Master Specification

Last Updated: 2026-08-22

## 1. Current Architecture

SATHI is a dual-application platform:

- **Main Application** (`/src`): React + Vite + TypeScript + Tailwind CSS v4. Entry point: `src/main.tsx` → `src/App.tsx` → `src/ClientApp.tsx`.
- **Admin Application** (`/admin`): Completely separate Vite + React app with its own `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, and `src/` directory.
- Both apps share the same production Firebase backend (`hamrosathi1`) but have separate entry points, routing, UI, build processes, and deployments.

### Component Hierarchy (Main App)

```
main.tsx
  App.tsx
    ├── AppProvider (Context)
    ├── ToastProvider (Context)
    └── App
       └── ClientApp
            ├── Navbar
            ├── AuthModal
            ├── CompanionProfileModal
            │    └── BookingFlowModal
            ├── MessagesTab
            ├── DashboardTab
            ├── PartnerDashboard
            ├── SettingsTab
            ├── SafetyWidget
            ├── DocumentModal
            ├── ProfileEditModal
            ├── CreateStoryModal
            ├── DiscoveryFeed
            └── [Story View, Community Moments, Events, etc.]
```

### Admin App Boundaries

The admin app is completely separate and does not share components with the user app. It has its own Firebase initialization (`admin/src/firebase.ts`), routing, and build process.

## 2. Firebase Project

- **Project ID**: `hamrosathi1`
- **Firebase Services Used**: Auth, Firestore, Storage, Messaging, Hosting
- **Single Source of Truth**: All production data must come from `hamrosathi1`. No other Firebase project is authorized.
- **Environment Config**: `src/firebase.ts` loads config from `VITE_FIREBASE_*` env vars first, then falls back to `firebase-applet-config.json`, then hardcoded production defaults for `hamrosathi1`.

## 3. Authentication Architecture

- **Provider**: Firebase Auth
- **Methods**: Email/password, Google Sign-In
- **Persistence**: `browserLocalPersistence` (sessions survive browser restarts)
- **Roles**: `customer`, `companion`, `admin`
- **Authorization**: Custom claims + `firestore.rules` RBAC
- **Profile Restoration**: `AppContext.tsx` merges complete user profile fields from Firestore `users/{uid}` on auth state change
- **Session**: Multi-device and multi-tab independent sessions without session locks

## 4. Firestore Collections and Relationships

### Core Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | Customer and companion profiles | uid, name, email, avatar, role, phone, bio, languages, skills, availability, interests, location, favorites, fcmToken |
| `companions` | Companion/guide listings | id, userId, name, age, gender, bio, hourlyRate, rating, reviewsCount, isVerified, location, coordinates, languages, interests, images, availableDays, responseRate, trustScore |
| `bookings` | Booking records | id, companionId, userId, date, time, duration, participants, status, totalPrice, platformFee, companionPayout, meetingPoint, specialRequests, paymentMethod, paymentStatus, paymentId |
| `conversations` | Chat threads | id, participantIds, lastMessage, unreadCount |
| `messages` | Chat messages | id, conversationId, senderId, text, mediaUrls, type, isRead |
| `reviews` | User reviews for companions | id, companionId, userId, bookingId, rating, text, date |
| `notifications` | In-app notifications | id, userId, title, message, type, isRead, link |
| `events` | Local events/meetups | id, title, description, date, time, location, coordinates, spots, participants, imageUrl, createdBy |
| `stories` | Community experience stories | id, companionId, userId, imageUrl, caption, likes, comments, createdAt |
| `activities` | Activity catalog | id, title, description, duration, avgPrice, imageUrl, companionCount, category |
| `community_posts` | Travel community posts | id, userId, title, content, category, imageUrl, status, userAvatar, userName, likesCount, commentsCount, sharesCount, reportsCount, location |
| `likes` | Likes on community posts | id (composite userId_postId), userId, postId |
| `story_likes` | Likes on experience stories | id (composite userId_storyId), userId, storyId |
| `comments` | Comments on community posts | id, postId, userId, userName, userAvatar, text |
| `favorites` | User-saved companion profiles (subcollection under users) | companionId |
| `booking_locks` | Transactional slot locks | id (lock_{companionId}_{date}), companionId, date, bookingId, status |
| `presence` | Real-time online/offline status | userId, status, lastSeen |
| `guideApplications` | Companion guide applications | id, userId, status, documents, submittedAt, reviewedAt, reviewerId |
| `reports` | User-generated content reports | id, reporterId, targetType, targetId, reason, status |
| `sosAlerts` | Emergency SOS alerts | id, userId, location, coordinates, status, emergencyContacts |
| `suspiciousActivity` | Security incident logs | id, userId, type, description, ipAddress, userAgent, severity, status |
| `admins` | Admin role assignments | uid, role, permissions |
| `auditLogs` | Immutable audit trail | id, action, actorId, actorName, targetType, targetId, details, timestamp |

### Key Relationships

- `users` → `bookings` (1:N as user)
- `users` → `messages` (1:N as sender)
- `users` → `notifications` (1:N)
- `users` → `favorites` (1:N subcollection)
- `companions` → `bookings` (1:N)
- `companions` → `reviews` (1:N)
- `bookings` → `booking_locks` (1:1 slot lock)
- `conversations` → `messages` (1:N)
- `community_posts` → `likes` (1:N)
- `community_posts` → `comments` (1:N)
- `stories` → `story_likes` (1:N)

## 5. User / Mobile / Admin Data Flow

### User App Data Flow

1. **Auth State**: `AppContext` subscribes to Firebase Auth state changes
2. **Profile Loading**: On auth state change, loads/merges user profile from `users/{uid}`
3. **Data Fetching**: `useFirestoreData.ts` hooks provide real-time Firestore subscriptions with offline caching:
   - `useCompanions()` → `companions` collection, `limitCount: 30 * page`
   - `useStories()` → `stories` collection, ordered by `createdAt desc`, `limitCount: 20 * page`
   - `useActivities()` → `activities` collection, `limitCount: 20 * page`
   - `useEvents()` → `events` collection, `limitCount: 20 * page`
   - `usePartners()` → `partners` collection, `limitCount: 20 * page`
   - `useCommunityPosts()` → `community_posts` where `status == 'published'`, ordered by `createdAt desc`, `limitCount: 20 * page`
4. **Offline Cache**: All hooks cache results in IndexedDB via `offlineStorage` and render cached data immediately while background sync occurs
5. **Feed Generation**: `useDiscoveryFeed` combines all data sources through `generateDiscoveryFeed()` to produce a mixed discovery feed

### Admin App Data Flow

1. **Auth**: Separate Firebase Auth initialization in `admin/src/firebase.ts`
2. **RBAC**: `useAdminAuth` hook enforces role-based permissions
3. **Data**: Real Firestore data with bounded queries (`limitCount` 20-30)
4. **Aggregation**: `aggregationService` provides precomputed platform metrics with 5-minute refresh cycles
5. **Health**: `healthService` monitors Firestore, Auth, Storage every 30 seconds

## 6. Home Feed Architecture

### Mixed Discovery Feed

The home feed is a **mixed discovery feed** generated by `generateDiscoveryFeed()` in `src/services/feedGenerator.ts`. It is NOT a rigid Companion → Event → Activity pattern.

### Feed Generation Logic

1. **Category Grouping**: Companions are grouped by their primary `interest` category
2. **Category Selection**: Categories are randomly shuffled, then top `categoriesPerFeed` are selected (default 3, max 6)
3. **Content Mixing**: Within each category, items are mixed from multiple types:
   - Companions (shuffled, up to `itemsPerCategory`)
   - Activities (category-matched, up to 2)
   - Events (category-matched, up to 2)
   - Stories (category-matched, up to 1)
   - Posts (category-matched, up to 2)
4. **Randomization**: Category items are shuffled before insertion
5. **Type Caps**: Per-type limits prevent any single content type from dominating:
   - Companions: max 30% of feed
   - Activities: max 20%
   - Events: max 20%
   - Stories: max 15%
   - Posts: max 15%
6. **Deduplication**: Items are deduplicated by ID across the entire feed
7. **Scoring**: Activities and events are scored by location match, category match, and freshness

### Critical Constraints

- **NO rigid pattern**: Feed does NOT follow Companion → Event → Activity
- **Stable existing content**: New data must not randomly reorder existing displayed content
- **Mixed types**: All content types appear together in a single unified feed

## 7. Companion / Event / Activity / Community Architecture

### Companion Discovery

- **Desktop**: `DiscoveryFeed` component renders category headers with companion grids
- **Mobile**: Inline rendering in `ClientApp.tsx` with horizontal scrolling companion cards per category
- **Filtering**: Filter drawer (desktop) / bottom sheet (mobile) with city, category, language, rate, rating, sort
- **Search**: Real-time search across name, location, bio, interests, languages

### Events

- Displayed in home feed as mixed feed items
- Also shown in dedicated "Upcoming Events" section on mobile home tab
- Users can join/leave events via `eventParticipantsService`
- Event button states: Join, Joined, Full

### Activities

- Displayed in home feed as mixed feed items
- Also shown in dedicated "Activities" horizontal scroll section on mobile home tab
- Activities are Firestore-backed with category field

### Community (Posts, Stories, Likes, Comments)

- **Posts**: `community_posts` collection, filtered by `status == 'published'`
- **Stories**: `stories` collection, ordered by `createdAt desc`
- **Likes**: Optimistic UI with Firestore sync via `SocialRepository`
- **Comments**: Real-time via Firestore with create/delete operations
- **SocialPostCard**: Unified component for both posts and stories

## 8. Current Pagination / Loading Behavior

### Data Hooks

All `useFirestoreData` hooks accept a `page` parameter:

```typescript
export const useCompanions = (page = 1) => { ... limitCount: 30 * page ... }
export const useStories = (page = 1) => { ... limitCount: 20 * page ... }
export const useActivities = (page = 1) => { ... limitCount: 20 * page ... }
export const useEvents = (page = 1) => { ... limitCount: 20 * page ... }
export const usePartners = (page = 1) => { ... limitCount: 20 * page ... }
export const useCommunityPosts = (page = 1) => { ... limitCount: 20 * page ... }
```

### Discovery Feed Pagination

`useDiscoveryFeed` scales with `page`:

```typescript
maxItems: 60 * page,
categoriesPerFeed: Math.min(3 + page, 6),
itemsPerCategory: Math.min(6 + page * 2, 12),
```

### Progressive Loading

- **Desktop (`DiscoveryFeed.tsx`)**: Sentinel-based loading. When sentinel enters viewport (+200px buffer), `visibleCategoryCount` increments by 1. Starts at 2 categories.
- **Mobile (`ClientApp.tsx`)**: Scroll-based loading. When sentinel enters viewport (+200px buffer), `visibleMobileCategoryCount` increments by 1. Starts at 2 categories.
- Both reset to 2 when `feedItems` changes.

### Important Notes

- **NO cursor-based pagination**: The `page` parameter scales limits but does NOT use `startAfter` cursors
- **Realtime subscriptions**: All data is fetched via `onSnapshot` real-time listeners, not one-time queries
- **Cache-first**: Offline cache is rendered immediately, then background sync updates

## 9. Desktop / Mobile Architecture

### Desktop (`lg:` and above)

- **Layout**: Fixed left sidebar (256px) + main content area + optional right sidebar (`xl:`)
- **Navigation**: Left sidebar with 16+ navigation items
- **Search**: Header search bar with filter drawer
- **Home Feed**: `DiscoveryFeed` component with category headers and mixed content
- **Profile**: Top-right dropdown with 16 options

### Mobile (`lg:hidden`)

- **Layout**: Single column with bottom navigation (5 tabs: Home, Search, Companions, Messages, Alerts)
- **Navigation**: Bottom tab bar + sliding profile drawer (16 options)
- **Search**: Integrated into mobile home header
- **Home Feed**: Inline rendering in `ClientApp.tsx` with:
  - Instagram-style stories row
  - Dynamic category-based feed with horizontal scrolling
  - "Activities" horizontal scroll section
  - "Upcoming Events" list
  - "Become a Companion" CTA banner
- **Progressive Loading**: Scroll-based category reveal

### Parity Constraints

- Desktop and mobile **must use the same business/data logic**
- Responsive UI may differ visually, but functionality must remain equivalent
- Mobile has additional static sections (Activities, Upcoming Events) not present in desktop `DiscoveryFeed`

## 10. Existing Working Features

### Authentication & User Management
- ✅ Firebase Auth email/password and Google Sign-In
- ✅ Session persistence via `browserLocalPersistence`
- ✅ Profile restoration from Firestore on auth state change
- ✅ Role-based access (customer, companion, admin)
- ✅ Custom claims enforcement

### Data & Real-time
- ✅ Firestore real-time subscriptions for all main collections
- ✅ Offline caching via IndexedDB (`offlineStorage`)
- ✅ Deduplication by ID
- ✅ Graceful empty states

### Companion Discovery
- ✅ Category-based companion grouping
- ✅ Real-time search across name, location, bio, interests, languages
- ✅ Filter drawer/bottom sheet (city, category, language, rate, rating, sort)
- ✅ Favorites/saved companions

### Feed & Content
- ✅ Mixed discovery feed with category grouping
- ✅ Per-type content caps (30% companion, 20% activity, 20% event, 15% story, 15% post)
- ✅ Progressive loading on both desktop and mobile
- ✅ Instagram-style stories with online indicators
- ✅ Community posts with likes, comments, shares
- ✅ Experience stories with likes

### Booking & Payments
- ✅ Multi-step booking flow with map preview
- ✅ Meeting location selector with Leaflet/OpenStreetMap
- ✅ Payment service with Khalti REST API and eSewa form redirect initiation
- ✅ Wallet modal with escrow balance display
- ✅ Booking status management

### Messaging
- ✅ Real-time Firestore messaging
- ✅ Conversation list with unread counts
- ✅ Message sending/receiving
- ✅ Typing indicators subcollection

### Events
- ✅ Event listing and detail view
- ✅ Join/leave event functionality
- ✅ Event button states (Join, Joined, Full)

### Admin Panel
- ✅ Standalone admin app at `/admin`
- ✅ RBAC with 11 granular roles
- ✅ User management (warn, restrict, suspend, ban)
- ✅ Booking management (confirm, reject, complete, cancel)
- ✅ Security & SOS operations center
- ✅ Reports center
- ✅ Aggregation & metrics service
- ✅ System health monitoring
- ✅ Rate limiting and idempotency
- ✅ Virtualized data tables

### UI/UX
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark/light theme support
- ✅ PWA with offline precaching
- ✅ Accessibility improvements (aria-labels, focus-visible, keyboard navigation)
- ✅ Toast notifications
- ✅ Document modals (Terms, Privacy, Help)

## 11. Known Broken Features

### Blocked on Firebase Blaze Plan
- ❌ Cloud Functions deployment (auth triggers, booking calculations, messaging webhooks)
- ❌ FCM push notifications (foreground listener works, background requires Cloud Functions)
- ❌ Server-side payment verification webhooks

### Partially Working
- ⚠️ Payment flow: UI complete, actual Khalti/eSewa gateway integration pending Blaze plan
- ⚠️ Map: Google Maps Static API via `MapPreview` component, Leaflet for meeting location selector
- ⚠️ Some tests exhibit intermittent timeouts (e.g., `services.test.ts` getDocuments timeout) - passes on rerun

### Desktop/Mobile Inconsistencies
- ⚠️ Mobile home tab has additional static sections ("Activities" horizontal scroll, "Upcoming Events" list, "Become a Companion" banner) not present in desktop `DiscoveryFeed`
- ⚠️ Desktop `DiscoveryFeed` shows stories as full-width `SocialPostCard` components, while mobile shows them as compact horizontal cards

## 12. Features Intentionally Removed (MUST NOT Be Reintroduced)

### Removed UI Components
- ❌ **Duplicate `BookingModal.tsx`**: Removed; only `BookingFlowModal.tsx` should exist
- ❌ **Hash-based admin toggle**: `#admin` route no longer toggles admin panel in main app
- ❌ **Admin routes/links from main app**: All admin navigation removed from user-facing app
- ❌ **Legacy "Explore" mobile tab**: Replaced with "Companions" tab in bottom navigation
- ❌ **Legacy gold accent light mode**: Replaced with modern blue accent (#1877F2) and neutral backgrounds (#F0F2F5)
- ❌ **Always-visible horizontal category/filter pills on main feeds**: Replaced with slide-out Filter Drawer (desktop) and Bottom Sheet (mobile)
- ❌ **Static category chips (Hiking, Coffee, Photography, etc.) in Activities section**: Replaced with actual activity cards from `activities` collection

### Architectural Decisions
- ❌ **No hardcoded mock data**: All data must come from Firestore `hamrosathi1`
- ❌ **No fake/seeded production data**: Development seed scripts exist but are not run in production
- ❌ **No stack migration**: Current stack (React + Vite + TypeScript + Tailwind CSS v4 + Firebase) is fixed
- ❌ **No Supabase/Next.js/Flutter migration**: Explicitly rejected per project constitution

## 13. Non-Negotiable UI Decisions

- Do NOT add a search bar above Stories
- Do NOT add a logo above Stories
- Do NOT create duplicate search bars
- Do NOT restore previously removed UI
- Desktop and mobile must use the same business/data logic
- Responsive UI may differ visually, but functionality must remain equivalent
- Do not introduce fake/seeded production data
- `hamrosathi1` remains the single Firebase source of truth

## 14. Home Feed Stability Requirements

- It is a **mixed discovery feed** — NOT a rigid Companion → Event → Activity pattern
- Existing displayed content must remain stable
- New data must not randomly reorder existing content
- Feed must maintain per-type caps to prevent domination by any single content type

## 15. Recommended Fix Order

1. **Pagination Consistency**: Implement true cursor-based pagination instead of scaled limitCount to prevent re-downloading data on page changes
2. **Desktop/Mobile Feed Parity**: Align mobile home tab sections with desktop `DiscoveryFeed` or vice versa
3. **Flaky Test Investigation**: Investigate and fix intermittent test timeouts in `services.test.ts`
4. **Blaze Plan Upgrade**: Enable Cloud Functions deployment for server-side booking calculations, payment webhooks, and FCM
5. **Payment Gateway Integration**: Complete Khalti/eSewa production integration after Blaze plan upgrade
