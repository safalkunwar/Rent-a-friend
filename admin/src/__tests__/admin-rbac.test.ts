import { describe, it, expect, vi } from 'vitest';
import { hasPermission, getRolePermissions, ROLE_PERMISSIONS, type AdminRole } from '../services/admin';

describe('adminService RBAC', () => {
  describe('hasPermission', () => {
    it('should return false for null role', () => {
      expect(hasPermission(null, 'users.read')).toBe(false);
      expect(hasPermission(undefined, 'users.read')).toBe(false);
    });

    it('should return true for super_admin with any permission', () => {
      expect(hasPermission('super_admin', 'users.read')).toBe(true);
      expect(hasPermission('super_admin', 'users.write')).toBe(true);
      expect(hasPermission('super_admin', 'sos.write')).toBe(true);
    });

    it('should return false for read_only_admin with write permissions', () => {
      expect(hasPermission('read_only_admin', 'users.write')).toBe(false);
      expect(hasPermission('read_only_admin', 'bookings.write')).toBe(false);
    });

    it('should return true for read_only_admin with read permissions', () => {
      expect(hasPermission('read_only_admin', 'users.read')).toBe(true);
      expect(hasPermission('read_only_admin', 'bookings.read')).toBe(true);
    });

    it('should return true for kyc_reviewer with kyc permissions', () => {
      expect(hasPermission('kyc_reviewer', 'kyc.read')).toBe(true);
      expect(hasPermission('kyc_reviewer', 'kyc.write')).toBe(true);
    });

    it('should return false for kyc_reviewer with unrelated permissions', () => {
      expect(hasPermission('kyc_reviewer', 'sos.write')).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return empty array for unknown role', () => {
      expect(getRolePermissions('unknown_role' as AdminRole)).toEqual([]);
    });

    it('should return permissions for super_admin', () => {
      const permissions = getRolePermissions('super_admin');
      expect(permissions).toContain('users.read');
      expect(permissions).toContain('users.ban');
      expect(permissions).toContain('sos.write');
    });

    it('should return permissions for safety_admin', () => {
      const permissions = getRolePermissions('safety_admin');
      expect(permissions).toContain('sos.read');
      expect(permissions).toContain('sos.write');
      expect(permissions).not.toContain('users.ban');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should have all 11 roles defined', () => {
      const expectedRoles: AdminRole[] = [
        'super_admin',
        'platform_admin',
        'safety_admin',
        'moderation_admin',
        'support_agent',
        'booking_admin',
        'finance_admin',
        'kyc_reviewer',
        'content_admin',
        'analytics_admin',
        'read_only_admin',
      ];
      expect(expectedRoles).toEqual(Object.keys(ROLE_PERMISSIONS));
    });

    it('should have at least one permission for each role', () => {
      for (const permissions of Object.values(ROLE_PERMISSIONS)) {
        expect(permissions.length).toBeGreaterThan(0);
      }
    });
  });
});
