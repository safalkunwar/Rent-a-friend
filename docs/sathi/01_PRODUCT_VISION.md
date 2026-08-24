# 01 — Product Vision

**Last updated:** 2026-08-24

SATHI ("friend" in Nepali) is a platform, not a website. It connects travelers and locals with verified companions for safe, non-dating cultural exchange and adventure.

---

## CURRENT IMPLEMENTATION (works today, on real Firebase `hamrosathi1`)

| Area | State |
|---|---|
| Companion discovery | ✅ Category-grouped mixed discovery feed, search, filters (city, language, rate, rating, sort), favorites |
| Authentication | ✅ Firebase Auth (email/password + Google), persistent sessions, RBAC roles |
| Booking flow | ✅ Multi-step UI with map preview and meeting-point selector; payment **initiation** exists, verification is not server-authoritative |
| Messaging | ✅ Real-time Firestore conversations with unread counts and typing indicators |
| Events | ✅ Listing, join/leave, capacity states (Join/Joined/Full) |
| Activities | ✅ Firestore-backed catalog shown in feed and dedicated sections |
| Community | ✅ Posts, stories, likes, comments with optimistic UI + Firestore sync |
| Admin panel | ✅ Standalone `/admin` app, 11 RBAC roles, audit logging, health monitoring |
| PWA | ✅ Offline precaching, IndexedDB offline cache for reads |

## FUTURE POTENTIAL (NOT yet implemented — must never be presented as working)

These are roadmap items. **None of them may be shown in the UI, claimed in docs, or demoed as functional until the complete backend-to-UI flow exists.**

- **Local companion discovery at scale** — multi-city, multi-country expansion beyond Nepal
- **Tourism & travel experiences** — packaged multi-day itineraries
- **Cultural experiences** — homestays, festivals, cooking, language exchange verticals
- **Activity marketplace expansion** — partner-supplied activities with revenue share
- **Events at scale** — paid tickets, capacity tiers, waitlists
- **Community monetization** — creator/companion content tiers
- **Companion income generation** — payout dashboards, tax documents, weekly settlement (target: NPR 15,000/week narrative already in UI; backend settlement is NOT built)
- **User referrals** — invite codes, attribution, fraud-checked rewards
- **Reward / diamond system** — earn/spend economy for engagement; **must be server-authoritative only**
- **Future mobile applications** — native wrappers sharing the same Firebase backend and business logic
- **Future payment integration** — full Khalti/eSewa production with server-side verification webhooks (blocked on Blaze plan)
- **Future geographic expansion** — India, Bhutan, Sri Lanka; i18n beyond EN/NE
- **Future international users** — multi-currency considerations (display currency may localize; ledger stays NPR)
- **Future partner/merchant ecosystem** — hotels, trekking agencies, equipment rentals

## Rule for Vision vs Reality

> If a feature appears in this "FUTURE POTENTIAL" list, it must NOT be represented anywhere in the product as implemented — no fake counters, placeholder dashboards with invented numbers, or hardcoded "success" states.

Known violations to eventually clean up (tracked in CHANGELOG): the Wallet modal currently displays a **hardcoded escrow balance and ledger** (NPR 12,500.00 etc.) — this is fake production data in a user-visible surface and must be replaced by real data or removed before commercial launch.
