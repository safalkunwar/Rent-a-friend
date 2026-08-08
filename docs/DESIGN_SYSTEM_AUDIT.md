# SATHI Design System Audit

## Overview
This audit evaluates the SATHI user interface against modern design systems (Apple Human Interface Guidelines, Airbnb, Instagram, Linear, and Notion). It identifies design inconsistencies, accessibility gaps, and usability friction points. It establishes the architectural path for our cohesive, lightweight, and accessible design system.

---

## 1. Identified Discrepancies & Issues

### A. Inconsistent Color System & Lack of Visual Hierarchy
*   **The Issue:** Gold (`#C8A25E`) is heavily overused as a primary background, border, text, and accent color. This makes SATHI feel like an old luxury-brand landing page rather than an active, friendly social experiences platform.
*   **Contrast Gaps:** In Light Mode, grey text on light-grey or tinted backgrounds falls short of WCAG AA requirements (4.5:1).
*   **Actionable Fix:** Map 90% of the UI to neutral shades (zinc, slate, and clean white). Assign 8% to a premium interactive brand Blue (`#2563EB`) for primary CTAs, active states, and links. Reserve 2% Gold (`#C69C3F`) strictly for status symbols: verified badges, premium companion status, and rating stars.

### B. Typography & Text Overweighting
*   **The Issue:** Bold text weights are overused everywhere, creating "typographic noise" and flattening hierarchy. Major headers, item titles, labels, and even body text share similar heavy styles.
*   **Actionable Fix:** Establish standard font weights:
    *   **Display / Hero Titles:** Font weight `700` (bold) only for main screen headings.
    *   **Section Headers:** Font weight `600` (semibold) for section headers.
    *   **Buttons & Primary Controls:** Font weight `500` (medium) for readability.
    *   **Body & Descriptions:** Font weight `400` (regular) to optimize visual comfort.
    *   **Line-height Adjustments:** Set `leading-relaxed` (1.625) for description paragraphs to allow the content to breathe.

### C. Arbitrary Radii, Elevation & Shadows
*   **The Issue:** Element corners have mixed shapes (ranging from sharp 4px or 8px corners to extreme pills). Shadows are either heavy/dark or completely absent, leading to flat nesting (cards nested inside cards) without elevation cues.
*   **Actionable Fix:** Unify the spatial structure:
    *   **Container / Card Radius:** Standardize on `20px` (`rounded-3xl`) for cards and principal sections.
    *   **Interactive Controls (Buttons/Inputs) Radius:** Standardize on `12px` (`rounded-xl`) to `16px` (`rounded-2xl`).
    *   **Subtle elevation:** Re-engineer shadows to be almost invisible but deep. E.g., `box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04)`.

### D. Inconsistent & "Dead" Button Layouts
*   **The Issue:** Buttons use divergent designs across different modals, sidebars, and main lists. Hover, focus, and press states lack micro-animations, making the app feel static and unresponsive.
*   **Actionable Fix:** Develop a unified `<Button />` component supporting standard variants: `primary` (blue), `secondary` (outlined), `ghost` (transparent), `danger` (red), and `success` (green) with built-in micro-animations (`whileTap={{ scale: 0.98 }}`).

### E. Rigid Responsive Behaviors
*   **The Issue:** Desktop navigation, sidebar controls, and details screens can squeeze onto mobile viewports without adopting proper native mobile postures (like sliding bottom sheets or full-screen overlays).
*   **Actionable Fix:** Leverage clean responsive breakpoints (`sm:`, `md:`, `lg:`) and use our new mobile tab-locking logic to render beautiful native-like drawer/sheet animations for mobile views.

---

## 2. Refactoring Strategy

We will build modular, reusable design system components in `/src/components/ui/`:
1.  **`Typography`**: To enforce correct line height, tracking, and weight.
2.  **`Surface`**: Solid layout containers for background elevation.
3.  **`Card`**: Elevated cards with 20px border radius, soft borders, and generous padding.
4.  **`Button`**: Accessible buttons with clear visual feed back (hover/active/disabled/loading).
5.  **`Input`**: Soft, Apple/Linear-inspired input fields.
6.  **`Badge`**: Micro chips with consistent color scales.
7.  **`Avatar`**: Beautiful, rounded avatar containers with status ring options.
8.  **`Modal`**: Smooth, accessible screen dialog overlay.
9.  **`Sheet`**: Bottom drawer (mobile) or sliding panel (desktop).

We will then bind SATHI's global style sheets and core layout files to use these design components and styles. This ensures complete consistency without breaking any business logic, API connections, or Firebase services.
