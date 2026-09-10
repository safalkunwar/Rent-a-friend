# Existing SATHI design tokens and extension rules

Source-derived 2026-09-09; target additions explicitly marked. `src/index.css` @theme maps semantic Tailwind names to CSS variables; `src/desktop-polish.css` contains scoped layout refinements. No replacement design system/library needed.

| Semantic token | Existing light | Existing dark |
|---|---|---|
| background | #F5F7FB | #0F1113 |
| surface / card | #FFFFFF | #17191C |
| surface-elevated | #EDF2F9 | #1E2124 |
| surface-hover | #E3EBF5 | #25282C |
| text-primary | #102A50 | #FFFFFF |
| text-secondary | #465B76 | #9BA1A8 |
| text-muted / placeholder | #60718A | #6B7280 |
| border | #D4DEEC | #2E3135 |
| primary-action / hover | #08265A / #123B78 | #C8A25E / #B69150 |
| gold-accent | #FFB511 | #C8A25E |
| verified | #08265A | #C8A25E |
| premium / rating | #8A5700 / #A56500 | #C8A25E / #F59E0B |
| success / warning / danger | #16A34A / #D97706 / #DC2626 | #22C55E / #F59E0B / #EF4444 |

Logo reference: `public/sathi-logo-circle.png` and existing SATHI logo assets. Navy handshake, gold accent and white surface reflected by current light tokens; no alternate palette. Gold is decoration/fill, not low-contrast essential text. Verification color does not confer verified evidence.

Typography: current Tailwind/system sans default; splash explicitly system-ui/-apple-system/Segoe UI. No bespoke font was verified. Target semantic scales reuse existing utilities: body14–16px, secondary12–14px, card title16–18px, section20–24px; avoid 9px operational/legal text. Nepali glyph fallback/line-height must be tested, not assumed. Body line height1.5, heading1.25 proposed; actual current utilities vary, migrate only touched components.

Spacing/radius: existing Tailwind utilities and desktop20px card gap/32px section spacing. Proposed token aliases space1/2/3/4/5/6/8 =4/8/12/16/20/24/32px; card radius16px, small control8–12px, modal24px, avatar/pill fully rounded. These are consolidation targets, not values already universally enforced. Keep CSS semantic shadow-sm/md/lg/2xl; light shadows are navy-tinted, existing overlays retain white text.

Buttons: current primary-action token, semantic danger, secondary surface/border, disabled unavailable text. One dominant CTA per card; loading retains width and accessible label. Icons: existing lucide-react, consistent stroke/16–24px, accessible names on icon-only controls; no new emoji-only status language. Story confirmation animation remains 750ms with reduced-motion behavior; keyboard like alternative always available.

Card families: compact people cards, standard activity/Event/offer cards, full media post/Story. Brand grammar shared, not identical aspect ratio forced onto every entity. Modal reuse must include title, scroll limits, body lock, focus management, labelled validation and action row; current visual Modal existence is not evidence all accessibility requirements pass.

Design QA is separate from business QA: contrast calculation, 200% zoom, focus, long labels, sparse/many rows, both themes and no horizontal overflow. Preserve current dark appearance while extending light tokens; no mass class rewrite. Manifest theme_color currently legacy #C8A25E and default preference dark: align platform chrome later with tested theme/PWA update, not silently in this documentation task.
