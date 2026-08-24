# 16 — Removed Features

**Last updated:** 2026-08-24
**Policy:** Features on this list were intentionally removed. They MUST NOT be reintroduced. Only features supported by project history/documentation are recorded — nothing is guessed.

---

## UI Removals (verified in code history / docs)

| Removed | Replaced by | Reason |
|---|---|---|
| **Duplicate `BookingModal.tsx`** | `BookingFlowModal.tsx` only | Overlapping deprecated component (BUG-004) |
| **Hash-based admin toggle** (`#admin` in main app) | Standalone `/admin` app | Security: bypassed real auth (BUG-002) |
| **Admin routes/links in main app** | Single deep link for `role==='admin'` only | Separation of concerns |
| **Legacy "Explore" mobile bottom tab** | "Companions" tab | Navigation clarity |
| **Legacy gold-accent light mode** | Blue accent (#1877F2), neutral #F0F2F5 | Visual consistency |
| **Always-visible horizontal category/filter pills on main feeds** | Filter Drawer (desktop) / Bottom Sheet (mobile) | Cleaner feed |
| **Static category chips (Hiking ☕ 📸 …) in the Activities section** | Real activity cards from the `activities` collection | "Activities part shows only activities" decision (2026-08) |
| **Duplicate "Popular Experiences" section** (mobile home) | Single "Activities" section | Deduplication |

## Standing UI Prohibitions (established decisions)

- **No search bar above Stories** (mobile home or desktop feed)
- **No logo above Stories**
- **No duplicate search bars** — one search surface per view: desktop header / mobile home header / DiscoveryFeed header component (which renders in the desktop context, not stacked with another bar)
- **No unnecessary duplicated navigation** surfaces
- **No fake production feed** — no hardcoded/seeded content in user-facing flows
- **No fake ratings/reviews** — ratings must derive from real `reviews` data
- **No automatic reshuffling of already displayed feed content** when new data arrives

## Known Fake-Data Violations To Clean Up (tracked, not yet fixed)

These exist in current code and are recorded honestly as debt — they are *violations of the no-fake-data rule*, not license to keep them:

- Wallet modal: hardcoded escrow balance (NPR 12,500.00) and fabricated ledger entries (`src/ClientApp.tsx`)
- Hardcoded "4.8" star rating on activity cards (should come from real data or be omitted)
- Hardcoded "NPR 5,000" referral narrative with no referral backend (UI may stay as marketing copy; must not be represented as a functioning reward)

## Architectural Removals

- No second Firebase project (any proposal is rejected by rule 2)
- No Supabase / Next.js / Flutter stack migration (explicitly rejected per project constitution)
- No Redux/global state library (React Context suffices; do not reintroduce)
- No unbounded Firestore queries (page-scaled limits today; cursor pagination is the required evolution, not optional)
