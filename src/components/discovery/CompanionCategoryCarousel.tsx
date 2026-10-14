import React, { useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'motion/react';
import { PEOPLE_MODES, type PeopleMode } from './peopleModes';
import './companion-category-carousel.css';

const COUNT = PEOPLE_MODES.length;
const wrap = (value: number) => ((value % COUNT) + COUNT) % COUNT;
const EASE = [0.22, 0.75, 0.25, 1] as const;

function Sphere({ index, progress, active, reduced, onSelect }: {
  index: number; progress: MotionValue<number>; active: boolean; reduced: boolean; onSelect: () => void;
}) {
  const item = PEOPLE_MODES[index];
  const { Icon } = item;
  const transform = useTransform(progress, value => {
    const angle = (index - value) * 2 * Math.PI / COUNT;
    const x = Math.sin(angle), depth = (1 - Math.cos(angle)) / 2;
    return `translate3d(calc(var(--orbit-radius) * ${x}), ${-depth * 94}px, ${reduced ? 0 : -depth * 70}px) rotateY(${reduced ? 0 : -x * 14}deg) scale(${1 - depth * .48})`;
  });
  const opacity = useTransform(progress, value => .48 + .52 * (1 + Math.cos((index - value) * 2 * Math.PI / COUNT)) / 2);
  const zIndex = useTransform(progress, value => Math.round(10 + 10 * Math.cos((index - value) * 2 * Math.PI / COUNT)));
  return <motion.button type="button" className="companion-sphere" data-active={active} data-category={item.id}
    aria-label={`${active ? 'View' : 'Select'} ${item.label}`} aria-current={active ? 'true' : undefined}
    tabIndex={active ? 0 : -1} style={{ transform, opacity, zIndex }} onClick={onSelect}>
    <span className="companion-sphere-ring"><span className="companion-sphere-face">
      <span className="companion-sphere-contour" aria-hidden="true" />
      <Icon size={58} strokeWidth={1.25} aria-hidden="true" />
      <span className="companion-sphere-spark" aria-hidden="true" />
    </span></span>
    <span className="companion-sphere-label" aria-hidden="true">{item.label}</span>
  </motion.button>;
}

interface Props {
  step: number;
  onStep: (step: number) => void;
  onEnter: (mode: PeopleMode) => void;
}

/** An unbounded phase moves four stable nodes around an orbit, including across the last/first boundary. */
export function CompanionCategoryCarousel({ step, onStep, onEnter }: Props) {
  const activeIndex = wrap(step);
  const active = PEOPLE_MODES[activeIndex];
  const reduced = !!useReducedMotion();
  const progress = useMotionValue(step);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; step: number; axis: 'pending' | 'x' | 'y' } | null>(null);
  const suppressClickUntil = useRef(0);
  const followKeyboardFocus = useRef(false);
  const settle = useCallback((target: number) => {
    animation.current?.stop();
    animation.current = animate(progress, target, { duration: reduced ? 0 : .4, ease: EASE });
  }, [progress, reduced]);
  useEffect(() => { settle(step); return () => animation.current?.stop(); }, [step, settle]);
  useEffect(() => {
    if (followKeyboardFocus.current) {
      viewport.current?.querySelector<HTMLButtonElement>('[data-active="true"]')?.focus({ preventScroll: true });
      followKeyboardFocus.current = false;
    }
  }, [step]);
  const move = useCallback((direction: number) => onStep(step + direction), [step, onStep]);
  const moveRef = useRef(move);
  useEffect(() => { moveRef.current = move; }, [move]);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    let accumulated = 0, lastEvent = 0, lastMove = -Infinity;
    const wheel = (event: WheelEvent) => {
      // Leave ordinary vertical page scrolling and browser zoom alone.
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const now = performance.now();
      const delta = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1);
      if (now - lastEvent > 160 || Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
      lastEvent = now;
      if (now - lastMove < 450) return;
      accumulated += delta;
      if (Math.abs(accumulated) >= 32) {
        moveRef.current(Math.sign(accumulated));
        accumulated = 0;
        lastMove = now;
      }
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, []);

  const select = (index: number) => {
    if (index === activeIndex) { onEnter(active.id); return; }
    let distance = wrap(index - activeIndex);
    if (distance > COUNT / 2) distance -= COUNT;
    move(distance);
  };
  const finishDrag = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const drag = gesture.current;
    if (!drag || event.pointerId !== drag.id) return;
    gesture.current = null;
    if (drag.axis === 'x') {
      suppressClickUntil.current = performance.now() + 350;
      const delta = event.clientX - drag.x;
      if (!cancelled && Math.abs(delta) >= 36) onStep(drag.step + (delta < 0 ? 1 : -1));
      else settle(drag.step);
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return <section className="companion-type-entry" aria-label="Companion types" aria-roledescription="carousel"
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        followKeyboardFocus.current = (event.target as HTMLElement).classList.contains('companion-sphere');
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    }}>
    <header className="companion-type-heading">
      <p className="companion-type-eyebrow"><span />Find your Sathi<span /></p>
      <h1>Who would you like to meet?</h1>
      <p>Choose a companion type and start exploring.</p>
    </header>
    <div className="companion-orbit" ref={viewport} role="group" aria-label="Swipe or use arrow keys to choose a companion type"
      tabIndex={0}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); onEnter(active.id);
        }
      }}
      onClickCapture={event => {
        if (performance.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); }
      }}
      onPointerDown={event => {
        if (event.button !== 0 || event.isPrimary === false) return;
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, step, axis: 'pending' };
      }}
      onPointerMove={event => {
        const drag = gesture.current;
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (drag.axis === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
          drag.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
          if (drag.axis === 'x') { animation.current?.stop(); event.currentTarget.setPointerCapture?.(event.pointerId); }
        }
        if (drag.axis === 'x') {
          event.preventDefault();
          if (!reduced) progress.set(drag.step - Math.max(-.95, Math.min(.95, dx / 170)));
        }
      }}
      onPointerUp={event => finishDrag(event)} onPointerCancel={event => finishDrag(event, true)}>
      <div className="companion-orbit-path" aria-hidden="true" />
      {PEOPLE_MODES.map((item, index) => <Sphere key={item.id} index={index} progress={progress}
        active={index === activeIndex} reduced={reduced} onSelect={() => select(index)} />)}
    </div>
    <div className="companion-type-details" aria-live="polite" aria-atomic="true">
      <p className="companion-type-count">{String(activeIndex + 1).padStart(2, '0')} <span>/ {String(COUNT).padStart(2, '0')}</span></p>
      <h2>{active.label}</h2>
      <p className="companion-type-summary">{active.summary}</p>
      <span className="companion-type-availability">{active.comingSoon ? 'Coming soon' : 'Browse current profiles'}</span>
    </div>
    <div className="companion-type-controls">
      <button type="button" className="companion-orbit-arrow" aria-label="Previous companion type" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
      <div className="companion-type-dots" aria-label="Choose a companion type">
        {PEOPLE_MODES.map((item, index) => <button key={item.id} type="button" aria-label={`Select ${item.label}`}
          aria-pressed={index === activeIndex} onClick={() => {
            if (index !== activeIndex) select(index);
          }}><span /></button>)}
      </div>
      <button type="button" className="companion-orbit-arrow" aria-label="Next companion type" onClick={() => move(1)}><ChevronRight size={20} /></button>
    </div>
    <button type="button" className="companion-type-explore" onClick={() => onEnter(active.id)}>Explore {active.label}<ArrowRight size={18} aria-hidden="true" /></button>
    <p className="companion-type-hint"><ArrowLeft size={12} aria-hidden="true" />Swipe to discover<ArrowRight size={12} aria-hidden="true" /></p>
  </section>;
}
