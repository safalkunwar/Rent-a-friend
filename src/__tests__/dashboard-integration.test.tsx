import React from 'react';
import { render, fireEvent, screen, cleanup, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DashboardTab } from '../components/dashboard/DashboardTab';
import type { User } from '../types';
const mocks = vi.hoisted(() => ({
  user: { id: 'C', name: 'Companion', email: 'c@example.test', role: 'companion', favorites: [], avatar: '' } as User,
  stats: vi.fn(), requests: vi.fn(), joined: vi.fn(), update: vi.fn(), local: vi.fn(), toast: vi.fn(),
  companions: [], events: [],
}));
vi.mock('../context/AppContext', () => ({ useAppContext: () => ({ currentUser: mocks.user,
  favorites: [], bookings: [], notifications: [], toggleFavorite: vi.fn(), setCurrentUser: mocks.local, updateUserProfile: mocks.update,
}) }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ showToast: mocks.toast }) }));
vi.mock('../hooks/useFirestoreData', () => ({ useCompanions: () => ({ companions: mocks.companions }), useEvents: () => ({ events: mocks.events }) }));
vi.mock('../services/companionDashboard', () => ({ companionDashboardService: { getStats: mocks.stats, getBookingRequests: mocks.requests } }));
vi.mock('../services/eventParticipants', () => ({ eventParticipantsService: { getUserJoinedEventSummaries: mocks.joined } }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.user = { id: 'C', name: 'Companion', email: 'c@example.test', role: 'companion', favorites: [], avatar: '' };
  mocks.stats.mockResolvedValue({ totalEarnings: 400, totalCompletedBookingValue: 400, pendingRequests: 1, profileViews: null });
  mocks.requests.mockResolvedValue([]); mocks.joined.mockResolvedValue([]);
});
afterEach(cleanup);
it('loads incoming requests by Auth-linked UID even when the companion is absent from discovery page one', async () => {
  render(<DashboardTab />);
  await waitFor(() => expect(mocks.requests).toHaveBeenCalledWith('C'));
  expect(screen.queryByText('Total Earnings')).toBeNull();
});
it('waits for the profile write and never announces a local-only save', async () => {
  let resolve!: () => void;
  mocks.update.mockReturnValue(new Promise<void>(done => { resolve = done; }));
  render(<DashboardTab />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
  const button = screen.getByRole('button', { name: 'Save Changes' });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
  expect(mocks.local).not.toHaveBeenCalled(); expect(mocks.toast).not.toHaveBeenCalled();
  resolve(); await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Profile updated', 'success'));
});
it('shows read failures as unavailable rather than zero earnings', async () => {
  mocks.stats.mockRejectedValue(new Error('Denied'));
  render(<DashboardTab />);
  expect(await screen.findByText('Companion statistics unavailable.')).toBeTruthy();
  expect(screen.queryByText('NPR 0.00')).toBeNull();
});
it('clears account-scoped incoming requests immediately on account switch', async () => {
  mocks.requests.mockResolvedValue([{ id: 'b', userName: 'Private customer A', status: 'pending', createdAt: '2026-09-05' }]);
  const { rerender } = render(<DashboardTab />);
  await screen.findByText('Private customer A');
  mocks.user = { ...mocks.user, id: 'D' };
  mocks.requests.mockReturnValue(new Promise(() => {}));
  await act(async () => { rerender(<DashboardTab />); });
  expect(screen.queryByText('Private customer A')).toBeNull();
});

it('keeps the profile form open when persistence fails', async () => {
  mocks.update.mockRejectedValue(new Error('Write denied'));
  render(<DashboardTab />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Write denied', 'error'));
  expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
  expect(mocks.local).not.toHaveBeenCalled();
});

it('renders customer empty states and joined-event read errors honestly', async () => {
  mocks.user = { ...mocks.user, role: 'customer' };
  mocks.joined.mockRejectedValue(new Error('Index missing'));
  render(<DashboardTab />);
  expect(await screen.findByText('Joined events unavailable.')).toBeTruthy();
  expect(screen.getByText(/No bookings yet/)).toBeTruthy();
  expect(screen.getByText("You haven't saved any companions yet.")).toBeTruthy();
  expect(mocks.requests).not.toHaveBeenCalled();
});
