import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callable: vi.fn(),
  getBlob: vi.fn(),
  getDocs: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    session: { role: 'super_admin' },
    hasPermission: () => true,
  }),
}));

vi.mock('firebase/storage', () => ({
  getBlob: mocks.getBlob,
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: mocks.httpsCallable,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  getDocs: mocks.getDocs,
  limit: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ app: {}, db: {}, storage: {} }));

import { AdminWelcomeCoinIdentity } from '../pages/AdminWelcomeCoinIdentity';

describe('AdminWelcomeCoinIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDocs.mockResolvedValue({
      docs: [{
        id: 'claimant-uid',
        data: () => ({
          uid: 'claimant-uid',
          status: 'ESCALATION_PENDING',
          documentType: 'PASSPORT',
          evidence: { idPath: 'id.pdf', selfiePath: 'selfie.jpg' },
        }),
      }],
    });
    mocks.getBlob.mockRejectedValue(new Error('preview unavailable'));
    mocks.callable.mockResolvedValue({ data: { status: 'VERIFIED' } });
    mocks.httpsCallable.mockReturnValue(mocks.callable);
  });

  it('allows a super admin to approve an escalated case with the document number', async () => {
    render(<AdminWelcomeCoinIdentity />);

    expect(await screen.findByText('Claimant account: claimant-uid')).toBeTruthy();
    const documentNumber = screen.getByLabelText(/document number as shown/i);
    fireEvent.change(documentNumber, { target: { value: 'AB 123-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mocks.callable).toHaveBeenCalledWith({
      uid: 'claimant-uid',
      action: 'APPROVE',
      documentNumber: 'AB 123-456',
    }));
    expect((documentNumber as HTMLInputElement).value).toBe('');
  });

  it('clears the document number from component state when review fails', async () => {
    mocks.callable.mockRejectedValueOnce(new Error('review failed'));
    render(<AdminWelcomeCoinIdentity />);

    expect(await screen.findByText('Claimant account: claimant-uid')).toBeTruthy();
    const documentNumber = screen.getByLabelText(/document number as shown/i);
    fireEvent.change(documentNumber, { target: { value: 'AB 123-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect((await screen.findByRole('alert')).textContent).toContain('review failed');
    expect((documentNumber as HTMLInputElement).value).toBe('');
  });
});
