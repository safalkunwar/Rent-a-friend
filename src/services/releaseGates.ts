/** Presentation gate only. Firestore rules and backend eligibility remain authoritative. */
export const bookingV2PresentationEnabled = import.meta.env.VITE_BOOKING_V2_UI_ENABLED === 'true';

/** Local workflow gate until reviewer assignment and evidence policy are qualified. */
export const companionReviewEnabled = import.meta.env.VITE_COMPANION_REVIEW_ENABLED === 'true';

/** Claimant-wide sensitive ID collection stays disabled until the identity policy is cleared. */
export const welcomeCoinIdentityUiEnabled = import.meta.env.VITE_WELCOME_IDENTITY_ENABLED === 'true';
