import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimiter } from '../services/rateLimiter';
import { auditService } from '../services/audit';
import { handleFirestoreError, OperationType } from '../services/firestore-errors';
import { getStoredPreferences, saveStoredPreferences, applyThemeMode, setupSystemThemeWatcher } from '../services/preferences';

describe('rate limiter', () => {
  beforeEach(() => {
    rateLimiter.clearAll();
  });

  it('allows request under limit', () => {
    expect(rateLimiter.check('key1')).toBe(true);
  });

  it('denies request over limit', () => {
    for (let i = 0; i < 30; i++) {
      rateLimiter.check('key1');
    }
    expect(rateLimiter.check('key1')).toBe(false);
  });

  it('resets limit after window expires', async () => {
    vi.useFakeTimers();
    rateLimiter.check('key1');
    expect(rateLimiter.check('key1')).toBe(true);
    for (let i = 0; i < 29; i++) {
      rateLimiter.check('key1');
    }
    expect(rateLimiter.check('key1')).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(rateLimiter.check('key1')).toBe(true);
    vi.useRealTimers();
  });

  it('resets specific key', () => {
    for (let i = 0; i < 30; i++) {
      rateLimiter.check('key1');
    }
    rateLimiter.reset('key1');
    expect(rateLimiter.check('key1')).toBe(true);
  });

  it('clears all buckets', () => {
    for (let i = 0; i < 30; i++) {
      rateLimiter.check('key1');
      rateLimiter.check('key2');
    }
    rateLimiter.clearAll();
    expect(rateLimiter.check('key1')).toBe(true);
    expect(rateLimiter.check('key2')).toBe(true);
  });
});

describe('audit service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('log calls firestore setDocument with timestamp', async () => {
    const setDocument = vi.fn();
    vi.doMock('../services/firestore', () => ({
      firestore: { setDocument },
    }));
    const { auditService } = await import('../services/audit');
    await auditService.log({
      action: 'test_action',
      actorId: 'admin1',
      actorName: 'Admin',
      targetType: 'user',
      targetId: 'u1',
    });
    expect(setDocument).toHaveBeenCalledTimes(1);
    const callArgs = setDocument.mock.calls[0];
    expect(callArgs[0]).toMatch(/^auditLogs\/audit_\d+_[a-z0-9]+$/);
    expect(callArgs[1].action).toBe('test_action');
    expect(callArgs[1].timestamp).toBeDefined();
  });

  it('list calls firestore getDocuments with correct options', async () => {
    const getDocuments = vi.fn().mockResolvedValue([]);
    vi.doMock('../services/firestore', () => ({
      firestore: { getDocuments },
    }));
    const { auditService } = await import('../services/audit');
    await auditService.list(50);
    expect(getDocuments).toHaveBeenCalledWith(
      'auditLogs',
      expect.objectContaining({
        orderByField: 'timestamp',
        orderDirection: 'desc',
        limitCount: 50,
      })
    );
  });
});

describe('firestore error handler', () => {
  it('gracefully handles permission denied on likes read', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = handleFirestoreError(new Error('Missing or insufficient permissions'), OperationType.GET, 'likes/l1');
    expect(result).toBeUndefined();
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('gracefully handles permission denied on story_likes read', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = handleFirestoreError(new Error('permission-denied'), OperationType.LIST, 'story_likes');
    expect(result).toBeUndefined();
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('gracefully handles permission denied on community_posts read', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = handleFirestoreError(new Error('insufficient permissions'), OperationType.GET, 'community_posts/p1');
    expect(result).toBeUndefined();
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('throws on permission denied for non-target collection', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => handleFirestoreError(new Error('permission-denied'), OperationType.GET, 'users/u1')).toThrow();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('downgrades non-permission errors to warning', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    handleFirestoreError(new Error('network error'), OperationType.GET, 'users/u1');
    expect(consoleWarn).toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('captures auth info in error details', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('permission-denied');
    try {
      handleFirestoreError(error, OperationType.UPDATE, 'bookings/b1');
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      const details = JSON.parse(message);
      expect(details.operationType).toBe('update');
      expect(details.path).toBe('bookings/b1');
      expect(details.authInfo).toBeDefined();
    }
    consoleError.mockRestore();
  });
});

describe('preferences service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when no stored preferences', () => {
    const prefs = getStoredPreferences();
    expect(prefs.theme).toBe('dark');
    expect(prefs.language).toBe('en');
    expect(prefs.pushNotifications).toBe(true);
  });

  it('merges stored preferences with defaults', () => {
    localStorage.setItem('sathi_user_preferences', JSON.stringify({ theme: 'light', language: 'ne' }));
    const prefs = getStoredPreferences();
    expect(prefs.theme).toBe('light');
    expect(prefs.language).toBe('ne');
    expect(prefs.pushNotifications).toBe(true);
  });

  it('saves and retrieves partial preferences', () => {
    const updated = saveStoredPreferences({ theme: 'light' });
    expect(updated.theme).toBe('light');
    expect(updated.language).toBe('en');
    const stored = JSON.parse(localStorage.getItem('sathi_user_preferences') || '{}');
    expect(stored.theme).toBe('light');
  });

  it('applies light theme', () => {
    const root = document.documentElement;
    applyThemeMode('light');
    expect(root.classList.contains('theme-light')).toBe(true);
    applyThemeMode('dark');
    expect(root.classList.contains('theme-light')).toBe(false);
  });

  it('returns cleanup function from system theme watcher', () => {
    const originalMatchMedia = window.matchMedia;
    (window as any).matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
    const onChange = vi.fn();
    const cleanup = setupSystemThemeWatcher(onChange);
    expect(typeof cleanup).toBe('function');
    cleanup();
    window.matchMedia = originalMatchMedia;
  });
});
