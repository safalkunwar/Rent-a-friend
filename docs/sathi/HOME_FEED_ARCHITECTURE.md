# Home Feed Architecture

**Last updated:** 2026-08-25
**Scope:** Home page feed data flow shared by Web Desktop, Web Mobile, and the installed PWA.

---

## 1. Layer diagram (single source of truth)

```
Firebase (bounded cursor queries — one set per session)
        │
        ▼
Shared Home Data Layer        src/hooks/useFirestoreData.ts
  useCompanions / useStories / useActivities / useEvents /
  usePartners / useCommunityPosts
  • document-ID cursors (startAfter), page sizes 15/10
  • module session cache + in-flight request dedup
  • localStorage fast-paint before first batch merges
        │
        ▼
Shared Feed Composer          src/hooks/useDiscoveryFeed.ts
  → src/services/feedGenerator.ts  (generateDiscoveryFeed)
  → src/services/feedStabilizer.ts (stabilizeFeed)
  ONE mulberry32 seed per session (options.rng)
        │
        ▼
homeFeedItems: FeedItem[]     ← the ONLY feed order that exists
        │
        ▼
useProgressiveReveal          src/hooks/useProgressiveReveal.ts
  chunkFeedByHeader + reveal counter + sentinel/IO + load-more trigger
        │
   ┌────┴──────────────────┐
   ▼                       ▼
Desktop UI               Mobile UI
<DiscoveryFeed>          sequential renderer in ClientApp
(feedItems +             (homeReveal.revealedItems)
 visibleCategoryCount +
 sentinelRef props)      same revealedItems array
```

There is exactly **one composer, one composed array, one reveal/pagination brain**, instantiated once in `ClientApp.tsx` and consumed by both responsive subtrees.

## 2. Content types (`FeedItem` union)

| Type | Source collection | Rendered by |
|---|---|---|
| `companion` | `companions` | `CompanionCard` |
| `activity` | `activities` | inline activity card (desktop large / mobile compact) |
| `event` | `events` | inline event card |
| `story` (experience) | `stories` | `FeedStoryCard` → `SocialPostCard type="story"` |
| `post` (community) | `community_posts` (status=published) | `FeedPostCard` → `SocialPostCard type="post"` |
| `category-header` | generated | section header markup |

`FeedItem` entries carry `{ type, data, section?, category? }`. Tail-region entries additionally carry an internal `_tail: true` flag used only by the stabilizer.

## 3. Mixing algorithm

- Categories are grouped by companion interest, seeded-shuffled once per session, capped by `categoriesPerFeed`.
- Per category: related activities/events/stories/posts (2/2/1/2) are shuffled into a non-companion stream via weighted jittered `interleaveByType` (never two identical types adjacent).
- Companions are woven into that stream via `weaveCompanionsIntoStream`: gap allocation with **max 2 companions per gap**, adaptive budget `min(itemsPerCategory, itemsPerCategory-cap, relatedNonCompanionCount*2+3)`; overflow flows to leftovers.
- Leftover companions/activities/events/stories/**posts** form a tagged tail section woven the same way — community content is always inside the feed, never a separate platform-specific section.
- Global invariant: ≤2 consecutive same-type items while any alternative type remains in the loaded batch ⇒ **the 3-companion-row rule can never be violated when other content exists**.

## 4. The ≤3 consecutive companions rule

Enforced **inside the shared composer** (`feedGenerator.ts`), not in any UI layer. Both desktop and mobile receive already-compliant sequences; neither reorders afterward. Overflow companions are never duplicated — they surface later via leftover/tail paths or remain on the dedicated Companions page.

## 5. Desktop ↔ Mobile relationship

| Concern | Implementation | Shared? |
|---|---|---|
| Queries | `useFirestoreData` hooks ×1 in ClientApp | ✅ one set of reads/session |
| Composer | `useDiscoveryFeed` ×1 | ✅ one array |
| Chunking | `chunkFeedByHeader` (feedStabilizer) | ✅ same helper |
| Reveal state | `useProgressiveReveal` ×1 in ClientApp, passed to DiscoveryFeed as props | ✅ survives breakpoint resize (#13) |
| Sentinel/IO/load-more | inside the shared hook | ✅ no separate cursors |
| Post/story cards | `FeedSocialCards` (shared wrappers over `SocialPostCard`) | ✅ identical behavior |
| Companion/activity/event/event cards | same card components/markup, different size classes | presentation only |

Mobile renders `homeReveal.revealedItems` **in composer order** (sequential stacked layout). It performs zero regrouping, filtering, or reordering after composition.

## 6. Pagination & deduplication

- One coordinator `loadMoreHome()` advances all five collection cursors in one pass; per-collection single-flight guards + cross-instance in-flight promise dedup prevent simultaneous requests.
- Reveal-first semantics: scrolling reveals pending chunks of loaded data; cursors advance only when all loaded chunks are visible.
- Dedup by Firebase document ID at three layers: query merge (`mergeById`), generator `seenIds`, stabilizer key checks.

## 7. Stability strategy

- Session seed (`mulberry32`) created once per mount; every batch regeneration consumes the same stream ⇒ deterministic composition within a session; refresh reseeds.
- Append-only merge by ID everywhere; `stabilizeFeed` preserves previously displayed order across batch growth (tail-aware, orphan-preserving, deletion-safe).
- No `Math.random()` in render paths.

## 8. Firebase read profile

Initial Home load ≈ 65 docs across 5 bounded queries, 0 live listeners; each pagination step adds 10–15 docs/collection. Session cache prevents refetches on tab/remount navigation.
