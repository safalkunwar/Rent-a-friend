import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoinWalletPanel } from '../components/wallet/CoinWalletPanel';
import { claimWelcomeCoins, loadCoinWallet } from '../services/coinWallet';
import { AppProvider } from '../context/AppContext';
import { ToastProvider } from '../components/ui/Toast';

vi.mock('../services/coinWallet', () => ({
  loadCoinWallet: vi.fn(),
  claimWelcomeCoins: vi.fn(),
  addCoins: vi.fn(),
  exchangeCoins: vi.fn(),
}));

vi.mock('../services/auth', () => ({
  authService: {
    onAuthStateChanged: vi.fn((listener) => {
      listener({ uid: 'test-user', email: 'test@example.com', displayName: 'Test User', photoURL: '', claims: {} });
      return () => {};
    }),
  },
}));

vi.mock('../services/firestore', () => ({
  firestore: {
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('../repositories/UserRepository', () => ({
  userRepository: {
    updateFavorites: vi.fn(),
  },
}));

vi.mock('../services/profileBootstrap', () => ({
  loadAuthenticatedProfile: async (user: { uid: string }) => ({
    id: user.uid,
    name: 'Test User',
    email: 'test@example.com',
    avatar: '',
    role: 'customer',
    favorites: [],
    claims: {},
  }),
}));

vi.mock('../services/identity', () => ({
  requireUid: (expected?: string) => {
    if (expected && expected !== 'test-user') throw new Error('Account changed');
    return 'test-user';
  },
}));

vi.mock('../services/messaging', () => ({
  messagingService: {
    onConversationChange: vi.fn(() => () => {}),
    onNotificationChange: vi.fn(() => () => {}),
  },
}));

vi.mock('../repositories/CompanionRepository', () => ({
  companionRepository: {},
}));

vi.mock('../repositories/BookingRepository', () => ({
  bookingRepository: {},
}));

vi.mock('../repositories/SocialRepository', () => ({
  socialRepository: {
    uploadStory: vi.fn(),
  },
}));

const noWallet = { status: 'NO_WALLET' as const, entries: [] as [] };

function renderWithProviders(ui: React.ReactElement) {
  return render(<AppProvider><ToastProvider>{ui}</ToastProvider></AppProvider>);
}

describe('CoinWalletPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCoinWallet).mockResolvedValue(noWallet);
  });

  it('shows only a server-confirmed balance and keeps a missing wallet distinct from zero', async () => {
    renderWithProviders(<CoinWalletPanel />);

    expect(screen.getByRole('heading', { name: 'SATHI Coins' })).toBeTruthy();
    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(await screen.findByText('No Coins yet')).toBeTruthy();
    expect(screen.getByText('10 Coins = NPR 1')).toBeTruthy();
    expect(screen.queryByText(/^0(?: Coins)?$/)).toBeNull();
  });

  it('shows owner wallet activity and leaves commerce unavailable', async () => {
    vi.mocked(loadCoinWallet).mockResolvedValue({
      status: 'ACTIVE',
      availableCoins: 100,
      reservedCoins: 0,
      entries: [{
        id: 'grant-1', deltaCoins: 100, direction: 'CREDIT', purpose: 'NEW_USER_WELCOME',
        label: 'Welcome Coins', createdAtMillis: 1791849600000,
      }],
    });
    renderWithProviders(<CoinWalletPanel />);

    expect(await screen.findByText('100 Coins')).toBeTruthy();
    expect(screen.getByText('Welcome Coins')).toBeTruthy();
    expect(screen.getByText('Funded reward sources are not active.')).toBeTruthy();
    expect(screen.getByText('Profile unlock pricing and spending are not active.')).toBeTruthy();
    expect(screen.getByText('Cash redemption is turned off.')).toBeTruthy();
  });

  it('checks the welcome grant and refreshes from the owner wallet endpoint after a grant', async () => {
    vi.mocked(claimWelcomeCoins).mockResolvedValue({
      status: 'GRANTED', rewardId: 'grant-1', amountCoins: 100,
    });
    vi.mocked(loadCoinWallet)
      .mockResolvedValueOnce(noWallet)
      .mockResolvedValueOnce({ status: 'ACTIVE', availableCoins: 100, reservedCoins: 0, entries: [] });
    renderWithProviders(<CoinWalletPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Check welcome Coins' }));
    expect((await screen.findByRole('status')).textContent).toContain('100 welcome Coins were added');
    await waitFor(() => expect(loadCoinWallet).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('100 Coins')).toBeTruthy();
  });

  it('reports a funded campaign that has not been configured without inventing a balance', async () => {
    vi.mocked(claimWelcomeCoins).mockResolvedValue({ status: 'NOT_CONFIGURED' });
    renderWithProviders(<CoinWalletPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check welcome Coins' }));

    expect((await screen.findByRole('status')).textContent).toContain('Welcome Coins are not active');
    expect(screen.getByText('No Coins yet')).toBeTruthy();
  });
});