import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/AdminRepository', () => ({
  adminRepository: {
    listCompanions: vi.fn(async () => [{ id: 'legacy-profile', name: 'Existing profile', location: 'Kathmandu', isVerified: true }]),
    listGuideApplications: vi.fn(async () => [{ id: 'legacy-app', name: 'Existing applicant', location: 'Pokhara', appliedDate: '2026-01-01', status: 'pending' }]),
  },
}));

import { AdminGuides } from '../pages/AdminGuides';

describe('legacy guide administration', () => {
  it('shows historical data without fabricated KYC evidence or direct approval actions', async () => {
    render(<AdminGuides />);
    expect(await screen.findByText('Existing applicant')).toBeTruthy();
    expect(screen.getByText('Legacy verification flag: set', { exact: false })).toBeTruthy();
    expect(screen.getByText(/read-only view of historical guide records/i)).toBeTruthy();
    expect(screen.queryByText('doc_front_back.pdf')).toBeNull();
    expect(screen.queryByRole('button', { name: /approve|reject|verify|view/i })).toBeNull();
  });
});
