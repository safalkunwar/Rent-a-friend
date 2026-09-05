export interface BookingEligibilityUser {
  uid?: string;
  id?: string;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
}

export interface BookingEligibility {
  eligible: boolean;
  reasons: string[]; // human-readable blockers
}

/**
 * Centralized booking-eligibility check (single source of truth).
 * A user can book when: authenticated, account active, and the required
 * contact profile fields exist. Extend here — never in components.
 */
export function canBook(user: BookingEligibilityUser | null): BookingEligibility {
  const reasons: string[] = [];

  if (!user || (!user.uid && !user.id)) {
    reasons.push('Please log in to continue booking.');
    return { eligible: false, reasons };
  }

  if (user.status && user.status !== 'ACTIVE') {
    reasons.push('Your account is restricted. Contact support.');
  }

  if (!user.name || String(user.name).trim().length === 0) {
    reasons.push('Add your full name to your profile.');
  }

  if (!user.phone || String(user.phone).trim().length < 7) {
    reasons.push('Add a valid phone number to your profile.');
  }

  return { eligible: reasons.length === 0, reasons };
}
