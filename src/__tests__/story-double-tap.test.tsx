import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StoryLikeSurface } from '../components/social/StoryLikeSurface';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function tap(element: Element, x = 20) {
  for (const type of ['pointerdown', 'pointerup']) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { isPrimary: true, button: 0, clientX: x, clientY: 20 });
    fireEvent(element, event);
  }
}
it('double tap likes once, animates after confirmation and cancels single tap navigation', async () => {
  const like = vi.fn().mockResolvedValue(true), single = vi.fn();
  const { container } = render(<StoryLikeSurface onLike={like} onSingleTap={single} />);
  await act(async () => { tap(container.firstElementChild!); vi.advanceTimersByTime(120); tap(container.firstElementChild!); });
  expect(like).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.sathi-story-heart')).not.toBeNull();
  act(() => vi.advanceTimersByTime(500));
  expect(single).not.toHaveBeenCalled();
});
it('single tap opens after the gesture window; failed likes never animate', async () => {
  const like = vi.fn().mockResolvedValue(false), single = vi.fn();
  const { container } = render(<StoryLikeSurface onLike={like} onSingleTap={single} />);
  act(() => { tap(container.firstElementChild!); vi.advanceTimersByTime(301); });
  expect(single).toHaveBeenCalledTimes(1);
  await act(async () => { tap(container.firstElementChild!); tap(container.firstElementChild!); });
  expect(like).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.sathi-story-heart')).toBeNull();
});
it('widely separated taps do not like and unmount cancels delayed navigation', () => {
  const like = vi.fn(), single = vi.fn();
  const { container, unmount } = render(<StoryLikeSurface onLike={like} onSingleTap={single} />);
  act(() => { tap(container.firstElementChild!, 20); tap(container.firstElementChild!, 100); });
  unmount(); act(() => vi.advanceTimersByTime(400));
  expect(like).not.toHaveBeenCalled(); expect(single).not.toHaveBeenCalled();
});
