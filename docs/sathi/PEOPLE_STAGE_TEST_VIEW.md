# People stage test view — 2026-09-15

## Delivered scope

Owner requested filler companions for testing and UI aligned with the product stages. Added a **development-only fixture preview**, not a production seed or a completed capability rollout.

Open `/dev/people-preview.html` on the local Vite server, or choose **Preview test companions · local only** in the People results. The main People page continues to show its configured backend data, never these fixtures as a network-error fallback.

24 fictional profiles cover four categories (Coffee Buddy, Hiking Partner, Food Explorer, Cultural Guide), six per category. Eight each are Free Friends, Local Hosts and Guides. Profiles have explicit test labels, initials instead of impersonated portraits, no Auth UIDs, no verified status, zero reviews/ratings and no invented live availability. Guide agency names are explicitly fictional.

## Stage mapping

| Roadmap phase | Test UI coverage | Not implemented by this preview |
| --- | --- | --- |
| 1 Identity/capabilities | Pending-review and unavailable examples | Verification commands, authority projection, identity evidence |
| 2 Free Friend / Local Host | Mode tabs, NPR 0 hangout fee, example host rate, distinct explanatory detail | Profile grants/daily quota, consent requests, message entitlements, host checkout |
| 4 Guides/agencies | Guide mode and fictional agency attribution | Licence checks, agency membership/consent, price approval |
| 10 Discovery | Category grouping, mode/search/state filtering, empty results, reset, preview detail, theme toggle | Server eligibility/ranking, production mode migration |

The UI has one Preview action per card. Detail explains the required future flow; hangout/booking actions are disabled. No save, message, review, payment or backend command is reachable from fixture cards. Theme/filter changes exist only in this isolated page session.

## Architecture and isolation

- `dev/people-preview.html` and `src/dev/peoplePreviewMain.tsx` form a separate Vite development entry. They do not mount AppProvider or initialize Firebase.
- Fixture data and filtering live in `src/dev/peopleFixtures.ts`; prototype presentation in `PeopleStagePreview.tsx` and its scoped CSS.
- Reuses `PeopleCategoryGroups` and `useCompanionCategories`; an optional card-render slot presents fixture metadata without modifying real companion schemas or inventing a service mode from legacy price/verification fields.
- Both the entry execution and the main-app preview link are guarded by `import.meta.env.DEV`. Current standard production build includes only the main HTML entry, not this development page.
- Verified production `dist` contains no `ui-fixture-`, `PeopleStagePreview`, test-count notice or preview URL, and no `dist/dev/people-preview.html`. If build inputs are later expanded, rerun this isolation check. Do not add this HTML to production build inputs or seed these fixtures into Firebase.

## Verification and limits

- New fixture/UI isolation tests: 5/5. Grouping regression tests: 4/4.
- Full main suite: **325/325 across 39 files**, using `npx vitest run --maxWorkers=2 --minWorkers=1 --reporter=dot`.
- `npx tsc --noEmit` and `npm run build`: passed. Existing large-chunk warning remains.
- Browser observed 24 marked profiles in category grids, Free Friends filter narrowing to eight (two per category), and Preview focusing an explanatory panel with disabled real action. No production write performed.
- Responsive CSS and theme control provided; physical-device, installed-PWA and exhaustive viewport/dark/assistive-technology acceptance are not certified here.

No deployment, production data repair, security change or commercial activation occurred. Review this stage-based design before adapting it to future authoritative service-mode data. All existing roadmap/backend gates remain open.
