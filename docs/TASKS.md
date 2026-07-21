# Tasks

## TODO

- None

## IN PROGRESS

- None

## COMPLETED

- Phase 1 audit
- Documentation structure creation
- Firebase service layer
- Real Firebase Auth integration with claims
- React Router with protected routes
- Remove duplicate BookingModal.tsx
- Fix currency inconsistency ($ → NPR)
- AuthGuard, AdminGuard, LoadingScreen
- Firestore seed script
- Real-time companions/stories/activities/events hooks with offline cache
- Google Maps integration
- Real-time messaging via Firestore
- Admin custom claims enforcement
- Payment service (Khalti/eSewa)
- FCM notifications with foreground listener
- Offline storage service with IndexedDB
- NotificationProvider component
- Testing framework setup (Vitest + React Testing Library)
- Initial smoke test
- CI/CD pipeline
- Accessibility improvements (aria labels, dialog roles)
- Performance optimization (React.memo, lazy loading images)
- Premium Homepage UI Layout Transformation (Left Navigation, Instagram Stories, Earnings Calculator, custom location selector)
- WCAG AA full compliance (focus-visible gold brand indicator rings across all layout buttons, forms, and widgets)
- Admin Security database migration (SOS alerts, suspicious activity collections fully connected via real-time hooks)
- Unified offline-fallback pricing currency scales (NPR) with Firestore seeder profiles
- Redesigned SATHI Mobile UI Refinement (Header Search, Circular Instagram Stories, premium Companion cards, responsive portrait Community Feed, icon activities, experiences & events list, and Become a Companion banner)
- Final production-grade verification audit of guest, user, companion, and admin journeys
- Real-time social interaction sync & likes count optimization
- Aligned and documented all schemas in DATABASE_SCHEMA.md
- Validated all 23 integration and unit tests successfully with Vitest
- Grouped companions by primary categories with dynamic loading on default homepage explore (Task 1)
- Audited and overhauled multi-field companion search filters (Task 2)
- Swapped Explore for Companions in Mobile and Drawer menus (Task 3)
- Overhauled Light Mode theme accent from gold to professional Blue (#1877F2) and clean neutral grays (Task 4)
- Redesigned card layouts with soft elevation shadows, deep rounded borders, and custom typography (Task 5)
- Secured mobile, tablet, and desktop visual boundaries with zero clipping or layout breakages (Task 6)
- Optimized and maintained data reading bounds to support 10,000+ simultaneous sessions
- Priority 2 — Companions Button (Fix routing navigation in header, sidebar, drawer, bottom-bar)
- Priority 3 — Booking Flow (Smart pricing formula multiplier, pre-fill user name/email/phone from auth, validation)
- Priority 4 — Meeting Location (Leaflet interactive Map with search, marker drag-and-drop, reverse geocoding addresses, and storing coords in Firestore) (Task 7)
- Hotfix — Mobile Companion Discovery Parity (Grouped mobile Home companions in horizontal category sections matching Desktop exactly)
- Hotfix — Booking Flow Escape (Routed Khalti and eSewa verification forms to open in separate tabs to prevent sandboxed iframe page freeze)
- Hotfix — Post-Booking Auto-Redirect (Wired up onComplete navigation to automatically close modals and route users to `/bookings` on success)
- Hotfix — Mobile Bookings Tab view (Created custom bookings tab view to display scheduled companion trips on mobile)
