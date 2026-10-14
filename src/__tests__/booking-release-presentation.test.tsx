import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canDisplayCompanionApproval, canOfferV2Booking } from '../services/bookingEligibility';
import { CompanionCard } from '../components/companions/CompanionCard';
import { CompanionProfileModal } from '../components/modals/CompanionProfileModal';
import type { Companion } from '../types';

vi.mock('../context/AppContext', () => ({ useAppContext: () => ({ favorites: [], toggleFavorite: vi.fn(), currentUser: null }) }));
vi.mock('../components/maps/MapPreview', () => ({ MapPreview: () => null }));

const legacy = {
  id: 'old-profile-id', userId: 'real-uid', name: 'Legacy Person', age: 26, gender: 'other', bio: 'A local profile',
  hourlyRate: 1000, rating: 0, reviewsCount: 0, isVerified: true, location: 'Pokhara', languages: ['Nepali'],
  interests: ['Art'], imageUrl: '', availableDays: ['Monday'], verificationBadge: 'KYC_VERIFIED',
} as Companion;
const canonical = { ...legacy, id: 'real-uid', approvalApplicationId: 'app1' };

afterEach(cleanup);

describe('unreleased booking and approval presentation', () => {
  it('does not convert a historical verified flag into an approved badge or booking eligibility', () => {
    expect(canDisplayCompanionApproval(legacy, true)).toBe(false);
    expect(canOfferV2Booking(legacy, true)).toBe(false);
    expect(canDisplayCompanionApproval(canonical, false)).toBe(false);
    expect(canOfferV2Booking(canonical, false)).toBe(false);
    expect(canOfferV2Booking(canonical, true)).toBe(true);
  });

  it('keeps the current profile view truthful while the release gate is off', () => {
    render(<CompanionCard companion={legacy} layout="featured" />);
    expect(screen.queryByText('APPLICATION APPROVED')).toBeNull();
    cleanup();
    render(<CompanionProfileModal companion={legacy} onClose={vi.fn()} />);
    expect(screen.queryAllByRole('button', { name: 'Request to Book' })).toHaveLength(0);
    expect(screen.getAllByText(/Booking requests are unavailable while companion approvals are reviewed/)).toHaveLength(2);
    expect(screen.queryByLabelText('Application approved')).toBeNull();
    expect(screen.queryByText(/Usually responds in 1 hour/)).toBeNull();
  });

  it('supports keyboard dismissal and gives icon-only actions accessible names', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const view = render(<CompanionProfileModal companion={legacy} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close companion profile' });
    expect(document.activeElement).toBe(closeButton);
    expect(screen.getByRole('button', { name: 'Save Legacy Person' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Message Legacy Person' })).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    view.rerender(<CompanionProfileModal companion={null} onClose={onClose} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
