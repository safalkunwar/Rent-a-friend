# Discovery UI refresh — September 15, 2026

## Scope and release status

Implemented locally at the owner's request to replace the current UI with simpler, taste-led discovery. This request explicitly permits consumer UI changes. No Firebase rules, indexes, Functions, production documents, payment settings or hosting were deployed in this UI session. Earlier dirty backend candidates and rollback work were preserved. This is not completion of the remaining product/security phases.

## What changed

- Home: SATHI navy/gold/white introduction, four clear intent shortcuts, editable interests, and the existing live-source mixed feed. No alternate Forest Graphite/Acid Mint palette or artificial recommendations.
- One Home renderer now serves desktop, tablet and mobile. The existing feed hook, category-row filling, pagination and opened-post components are reused. Removed the separate mobile item-rendering block and its tiny fixed-width companion cards. Only the visible responsive Home renderer mounts.
- Explore: one search/filter/results implementation across sizes replaces the previous map-first desktop catalog and separate mobile scripted itinerary suggestions. People, activities and events remain selectable. A collapsed map uses loaded, valid coordinates and is created on expansion; it does not claim live presence or user proximity. Community remains accessible at `/explore#community`; places/partners and support remain available through compact sections.
- Stable routes retained. Mobile People and Explore now navigate to actual URLs; activity shortcuts use `/explore#activities-section`. Sidebar Saved opens people results, not a different catalog. Removed redundant reviews navigation, inactive referral promotion, duplicate host promotion and unverified live dots. Alerts is deliberately retained in the existing mobile navigation; profile/dashboard remains in the avatar menu.
- Activity cards expose their real description and explicitly state that booking is unavailable there. Removed the misleading card-click “Filtered” success. Missing prices are not rendered as invented amounts. The people price slider's top position now explicitly means Any price instead of silently excluding rates over NPR 3,000; zero-rate selection is available.
- Story controls are keyboard buttons, and rings use SATHI colours. Story likes-only behavior and existing media/engagement services are unchanged. New Home save buttons use the existing favorite action; guests are asked to sign in.

## Personalization contract

`DiscoveryWelcome` reads `currentUser.interests` and available interest labels from already-loaded companion profiles. Save calls `AppContext.updateUserProfile({ interests })`, which already uses UserRepository and updates context after the write succeeds. An error retains the selection, pending saves disable controls, Cancel does not write, and guest clicks open authentication. The editor is keyed to account identity.

`useDiscoveryFeed` now resets its stabilized ordering after an explicit profile-location/interest change. Otherwise existing stable pagination semantics remain. Matching category labels receive the generator's existing preference boost; this is not machine learning, inferred behavioral tracking, guaranteed matching inventory or a global search. Choosing a category with no loaded match cannot create a result. No new collection, query, listener or local-only taste store was introduced.

## Verification

- Main suite: **316/316 tests across 37 files** passed with two workers, including seven new discovery tests. An initial unconstrained run timed out in one unchanged booking test; subsequent bounded-concurrency full runs passed without raising timeouts or changing that test.
- Focused final discovery/layout rerun: **9/9** passed after keyboard Story controls and guest save guard.
- TypeScript `npx tsc --noEmit`: passed.
- Vite/PWA build: passed; final application asset `index-Bdlm26MM.js`, ~1,961 kB / 514 kB gzip. Existing large-chunk warning remains.
- Local browser visual inspection: light-theme Home/Explore at 390px phone, 768px tablet and 1440px desktop. Checked activity shortcut URL/selection, search with no matches, Clear filters restoring results, community entry, and guest personalization opening sign-in. Resizing exposed the tiny-card problem, prompting shared Home rendering; its tablet/desktop result was rechecked. No account sign-in, profile write, like, comment, booking or upload was submitted to production during these checks.
- Browser preview: `http://127.0.0.1:3000/`. This reads the configured existing backend; loaded sample records are not proof of genuine marketplace inventory.

## Remaining limitations / release checks

- Authenticated interest save → refresh → persisted profile/reranked feed needs dedicated-account production acceptance. The new tests mock the persistence boundary; they are not deployed-rules proof.
- Existing favorite persistence is optimistic in AppContext and lacks acknowledged-write rollback; this session did not certify its failure behavior. The UI does not show a new “saved successfully” toast for that action.
- Physical installed PWA/native devices, dark-theme visual acceptance, screen-reader audit, 200% zoom and resize while composing a comment remain unverified. Changing responsive branches can remount an open feed panel; do not infer draft preservation across resizing from shared data logic.
- Sparse categories remain sparse. Row filling only uses real, matching loaded profiles. Source documents still include sample content, stale event dates and questionable user-authored claims; no cleanup/migration was performed.
- The existing generator may interleave related/fallback activities under a companion category. Search operates on bounded loaded windows and offers Load more rather than pretending to search the entire database.
- Booking/payment/staff authority, App Check, backup/restore and other prior release gates remain open. Do not deploy root rules or any security candidate as part of publishing this UI.

## Next step

September 15 follow-up: People results now use the existing primary-interest grouping hook, with category headings/counts and responsive grids. Each person appears once; search/filter/sort are applied first and subsequent pages merge through existing pagination. Four new grouping tests and eight existing search tests pass; TypeScript/build pass. Browser verified category rows and image proportions. No deployment or backend change; the full suite was not rerun for this follow-up.

Review the local design, perform dedicated-account interest persistence and responsive draft/device acceptance, then publish this matching app build if approved. Keep backend containment rollout decisions separate.
