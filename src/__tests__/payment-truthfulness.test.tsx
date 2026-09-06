import React from 'react';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BookingFlowModal } from '../components/modals/BookingFlowModal';
import { PaymentVerifyPage } from '../pages/PaymentVerifyPage';
import { EsewaVerifyPage } from '../pages/EsewaVerifyPage';
import { EsewaFailurePage } from '../pages/EsewaFailurePage';
import type { Companion } from '../types';

const mocks = vi.hoisted(() => ({ add: vi.fn(), toast: vi.fn(), initiate: vi.fn() }));
vi.mock('../context/AppContext', () => ({ useAppContext: () => ({
  currentUser: { id: 'A', name: 'Customer', phone: '9800000000', email: 'a@example.test' },
  addBooking: mocks.add, updateUserProfile: vi.fn(),
}) }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ showToast: mocks.toast }) }));
vi.mock('../components/maps/MeetingLocationSelector', () => ({ MeetingLocationSelector: ({ onLocationSelected }: { onLocationSelected: (address: string, coords: { latitude: number; longitude: number }) => void }) =>
  <button onClick={() => onLocationSelected('Meeting point', { latitude: 27.7, longitude: 85.3 })}>Choose location</button> }));
vi.mock('../components/maps/MapPreview', () => ({ MapPreview: () => null }));
vi.mock('../services/payments', async importOriginal => ({
  ...await importOriginal<typeof import('../services/payments')>(),
  paymentService: { initiatePayment: mocks.initiate },
}));
const companion = { id: 'C', name: 'Companion', hourlyRate: 100 } as Companion;
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);
async function review() {
  render(<BookingFlowModal companion={companion} onClose={vi.fn()} onComplete={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Choose location' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review Booking' }));
  return screen.findByRole('button', { name: 'Send unpaid booking request' });
}
describe('payment truthfulness', () => {
  it('sends one unpaid request and shows acknowledgement only after persistence', async () => {
    let resolve!: () => void;
    mocks.add.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    const button = await review();
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.add).toHaveBeenCalledTimes(1);
    expect(mocks.add.mock.calls[0][0]).toMatchObject({ status: 'pending', paymentStatus: 'not_started' });
    expect(screen.queryByText('Request Sent!')).toBeNull();
    expect(mocks.initiate).not.toHaveBeenCalled();
    resolve();
    expect(await screen.findByText('Request Sent!')).toBeTruthy();
    expect(screen.getByText(/No payment has been initiated/)).toBeTruthy();
  });
  it('failed persistence stays on review and retries with the same booking ID', async () => {
    mocks.add.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce('booking');
    fireEvent.click(await review());
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Connection lost', 'error'));
    expect(screen.queryByText('Request Sent!')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Send unpaid booking request' }));
    await screen.findByText('Request Sent!');
    expect(mocks.add.mock.calls[0][0].id).toBe(mocks.add.mock.calls[1][0].id);
    expect(mocks.initiate).not.toHaveBeenCalled();
  });
  it.each([PaymentVerifyPage, EsewaVerifyPage, EsewaFailurePage])('does not trust callback success or failure parameters', Page => {
    render(<MemoryRouter initialEntries={['/payment/verify?status=SUCCESS&paid=true&bookingId=other']}><Page /></MemoryRouter>);
    expect(screen.getByText('Payment verification required')).toBeTruthy();
    expect(screen.getByText(/cannot establish whether money moved/)).toBeTruthy();
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
