import { describe, expect, it } from 'vitest';
import { isAdminAppCheckConfigured } from '../services/appCheck';

describe('admin App Check opt-in guard', () => {
  const base = {
    isProduction: true,
    hostname: 'ops.example.com',
    siteKey: 'public-site-key',
    allowedHosts: 'ops.example.com',
  };

  it('enables initialization only for an exact allowlisted production host with a key', () => {
    expect(isAdminAppCheckConfigured(base)).toBe(true);
    expect(isAdminAppCheckConfigured({ ...base, hostname: 'OPS.EXAMPLE.COM' })).toBe(true);
    expect(isAdminAppCheckConfigured({ ...base, hostname: 'other.ops.example.com' })).toBe(false);
  });

  it('fails closed when production, key, or explicit host allowlist is missing', () => {
    expect(isAdminAppCheckConfigured({ ...base, isProduction: false })).toBe(false);
    expect(isAdminAppCheckConfigured({ ...base, siteKey: ' ' })).toBe(false);
    expect(isAdminAppCheckConfigured({ ...base, allowedHosts: '' })).toBe(false);
  });

  it('normalizes comma-separated exact hosts without accepting wildcard entries', () => {
    expect(isAdminAppCheckConfigured({ ...base, allowedHosts: ' admin.example.com, OPS.EXAMPLE.COM ' })).toBe(true);
    expect(isAdminAppCheckConfigured({ ...base, allowedHosts: '*.example.com' })).toBe(false);
  });
});
