# Testing

## Strategy

- Testing framework: Vitest + React Testing Library
- E2E framework: Playwright or Cypress (TBD)
- Component tests: React Testing Library
- Integration tests: Supertest against local API (future)
- Coverage target: 80% for new code

## Current State

- 93 passing tests across 5 test files
- Vitest configured with Firebase mocks and global setup
- Test files:
  - `src/__tests__/AppContext.test.ts` (6 tests)
  - `src/__tests__/client-services.test.ts` (37 tests)
  - `src/__tests__/services.test.ts` (17 tests)
  - `src/__tests__/admin.test.ts` (15 tests)
  - `src/__tests__/service-logic.test.ts` (18 tests)

## Test Coverage

### Unit Tests
- Rate limiter (allow, deny, reset, clear, window expiry)
- Audit service (log, list with Firestore mocks)
- Firestore error handler (permission denied, auth info capture)
- Preferences service (get, save, theme apply, system watcher)
- Admin service (role permissions, hasPermission)

### Integration Tests
- Firebase Auth initialization and config validation
- Firestore service layer (CRUD, pagination, subscriptions)
- Social repository (likes, comments, posts with optimistic updates)
- Booking repository (creation, transaction locks)
- Messaging service (conversations, messages)
- Search service (companions, activities, events)
- Review service (creation, stats aggregation)
- Presence service (online/offline tracking)
- Booking reminder service
- Offline message queue
- Location tracking service
- Companion dashboard stats
- Feature flags service
- Payment service types and validation

### Component/Context Tests
- AppContext (auth state, profile loading, logout)
- Auth modal (login, signup, guide modes)
- Admin guard (role checking, permission enforcement)

## Planned Test Plan

### Unit Tests
- Utility functions
- Context providers (AppContext, ToastContext)
- Helper functions in `data.ts` or future `services/`

### Component Tests
- Navbar (search, dropdown, mobile menu)
- AuthModal (form validation, state changes)
- CompanionProfileModal (favorite toggle, book/message handlers)
- BookingFlowModal (multi-step validation, price calculation)
- MessagesTab (send message, conversation selection)
- DashboardTab (stats rendering, favorites list)
- Admin tabs (data rendering, action handlers)

### Integration Tests
- Full booking flow (profile -> schedule -> payment -> confirmation)
- Search and filter behavior
- Auth state changes affecting UI
- Tab navigation and state

### Critical Flow Tests
- End-to-end booking creation
- Message send and receive
- Admin approval of guide
- SOS activation and cancellation

### Regression Tests
- Post-stabilization run on every PR
- Visual regression via Playwright screenshots (optional)

## Manual Test Checklist

- [x] Verify npm install, linting (`npm run lint`), and build (`npm run build`) succeed
- [x] Verify single production Firebase configuration (`hamrosathi1`) is active across Web, PWA, and Capacitor
- [x] Verify all tabs navigation works without UI flicker
- [x] Verify search filters companions dynamically
- [x] Verify booking modal opens and proceeds through steps with meeting location selector
- [x] Verify auth modal creates/logs in Firebase Auth users with profile sync
- [x] Verify messages tab opens, streams real-time updates, and marks conversations as read
- [x] Verify SOS widget activates and sends emergency coordinates to backend
- [x] Verify responsive behavior on mobile widths
- [x] Verify admin app builds independently on port 3001
- [x] Verify admin app has auth guard redirecting non-admins to main app
- [x] Verify main app builds independently on port 3000
- [x] Verify both apps share same Firebase backend without conflicts
