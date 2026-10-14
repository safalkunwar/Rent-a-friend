import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoinWalletPanel } from '../components/wallet/CoinWalletPanel';
import { claimWelcomeCoins, loadCoinWallet } from '../services/coinWallet';

vi.mock('../services/coinWallet', () => ({
  loadCoinWallet: vi.fn(),
  claimWelcomeCoins: vi.fn(),
}));

const noWallet = { status: 'NO_WALLET' as const, entries: [] as [] };

describe('CoinWalletPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCoinWallet).mockResolvedValue(noWallet);
  });

  it('shows only a server-confirmed balance and keeps a missing wallet distinct from zero', async () => {
    render(<CoinWalletPanel />);

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
    render(<CoinWalletPanel />);

    expect(await screen.findByText('100 Coins')).toBeTruthy();
    expect(screen.getByText('Welcome Coins')).toBeTruthy();
    expect(screen.getByText('Funded reward sources are not active.')).toBeTruthy();
    expect(screen.getByText('Coin purchases are not active.')).toBeTruthy();
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
    render(<CoinWalletPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Check welcome Coins' }));
    expect((await screen.findByRole('status')).textContent).toContain('100 welcome Coins were added');
    await waitFor(() => expect(loadCoinWallet).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('100 Coins')).toBeTruthy();
  });

  it('reports a funded campaign that has not been configured without inventing a balance', async () => {
    vi.mocked(claimWelcomeCoins).mockResolvedValue({ status: 'NOT_CONFIGURED' });
    render(<CoinWalletPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check welcome Coins' }));

    expect((await screen.findByRole('status')).textContent).toContain('Welcome Coins are not active');
    expect(screen.getByText('No Coins yet')).toBeTruthy();
  });
});
