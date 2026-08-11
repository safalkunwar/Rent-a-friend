import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasPermission, ADMIN_ROLES, ROLE_PERMISSIONS, type AdminRole } from '../services/admin';
import { rateLimiter } from '../services/rateLimiter';

describe('admin service', () => {
  describe('hasPermission', () => {
    it('returns false for null/undefined role', () => {
      expect(hasPermission(null, 'users.read')).toBe(false);
      expect(hasPermission(undefined, 'users.read')).toBe(false);
    });

    it('grants super_admin all permissions', () => {
      expect(hasPermission('super_admin', 'users.read')).toBe(true);
      expect(hasPermission('super_admin', 'roles.write')).toBe(true);
      expect(hasPermission('super_admin', 'audit.read')).toBe(true);
    });

    it('denies read_only_admin write permissions', () => {
      expect(hasPermission('read_only_admin', 'users.read')).toBe(true);
      expect(hasPermission('read_only_admin', 'users.write')).toBe(false);
      expect(hasPermission('read_only_admin', 'settings.write')).toBe(false);
    });

    it('grants kyc_reviewer kyc permissions', () => {
      expect(hasPermission('kyc_reviewer', 'kyc.read')).toBe(true);
      expect(hasPermission('kyc_reviewer', 'kyc.write')).toBe(true);
      expect(hasPermission('kyc_reviewer', 'users.read')).toBe(true);
      expect(hasPermission('kyc_reviewer', 'users.write')).toBe(false);
    });

    it('grants moderation_admin content permissions', () => {
      expect(hasPermission('moderation_admin', 'content.read')).toBe(true);
      expect(hasPermission('moderation_admin', 'content.remove')).toBe(true);
      expect(hasPermission('moderation_admin', 'comments.read')).toBe(true);
    });
  });

  describe('ADMIN_ROLES', () => {
    it('contains all 11 roles', () => {
      expect(ADMIN_ROLES).toHaveLength(11);
    });

    it('includes expected roles', () => {
      expect(ADMIN_ROLES).toContain('super_admin');
      expect(ADMIN_ROLES).toContain('platform_admin');
      expect(ADMIN_ROLES).toContain('safety_admin');
      expect(ADMIN_ROLES).toContain('moderation_admin');
      expect(ADMIN_ROLES).toContain('support_agent');
      expect(ADMIN_ROLES).toContain('booking_admin');
      expect(ADMIN_ROLES).toContain('finance_admin');
      expect(ADMIN_ROLES).toContain('kyc_reviewer');
      expect(ADMIN_ROLES).toContain('content_admin');
      expect(ADMIN_ROLES).toContain('analytics_admin');
      expect(ADMIN_ROLES).toContain('read_only_admin');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('defines permissions for every role', () => {
      for (const role of ADMIN_ROLES) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      }
    });

    it('super_admin has the most permissions', () => {
      const superAdminCount = ROLE_PERMISSIONS.super_admin.length;
      for (const role of ADMIN_ROLES) {
        if (role === 'super_admin') continue;
        expect(ROLE_PERMISSIONS[role].length).toBeLessThanOrEqual(superAdminCount);
      }
    });
  });
});

describe('rateLimiter', () => {
  beforeEach(() => {
    rateLimiter.clearAll();
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimiter.check('test-key')).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    for (let i = 0; i < 30; i++) {
      rateLimiter.check('test-key');
    }
    expect(rateLimiter.check('test-key')).toBe(false);
  });

  it('resets after the time window expires', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 30; i++) {
      rateLimiter.check('test-key');
    }
    expect(rateLimiter.check('test-key')).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(rateLimiter.check('test-key')).toBe(true);
    vi.useRealTimers();
  });

  it('supports custom max requests', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.check('custom-key', 5)).toBe(true);
    }
    expect(rateLimiter.check('custom-key', 5)).toBe(false);
  });

  it('tracks keys independently', () => {
    for (let i = 0; i < 30; i++) {
      rateLimiter.check('key-a');
    }
    expect(rateLimiter.check('key-a')).toBe(false);
    expect(rateLimiter.check('key-b')).toBe(true);
  });

  it('can reset a specific key', () => {
    for (let i = 0; i < 30; i++) {
      rateLimiter.check('reset-key');
    }
    expect(rateLimiter.check('reset-key')).toBe(false);
    rateLimiter.reset('reset-key');
    expect(rateLimiter.check('reset-key')).toBe(true);
  });
});
