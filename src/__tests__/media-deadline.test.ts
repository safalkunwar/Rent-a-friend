import { describe, it, expect, vi, afterEach } from 'vitest';
import { mediaDeadline } from '../services/mediaDeadline';
import { mediaTime } from '../services/mediaContract';
afterEach(() => vi.useRealTimers());
describe('media wait bounds', () => {
  it('releases a stalled upload and cancels its transfer', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const result = mediaDeadline(new Promise(() => {}), 'Image upload', cancel);
    const rejected = expect(result).rejects.toMatchObject({ code: 'media/deadline-exceeded' });
    await vi.advanceTimersByTimeAsync(60000);
    await rejected;
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('preserves Firebase errors and clears successful timers', async () => {
    vi.useFakeTimers();
    const error = { code: 'storage/unauthorized' };
    await expect(mediaDeadline(Promise.reject(error), 'Upload')).rejects.toBe(error);
    await expect(mediaDeadline(Promise.resolve('saved'), 'Save')).resolves.toBe('saved');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ignores malformed legacy expiry instead of crashing the Story row', () => {
    expect(mediaTime({ seconds: 123 } as never)).toBe(0);
    expect(mediaTime(undefined)).toBe(0);
  });
});
