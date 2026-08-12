import { describe, it, expect, vi } from 'vitest';
import { healthService } from '../services/health';

describe('healthService', () => {
  it('should have checkFirestore method', () => {
    expect(typeof healthService.checkFirestore).toBe('function');
  });

  it('should have checkAuth method', () => {
    expect(typeof healthService.checkAuth).toBe('function');
  });

  it('should have checkStorage method', () => {
    expect(typeof healthService.checkStorage).toBe('function');
  });

  it('should have getSystemHealth method', () => {
    expect(typeof healthService.getSystemHealth).toBe('function');
  });

  it('should return valid system health structure', async () => {
    const health = await healthService.getSystemHealth();
    expect(health).toHaveProperty('overall');
    expect(health).toHaveProperty('checks');
    expect(health).toHaveProperty('lastUpdated');
    expect(Array.isArray(health.checks)).toBe(true);
    expect(['healthy', 'degraded', 'warning', 'critical']).toContain(health.overall);
  });

  it('should have checks with required properties', async () => {
    const health = await healthService.getSystemHealth();
    for (const check of health.checks) {
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('status');
      expect(check).toHaveProperty('lastChecked');
      expect(['healthy', 'degraded', 'warning', 'critical']).toContain(check.status);
    }
  });
});
