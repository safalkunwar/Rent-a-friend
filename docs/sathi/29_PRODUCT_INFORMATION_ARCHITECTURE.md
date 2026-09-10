# Product information architecture and UX

Target design derived from existing source and public guest desktop inspection on 2026-09-09. No screens or styling changed. Preserve the SATHI logo/light navy-gold-white identity and existing dark mode; not Forest Graphite/Acid Mint or a new visual brand.

## Current surfaces and smallest evolution

`App.tsx` owns /, /explore, /companions, /events, /messages, /bookings, /dashboard, /partner, /settings, /post/:postId, /story/:storyId, /event/:eventId, payment return pages and the embedded /admin/applications. ClientApp holds responsive navigation; standalone admin has own routing/build. Public desktop inspection shows sidebar, one header search, Stories under header, mixed feed, right Events/host/safety rail. Latest local companion density changes are not assumed to match deployed assets. Current mobile labels/route state are not consistent enough to justify simply renaming every route.

Final recommendation: retain stable URLs, evolve labels/capability tabs behind feature flags. Home becomes **For You** label at `/`; People label at existing `/companions` with Free Friends / Local Hosts / Guides tabs; Explore retains `/explore` for experiences/places/partners/offers; Events remains `/events`; Messages unchanged. Profile entry uses existing avatar/drawer and `/dashboard` for own account/provider tools; Settings remains settings, not a new identity. Bookings, Wallet, Notifications, Community remain reachable from profile/drawer and desktop sidebar, not removed to simplify a mockup. No return of a separate Event mobile bottom button previously removed without explicit owner approval.

Mobile bottom navigation: For You, People, Explore, Messages, Profile (five). Existing Alerts moves to current header bell/profile drawer with unread badge; migration must preserve deep-link/accessibility route and be approved with Phase10 UX acceptance. Events stays clearly available from Explore category and For You Event cards plus drawer. Desktop keeps familiar sidebar and introduces role-specific provider/organization switcher in account menu; role switch never changes Auth identity or grants permissions.

Agency and Partner dashboards are separately guarded route groups within the existing standalone operations application initially (e.g. its `/agency/:id/...`, `/partner/:id/...`), not separate Firebase projects or duplicated UI kits. Consumer `/partner` remains compatible, redirecting an entitled operator to operations origin or showing application/status for others. Retain embedded KYC route until standalone canonical workflow is proven, then redirect with no data rewrite. Actual deployment base/origin must be resolved Phase0; paths here are route groups, not an instruction to mount the standalone build under current Vercel `/admin` without configuration.

## Shared card grammar

| Slot | Rule |
|---|---|
| Entity badge | Free Friend / Local Host / Guide / Agency / Partner / Offer / Event; type is text, not color alone |
| Media | Existing SafeImage with honest fallback, preview variant, aspect ratio by card family |
| Identity/place | Display name, coarse service area/location; no public phone/KYC |
| Relevance | One factual reason: matched interest, selected area, genuine availability—not fabricated proximity |
| Price | NPR0 hangout; hourly/half/full/package NPR; offer min/cap; coin platform fee distinct from service price |
| Trust | Independent verified evidence badges with explanation/expiry, genuine completed-review count; unknown explicitly omitted |
| Primary action | View / Hangout Request / Request Booking / Claim Offer / Event Details; one primary action |
| Secondary | Save only if persisted, share canonical URL, report; no dummy success |

Reuse CompanionCard, DiscoveryFeed cards, SocialPostCard, FeedSocialCards, ContentDetail, EventActions, ExpandableText, SafeImage, Modal, existing form/toast/loading components. Shared view models supply type/price/eligibility/CTA across breakpoints. Do not embed a new pricing, QR, balance or eligibility calculation in a component.

Free Friend detail: clearly “Hangout fee NPR0”; first5 discovery entitlement and exact optional coin unlock cost, not a tip to person; interests/area/language/boundaries/verification; Hangout Request and pending/accepted/rejected state. No immediate Message before acceptance. Local Host detail: service mode/pricing/options/area and what is included. Guide detail: credentials status, visible responsible verified agency, approved price, specialties/languages, real reviews and safety terms. Agency profile: packages/guides/areas/licence summary/reviews, booking through agency. Partner detail: offer value/conditions/location/hours/menu/media above long prose. Unavailable business offers never show redeem CTA as functional.

## Critical flows and failure UI

- Booking: select service → eligibility blockers → quote/policy → request → agency/provider acceptance → payment only if enabled → verified status → trip/start QR → completion/review. Display no payment confirmed from return URL.
- Offer: numbered Claim / Enter Bill / Generate QR / Staff Confirms / Applied. QR has expiry/regenerate/status and says pending; corrected bill visible, never assume scan equals reward.
- Wallet: one available balance, reserved separately, source detail expandable, transactions and unknown/reconciling state. Disabled cash redemption explains prerequisite, never shows fake balance or withdrawal success.
- Verification: evidence checklist, private upload, review/change request, expiry warning, precise badge meaning. Rejected credential does not delete social account.
- Every command: loading, success only from canonical state, validation error, denied, unavailable/offline, unknown acknowledgment + status lookup, retry with original intent, cancelled. Preserve form contents after failure; no optimistic money/seat/approval.

## Responsive and accessibility specification

Consumer mobile-first; agency/partner/admin desktop-first but tablet/mobile-safe. Use one business/view-model path with layout-only adaptation. Existing desktop 1024px breakpoint and 280px utility rail can stay; compact people grids up to3 with lone cards capped, not stretched to full canvas. Forms become bottom-sheet/dialog based on viewport, not duplicated state machines. Tables use responsive row details/column priority; finance values never clipped or rounded inconsistently.

Keyboard traversal, visible semantic focus, labelled controls, 44px minimum touch targets as design target, accessible modal title/focus trap/return focus, escape/cancel safety, screen-reader mutation announcements, reduced motion and zoom checks. Never use gold on white for essential small text. Verify contrast with actual computed tokens; build success is not accessibility certification. No second search/logo block above Stories, no duplicate navigation, no fixed safety panel over action controls. Full card/service concepts map consistently across desktop/mobile/PWA; native permission sheets are platform-specific presentations only.

Acceptance: guest/member/provider/tenant role tasks on 390/768/1024/1440/1920 widths; resize during open form/comment, deep-link back/refresh, slow/offline/denied, long Nepali/English labels, no-data and sparse category rows, many organizations and missing evidence. Physical device/PWA/native checks must record actual build/OS, not screenshot emulation alone. [Tokens](32_DESIGN_TOKENS.md) defines shared style contract.
