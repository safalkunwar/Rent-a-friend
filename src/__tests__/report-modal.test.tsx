import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportModal } from '../components/modals/ReportModal';
import { ToastProvider } from '../components/ui/Toast';

const mocks = vi.hoisted(() => ({ submitReport: vi.fn() }));
vi.mock('../services/reports', () => ({ reportService: { submitReport: mocks.submitReport } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('confirms report receipt without promising a review response', async () => {
  mocks.submitReport.mockResolvedValue('report-1');
  render(<ToastProvider><ReportModal isOpen onClose={vi.fn()} targetType="companion" targetId="person-1" /></ToastProvider>);

  fireEvent.change(screen.getByLabelText('Reason *'), { target: { value: 'safety' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

  expect(await screen.findByText('Your report was submitted.')).toBeTruthy();
  expect(mocks.submitReport).toHaveBeenCalledWith(expect.objectContaining({ targetType: 'companion', targetId: 'person-1', reason: 'safety' }));
});
