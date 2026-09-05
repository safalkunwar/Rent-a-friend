# Bugs

| ID | Severity | Priority | Status | Description | Assigned | Fix Date |
|-----|----------|----------|--------|-------------|----------|----------|
| BUG-001 | High | P1 | Closed | `npm run build` and `npm run lint` fail (node/npm not in PATH or modules missing) | Lead Dev | 2026-07-15 |
| BUG-002 | High | P1 | Closed | No real authentication; hash-based admin toggle bypasses security | Lead Dev | 2026-07-15 |
| BUG-003 | High | P1 | Closed | Currency inconsistency: `$` on cards, `NPR` in booking flow | Lead Dev | 2026-07-15 |
| BUG-004 | Medium | P2 | Closed | `BookingModal.tsx` and `BookingFlowModal.tsx` are overlapping/deprecated | Lead Dev | 2026-07-15 |
| BUG-005 | Medium | P2 | Closed | `react-router-dom` installed but unused | Lead Dev | 2026-07-15 |
| BUG-006 | Medium | P2 | Closed | `express` installed but unused | Lead Dev | 2026-07-15 |
| BUG-007 | Medium | P2 | Closed | `@google/genai` installed but unused | Lead Dev | 2026-07-15 |
| BUG-008 | Medium | P2 | Closed | AdminKYCReview modal close sets `selectedGuide` but does not dispatch approval action | Lead Dev | 2026-07-15 |
| BUG-009 | Low | P3 | Closed | Inline SVGs in SafetyWidget replaceable with lucide icons | Lead Dev | 2026-07-15 |
| BUG-010 | Low | P3 | Closed | No SEO meta tags beyond `<title>` | Lead Dev | 2026-07-15 |
| BUG-011 | Low | P3 | Closed | No accessibility labels on icon-only buttons | Lead Dev | 2026-07-15 |
| BUG-012 | Low | P3 | Closed | `hide-scrollbar` utility not in global CSS (Tailwind v4 custom utilities need config) | Lead Dev | 2026-07-15 |
| BUG-013 | High | P1 | Closed | Rules-of-Hooks crash in `useCompanionCategories` (conditionally invoked in `ClientApp.tsx`) | Lead Dev | 2026-08-24 |
| BUG-014 | High | P1 | Closed | Notifications composite index `(userId, timestamp)` declared but never deployed; redundant single-field "composite" declarations rejected by API | Lead Dev | 2026-08-24 |
| BUG-015 | High | P1 | Closed | Corrupt PWA icon binaries (`icon*.jpg` / `apple-touch-icon.jpg`) caused generic launcher icon; replaced with `public/sathi-logo.jpeg` (1254×1254 PNG, maskable) | Lead Dev | 2026-08-24 |
| BUG-016 | High | P1 | Closed | `SocialPostCard` rendered stale `liked/likes/comments` state — first like toggle silently UNLIKED; counts frozen at fetch-time values | Lead Dev | 2026-08-25 |
| BUG-017 | High | P1 | Closed | Mobile users had no comment section in unified feed — `FeedPostCard` fell back to `window.prompt`; mobile block re-grouped items by category destroying composer order | Lead Dev | 2026-08-25 |
| BUG-018 | Medium | P2 | Closed | Inline comment field was a bare controlled `<input>` with no empty/whitespace guard, no submitting indicator, no double-submit guard, and no mobile scroll-into-view | Lead Dev | 2026-08-25 |
| BUG-019 | High | P1 | Closed | Fabricated engagement in `src/scripts/seed.ts` (1,350 fake post-likes + 838 fake story-likes + ~500 canned comments from demo personas) shipped in production `hamrosathi1`; purged via `scripts/purge-fake-engagement.mjs` | Lead Dev | 2026-08-25 |
| BUG-020 | Medium | P2 | Closed | `community_posts.likesCount` / `commentsCount` lacked non-negative validation in `firestore.rules` | Lead Dev | 2026-08-25 |
