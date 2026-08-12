import { describe, it, expect, vi, beforeEach } from 'vitest';
import { idempotencyService } from '../services/idempotency';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  const mock = {
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = value; },
    removeItem(key: string) { delete store[key]; },
    clear() { store = {}; },
    get length() { return Object.keys(store).length; },
    key(index: number) { return Object.keys(store)[index] ?? null; },
  };

  const proxy = new Proxy(mock, {
    ownKeys(target) {
      const methodKeys = Object.getOwnPropertyNames(target).filter(k => k !== 'length');
      return [...methodKeys, ...Object.keys(store)];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Object.getOwnPropertyDescriptor(target, prop)!;
      }
      return {
        enumerable: true,
        configurable: true,
        value: store[prop as string],
      };
    },
  });

  return proxy;
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('idempotencyService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    idempotencyService.clear();
  });

  it('should generate consistent keys', () => {
    const key1 = idempotencyService.generateKey('action', 'target1', 'user1');
    const key2 = idempotencyService.generateKey('action', 'target1', 'user1');
    expect(key1).toBe(key2);
  });

  it('should generate different keys for different inputs', () => {
    const key1 = idempotencyService.generateKey('action1', 'target1', 'user1');
    const key2 = idempotencyService.generateKey('action2', 'target1', 'user1');
    const key3 = idempotencyService.generateKey('action1', 'target2', 'user1');
    const key4 = idempotencyService.generateKey('action1', 'target1', 'user2');
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).not.toBe(key4);
  });

  it('should return null for non-existent keys', async () => {
    const result = await idempotencyService.get('non-existent-key');
    expect(result).toBeNull();
  });

  it('should store and retrieve records', async () => {
    const key = idempotencyService.generateKey('action', 'target', 'user');
    await idempotencyService.set(key, 'action', 'target', { success: true });
    const result = await idempotencyService.get(key);
    expect(result).not.toBeNull();
    expect(result?.action).toBe('action');
    expect(result?.targetId).toBe('target');
    expect(result?.result).toEqual({ success: true });
  });

  it('should clear all records', async () => {
    const key1 = idempotencyService.generateKey('action1', 'target1', 'user1');
    const key2 = idempotencyService.generateKey('action2', 'target2', 'user2');
    await idempotencyService.set(key1, 'action1', 'target1', {});
    await idempotencyService.set(key2, 'action2', 'target2', {});
    idempotencyService.clear();
    expect(await idempotencyService.get(key1)).toBeNull();
    expect(await idempotencyService.get(key2)).toBeNull();
  });

  it('should handle localStorage errors gracefully', async () => {
    const originalSetItem = (localStorageMock as any).setItem;
    (localStorageMock as any).setItem = () => {
      throw new Error('Storage full');
    };

    const key = idempotencyService.generateKey('action', 'target', 'user');
    await expect(idempotencyService.set(key, 'action', 'target', {})).resolves.toBeUndefined();

    (localStorageMock as any).setItem = originalSetItem;
  });
});
