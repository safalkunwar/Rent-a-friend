import { useEffect, useRef, useState } from 'react';
import type { Booking } from '../../types';
import { canTransition } from '../../services/bookingPolicy';

interface Props {
  booking: Pick<Booking, 'id' | 'status' | 'policyVersion'>;
  onCancel: (id: string) => Promise<void>;
  onShowToast: (message: string, type: 'info' | 'error') => void;
}

/** Legacy history stays readable; only the existing v2 transaction can change a booking. */
export function CustomerBookingActions({ booking, onCancel, onShowToast }: Props) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  if (booking.policyVersion !== 2) {
    return <p className="text-xs text-text-secondary">Earlier booking · view only while records are reviewed.</p>;
  }
  if (!canTransition(booking.status, 'cancelled', 'booker')) return null;

  const cancel = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await onCancel(booking.id);
      if (mounted.current) onShowToast('Booking cancelled', 'info');
    } catch {
      if (mounted.current) onShowToast('Could not cancel this booking. Please try again.', 'error');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return <button type="button" onClick={() => { void cancel(); }} disabled={busy} aria-busy={busy}
    className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-60">
    {busy ? 'Cancelling…' : 'Cancel'}
  </button>;
}
