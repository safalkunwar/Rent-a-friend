import { vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/firebase', () => ({
  app: { name: '[DEFAULT]' },
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => vi.fn()),
  },
  db: {},
  storage: {},
  messaging: null,
  firebaseConfig: {},
}));

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => null),
  getToken: vi.fn(() => Promise.resolve(null)),
  onMessage: vi.fn(() => () => {}),
  onTokenRefresh: vi.fn(() => () => {}),
  isSupported: vi.fn(() => Promise.resolve(false)),
  deleteToken: vi.fn(() => Promise.resolve()),
}));

vi.mock('@firebase/messaging', () => ({
  getMessaging: vi.fn(() => null),
}));

if (typeof window !== 'undefined') {
  (window as any).matchMedia = (window as any).matchMedia || vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  });
}

const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn((...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('FirebaseError') || args[0].includes('messaging/unsupported-browser'))
    ) {
      return;
    }
    originalError.apply(console, args);
  });
  console.warn = vi.fn((...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('[SATHI Admin]')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

process.on('unhandledRejection', (reason: any) => {
  const message = reason?.message || reason?.toString?.() || String(reason);
  if (message.includes('messaging/unsupported-browser') || message.includes("doesn't support the API's required to use the Firebase SDK")) {
    return;
  }
  console.error('Unhandled Rejection:', reason);
});
