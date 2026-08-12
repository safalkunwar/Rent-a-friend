# Architecture

## Folder Structure

```
/
├── src/                      # SATHI user/companion application
│   ├── main.tsx
│   ├── App.tsx
│   ├── ClientApp.tsx
│   ├── context/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── data/
│   ├── scripts/
│   └── __tests__/
├── admin/                    # COMPLETELY SEPARATE ADMIN APPLICATION
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── firebase.ts
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── security/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── README.md
├── docs/
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── firebase.json
├── firestore.rules
├── storage.rules
├── firestore.indexes.json
└── README.md
```

## Application Boundaries

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

## Component Hierarchy

```
main.tsx
  App.tsx
    ├── AppProvider (Context)
    ├── ToastProvider (Context)
    └── App
       ├── ClientApp
       │    ├── Navbar
       │    ├── AuthModal
       │    ├── CompanionProfileModal
       │    │    └── BookingFlowModal
       │    ├── MessagesTab
       │    ├── DashboardTab
       │    ├── SafetyWidget
       │    └── [Story View, Community Moments, Events, etc.]
```

The admin application is completely separate and does not share components with the user app.
            ├── AdminSecurity
            └── AdminFeedback
```

## Authentication Flow

Current: Mock only
1. User clicks Login / Sign Up / Join as Guide
2. AuthModal opens
3. On submit, a local User object is created and stored in AppContext
4. No Firebase, no token, no server verification

Target:
1. Firebase Auth email/password or Google Sign-In
2. Firestore `users` collection for profile data
3. Custom claims for role-based access (customer, companion, admin)
4. Persistent auth state via Firebase SDK

## Booking Flow

Current:
1. CompanionProfileModal asks user to log in (mocked)
2. BookingFlowModal opens (date, time, duration, location, participants, requests)
3. Price summary shows service fee (10%)
4. Payment method selection (eSewa / Khalti) - UI only
5. Confirmation screen
6. Booking saved to local AppContext state only

Target:
1. Check companion availability via Firestore
2. Create booking document in `bookings` collection
3. Calculate platform commission server-side via Cloud Function
4. Initiate Khalti/eSewa payment SDK
5. Webhook verification updates booking status
6. Push notification to companion and user via FCM

## Messaging Architecture

Current:
1. MessagesTab renders conversations from AppContext
2. Mock conversations pre-seeded if none exist
3. sendMessage appends to local state
4. No persistence, no real-time, no read receipts

Target:
1. Firestore `messages` and `conversations` collections
2. Realtime listeners for instant updates
3. Typing indicators via presence
4. Message status (sent, delivered, read)
5. Media uploads via Firebase Storage
6. FCM for background notifications

## Admin Architecture

Current:
1. Hash change (`#admin`) toggles AdminApp
2. No auth check
3. Static mock data for all admin panels

Target:
1. Role-protected route using Firebase custom claims
2. Firestore-backed real data
3. Audit logging
4. Fraud detection rules via Cloud Functions

## Scalability & High-Concurrency Architecture (10,000 Concurrent Users Target)

SATHI is engineered with a multi-layered production architecture designed to scale seamlessly to **10,000+ concurrent active users**:

1. **Firestore Query Bounding & Indexing**:
   - Every collection read and real-time listener enforces `limitCount` bounds (`20`–`30` items).
   - Pre-compiled composite indexes (`firestore.indexes.json`) optimize filtering across `companions`, `community_posts`, `comments`, `conversations`, `messages`, `stories`, and `notifications`.
2. **Transactional Slot Lock Protection (`BookingRepository`)**:
   - High-concurrency booking reservations utilize atomic `runTransaction` execution with double-booking slot locks (`booking_locks/lock_{companionId}_{date}`).
3. **Optimized Messaging Architecture**:
   - Active listener isolation: Clients only listen to user-owned `conversations` and the currently open `selectedConvo` (bounded to 50 latest messages).
4. **Per-User Reaction Docs**:
   - Likes and reactions use isolated user reaction documents (`likes/${userId}_${postId}`) and atomic counter updates to avoid write lock bottlenecks on hot documents.
5. **Local Offline & Caching Layer (`storage.ts`)**:
   - Client-side IndexedDB / LocalStorage cache (`offlineStorage`) renders cached metadata instantly for low perceived latency while background queries delta sync.
6. **Lazy Asset Serving**:
   - Images use `SafeImage` with native `loading="lazy"` browser rendering to minimize mobile bandwidth egress.
