import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { PWAUpdateBanner } from '../components/PWAUpdatePrompt';

test('PWA update banner leaves refresh timing in the user’s control', () => {
  const onUpdate = vi.fn();
  const onLater = vi.fn();
  render(<PWAUpdateBanner onUpdate={onUpdate} onLater={onLater} />);

  expect(screen.getByRole('status').textContent).toContain('A SATHI update is ready');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh SATHI' }));
  expect(onUpdate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss update for now' }));
  expect(onLater).toHaveBeenCalledTimes(1);
});
