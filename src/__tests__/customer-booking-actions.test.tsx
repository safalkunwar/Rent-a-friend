import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CustomerBookingActions } from '../components/bookings/CustomerBookingActions';
import type { Booking } from '../types';

afterEach(cleanup);

const booking = (status: Booking['status'], policyVersion?: number) => ({ id: 'booking-1', status, policyVersion });

it('keeps legacy bookings visible but never offers a client transition', () => {
  const onCancel = vi.fn();
  render(<CustomerBookingActions booking={booking('pending')} onCancel={onCancel} onShowToast={vi.fn()} />);
  expect(screen.getByText(/Earlier booking · view only/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  expect(onCancel).not.toHaveBeenCalled();
});

it('offers only legal customer cancellation and waits for its write', async () => {
  let finish!: () => void;
  const onCancel = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const onShowToast = vi.fn();
  render(<CustomerBookingActions booking={booking('confirmed', 2)} onCancel={onCancel} onShowToast={onShowToast} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Cancelling…' }).hasAttribute('disabled')).toBe(true);
  expect(onCancel).toHaveBeenCalledOnce();
  expect(onShowToast).not.toHaveBeenCalled();
  await act(async () => { finish(); });
  expect(onShowToast).toHaveBeenCalledWith('Booking cancelled', 'info');
  expect(screen.queryByRole('button', { name: /Mark Complete/i })).toBeNull();
});

it('reports a failed write without a false success and hides disallowed transitions', async () => {
  const onShowToast = vi.fn();
  render(<CustomerBookingActions booking={booking('pending', 2)} onCancel={vi.fn().mockRejectedValue(new Error('denied'))} onShowToast={onShowToast} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); });
  expect(onShowToast).toHaveBeenCalledWith('Could not cancel this booking. Please try again.', 'error');
  cleanup();
  render(<CustomerBookingActions booking={booking('active', 2)} onCancel={vi.fn()} onShowToast={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
});
