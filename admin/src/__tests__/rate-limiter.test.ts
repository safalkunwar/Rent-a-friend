import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminRateLimiter } from '../services/rateLimiter';

describe('adminRateLimiter', () => {
  beforeEach(() => {
    adminRateLimiter.clearAll();
  });

  it('should allow actions within rate limit', () => {
    expect(adminRateLimiter.checkAction('test', 'user1', 3)).toBe(true);
    expect(adminRateLimiter.checkAction('test', 'user1', 3)).toBe(true);
    expect(adminRateLimiter.checkAction('test', 'user1', 3)).toBe(true);
  });

  it('should block actions exceeding rate limit', () => {
    expect(adminRateLimiter.checkAction('test', 'user1', 2)).toBe(true);
    expect(adminRateLimiter.checkAction('test', 'user1', 2)).toBe(true);
    expect(adminRateLimiter.checkAction('test', 'user1', 2)).toBe(false);
  });

  it('should track different users separately', () => {
    expect(adminRateLimiter.checkAction('test', 'user1', 1)).toBe(true);
    expect(adminRateLimiter.checkAction('test', 'user2', 1)).toBe(true);
    expect(adminRateLimiter.checkAction('test', 'user1', 1)).toBe(false);
    expect(adminRateLimiter.checkAction('test', 'user2', 1)).toBe(false);
  });

  it('should track different actions separately', () => {
    expect(adminRateLimiter.checkAction('action1', 'user1', 1)).toBe(true);
    expect(adminRateLimiter.checkAction('action2', 'user1', 1)).toBe(true);
    expect(adminRateLimiter.checkAction('action1', 'user1', 1)).toBe(false);
    expect(adminRateLimiter.checkAction('action2', 'user1', 1)).toBe(false);
  });

  it('should allow search actions with higher limit', () => {
    for (let i = 0; i < 60; i++) {
      expect(adminRateLimiter.checkSearch('user1')).toBe(true);
    }
    expect(adminRateLimiter.checkSearch('user1')).toBe(false);
  });

  it('should allow export actions with higher limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(adminRateLimiter.checkExport('user1')).toBe(true);
    }
    expect(adminRateLimiter.checkExport('user1')).toBe(false);
  });

  it('should clear all rate limits', () => {
    expect(adminRateLimiter.checkAction('test', 'user1', 1)).toBe(true);
    expect(adminRateLimiter.checkAction('test', 'user1', 1)).toBe(false);
    adminRateLimiter.clearAll();
    expect(adminRateLimiter.checkAction('test', 'user1', 1)).toBe(true);
  });
});
