import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CompanionCategoryCarousel } from '../components/discovery/CompanionCategoryCarousel';

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async importOriginal => ({
  ...await importOriginal<typeof import('motion/react')>(),
  useReducedMotion: () => preference.reduced,
}));
afterEach(() => { cleanup(); preference.reduced = false; });
function Carousel({ initial = 0, enter = vi.fn() }: { initial?: number; enter?: (mode: string) => void }) {
  const [step, setStep] = React.useState(initial);
  return <CompanionCategoryCarousel step={step} onStep={setStep} onEnter={enter} />;
}
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next companion type' }));
const previous = () => fireEvent.click(screen.getByRole('button', { name: 'Previous companion type' }));
const active = () => document.querySelector('[data-active="true"]');

it('loops in both directions using the same four nodes without entering a destination', () => {
  const enter = vi.fn();
  const { container } = render(<Carousel enter={enter} />);
  const nodes = Array.from(container.querySelectorAll('.companion-sphere'));
  previous();
  expect(active()?.getAttribute('data-category')).toBe('guide');
  next();
  expect(active()?.getAttribute('data-category')).toBe('all');
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const category of ['free_friend', 'local_host', 'guide', 'all']) {
      next(); expect(active()?.getAttribute('data-category')).toBe(category);
    }
  }
  expect(Array.from(container.querySelectorAll('.companion-sphere'))).toEqual(nodes);
  expect(container.querySelectorAll('.companion-type-dots button')).toHaveLength(4);
  expect(enter).not.toHaveBeenCalled();
});

it('previews an adjacent sphere before active sphere or CTA enters the same existing mode', () => {
  const enter = vi.fn();
  render(<Carousel enter={enter} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Select Free Friends' }).find(button => button.classList.contains('companion-sphere'))!);
  expect(enter).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'View Free Friends' }));
  fireEvent.click(screen.getByRole('button', { name: 'Explore Free Friends' }));
  expect(enter.mock.calls).toEqual([['free_friend'], ['free_friend']]);
  expect(screen.getByText('Coming soon')).toBeTruthy();
});

it('supports arrow keys, Enter and Space without opening on preview', () => {
  const enter = vi.fn();
  render(<Carousel enter={enter} />);
  const orbit = screen.getByRole('group');
  fireEvent.keyDown(orbit, { key: 'ArrowLeft' });
  expect(active()?.getAttribute('data-category')).toBe('guide');
  fireEvent.keyDown(orbit, { key: 'Enter' });
  fireEvent.keyDown(orbit, { key: 'ArrowRight' });
  fireEvent.keyDown(orbit, { key: ' ' });
  expect(enter.mock.calls).toEqual([['guide'], ['all']]);
});

it('moves keyboard focus with the active sphere and removes 3D rotation for reduced motion', () => {
  preference.reduced = true;
  const enter = vi.fn();
  render(<Carousel enter={enter} />);
  const first = screen.getByRole('button', { name: 'View All people' });
  first.focus();
  fireEvent.keyDown(first, { key: 'ArrowRight' });
  const current = screen.getByRole('button', { name: 'View Free Friends' });
  expect(document.activeElement).toBe(current);
  expect(current.style.transform).toContain('rotateY(0deg)');
  fireEvent.click(current);
  expect(enter).toHaveBeenCalledWith('free_friend');
});

it('accepts horizontal trackpad input while leaving vertical scroll and zoom alone', () => {
  render(<Carousel />);
  const orbit = screen.getByRole('group');
  const vertical = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
  fireEvent(orbit, vertical);
  expect(vertical.defaultPrevented).toBe(false);
  const zoom = new WheelEvent('wheel', { deltaX: 100, ctrlKey: true, cancelable: true });
  fireEvent(orbit, zoom);
  expect(zoom.defaultPrevented).toBe(false);
  fireEvent.wheel(orbit, { deltaX: 80, deltaY: 2 });
  expect(active()?.getAttribute('data-category')).toBe('free_friend');
});

function pointer(node: Element, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y });
  fireEvent(node, event);
}

it('swipes both ways, ignores vertical gestures and suppresses drag-generated clicks', () => {
  const enter = vi.fn();
  render(<Carousel enter={enter} />);
  const orbit = screen.getByRole('group');
  pointer(orbit, 'pointerdown', 240, 100);
  pointer(orbit, 'pointermove', 130, 102);
  pointer(orbit, 'pointerup', 130, 102);
  expect(active()?.getAttribute('data-category')).toBe('free_friend');
  fireEvent.click(screen.getByRole('button', { name: 'View Free Friends' }));
  expect(enter).not.toHaveBeenCalled();
  pointer(orbit, 'pointerdown', 130, 100);
  pointer(orbit, 'pointermove', 240, 102);
  pointer(orbit, 'pointerup', 240, 102);
  expect(active()?.getAttribute('data-category')).toBe('all');
  pointer(orbit, 'pointerdown', 130, 100);
  pointer(orbit, 'pointermove', 135, 200);
  pointer(orbit, 'pointerup', 135, 200);
  expect(active()?.getAttribute('data-category')).toBe('all');
});

it('cancels an interrupted drag without changing the selected type', () => {
  render(<Carousel />);
  const orbit = screen.getByRole('group');
  pointer(orbit, 'pointerdown', 240, 100);
  pointer(orbit, 'pointermove', 130, 102);
  pointer(orbit, 'pointercancel', 130, 102);
  expect(active()?.getAttribute('data-category')).toBe('all');
  next();
  expect(active()?.getAttribute('data-category')).toBe('free_friend');
});
