/** Presentation gate only. Firestore rules and backend eligibility remain authoritative. */
export const bookingV2PresentationEnabled = import.meta.env.VITE_BOOKING_V2_UI_ENABLED === 'true';

/** Local workflow gate until reviewer assignment and evidence policy are qualified. */
export const companionReviewEnabled = import.meta.env.VITE_COMPANION_REVIEW_ENABLED === 'true';
