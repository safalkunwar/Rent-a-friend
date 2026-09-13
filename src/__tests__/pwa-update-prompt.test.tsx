import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PWAUpdateBanner, PWAUpdatePrompt } from '../components/PWAUpdatePrompt';

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (originalServiceWorker) Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
  else Reflect.deleteProperty(navigator, 'serviceWorker');
});

function workerHarness({ controlled = true, waiting = true } = {}) {
  vi.stubEnv('PROD', true);
  const worker = Object.assign(new EventTarget(), { state: 'installing', postMessage: vi.fn() });
  const registration = Object.assign(new EventTarget(), {
    waiting: waiting ? worker : null,
    installing: worker,
    update: vi.fn().mockResolvedValue(undefined),
  });
  const container = Object.assign(new EventTarget(), {
    controller: controlled ? worker : null,
    register: vi.fn().mockResolvedValue(registration),
  });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
  return { worker, registration, container };
}

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

test('does not register a production worker during development', () => {
  const { container } = workerHarness();
  vi.stubEnv('PROD', false);
  render(<PWAUpdatePrompt />);
  expect(container.register).not.toHaveBeenCalled();
});

test('first install does not ask for an update or automatically activate a worker', async () => {
  const { container, registration, worker } = workerHarness({ controlled: false });
  render(<PWAUpdatePrompt />);
  await waitFor(() => expect(registration.update).toHaveBeenCalledTimes(1));
  expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  expect(screen.queryByRole('status')).toBeNull();
  expect(worker.postMessage).not.toHaveBeenCalled();
});

test('a waiting update stays inactive when the user defers it', async () => {
  const { worker } = workerHarness();
  render(<PWAUpdatePrompt />);
  await screen.findByRole('status');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss update for now' }));
  expect(screen.queryByRole('status')).toBeNull();
  expect(worker.postMessage).not.toHaveBeenCalled();
});

test('discovers a new waiting worker via updatefound and installed state', async () => {
  const { registration, worker } = workerHarness({ waiting: false });
  render(<PWAUpdatePrompt />);
  await waitFor(() => expect(registration.update).toHaveBeenCalled());
  expect(screen.queryByRole('status')).toBeNull();
  act(() => {
    registration.dispatchEvent(new Event('updatefound'));
    registration.waiting = worker;
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
  });
  expect(screen.getByRole('status')).toBeTruthy();
  expect(worker.postMessage).not.toHaveBeenCalled();
});

test('explicit refresh signals only the waiting worker and registers a one-shot controller handover', async () => {
  const { container, worker } = workerHarness();
  const listen = vi.spyOn(container, 'addEventListener');
  render(<PWAUpdatePrompt />);
  await screen.findByRole('status');
  expect(worker.postMessage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh SATHI' }));
  expect(worker.postMessage).toHaveBeenCalledTimes(1);
  expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  expect(listen).toHaveBeenCalledWith('controllerchange', expect.any(Function), { once: true });
});

test('failed service-worker registration does not block the page', async () => {
  const { container } = workerHarness();
  container.register.mockRejectedValue(new Error('Worker unavailable'));
  render(<PWAUpdatePrompt />);
  await act(async () => { await Promise.resolve(); });
  expect(screen.queryByRole('status')).toBeNull();
});

test('registration resolving after unmount does not attach update listeners', async () => {
  const { container, registration } = workerHarness();
  let resolve!: (value: typeof registration) => void;
  container.register.mockReturnValue(new Promise(complete => { resolve = complete; }));
  const listen = vi.spyOn(registration, 'addEventListener');
  const view = render(<PWAUpdatePrompt />);
  view.unmount();
  await act(async () => { resolve(registration); });
  expect(listen).not.toHaveBeenCalled();
  expect(registration.update).not.toHaveBeenCalled();
});
