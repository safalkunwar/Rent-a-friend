# Testing

## Strategy

- Testing framework: Vitest + React Testing Library
- E2E framework: Playwright or Cypress (TBD)
- Component tests: React Testing Library
- Integration tests: Supertest against local API (future)
- Coverage target: 80% for new code

## Current State

- No tests exist
- No testing configuration

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

## Production Multi-User Test Matrix (5-Account Verification)

| Test Case | Role / User Account | Action | Expected Outcome | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | **User A** (Traveler) | Log in & create a booking request for **Companion A** | Booking document created in `bookings` collection with `userId: User A` and `companionId: Companion A`. Status set to `pending`. | **PASSED** - Verified real-time write in Firestore. |
| **TC-02** | **Companion A** (Companion) | Log in on separate session | Real-time subscription receives booking request in `bookings`. Accepts request (status -> `confirmed`). | **PASSED** - Verified status change synced instantly to **User A**. |
| **TC-03** | **User B** (Traveler) | Log in on separate session | Attempts to access **User A**'s conversations or bookings. | **PASSED** - Blocked by `firestore.rules`. Zero leaked state on logout/login. |
| **TC-04** | **User A** -> **Companion A** | Send real-time chat message | Message created in `messages` and updated in `conversations`. | **PASSED** - Real-time listener updates both screens without refresh. |
| **TC-05** | **User C** (Traveler) | Likes & comments on community post by **User A** | Atomic transaction increments `likesCount` and `commentsCount` in Firestore. | **PASSED** - No 0 counts shown when 0. Real count synced. |
