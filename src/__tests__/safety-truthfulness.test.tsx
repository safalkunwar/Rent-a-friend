import React from 'react';
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SafetyWidget } from '../components/SafetyWidget';
const mocks = vi.hoisted(() => ({ create: vi.fn(), geo: vi.fn() }));
vi.mock('../services/sos', () => ({ sosService: { createAlert: mocks.create } }));
vi.mock('../services/identity', () => ({ requireUid: () => 'A' }));
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: mocks.geo } });
  mocks.geo.mockImplementation((success: PositionCallback) => success({ coords: { latitude: 27, longitude: 85 } } as GeolocationPosition));
});
afterEach(cleanup);
it('never claims tracking or contact delivery and acknowledges only a saved record', async () => {
  let resolve!: (id: string) => void;
  mocks.create.mockReturnValue(new Promise<string>(done => { resolve = done; }));
  render(<SafetyWidget />);
  expect(screen.queryByText('Live tracking enabled')).toBeNull();
  const button = screen.getByRole('button', { name: 'Save safety alert' });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Safety alert saved')).toBeNull();
  resolve('alert1');
  expect(await screen.findByText('Safety alert saved')).toBeTruthy();
  expect(screen.getByText(/No automatic contact notification/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Cancel SOS/ })).toBeNull();
});
it('preserves truthful failure state when the write fails', async () => {
  mocks.create.mockRejectedValue(new Error('Permission denied'));
  render(<SafetyWidget />);
  fireEvent.click(screen.getByRole('button', { name: 'Save safety alert' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText('Safety alert saved')).toBeNull();
});
it('does not write a location alert when geolocation fails', async () => {
  mocks.geo.mockImplementation((_success: PositionCallback, failure: PositionErrorCallback) => failure({ message: 'Location denied' } as GeolocationPositionError));
  render(<SafetyWidget />);
  fireEvent.click(screen.getByRole('button', { name: 'Save safety alert' }));
  await screen.findByRole('alert');
  expect(mocks.create).not.toHaveBeenCalled();
});
