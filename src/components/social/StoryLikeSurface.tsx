import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';

/** Shared touch/mouse gesture. A double tap only likes; it never toggles off. */
export function StoryLikeSurface({ children, onLike, onSingleTap, className = '' }: {
  children?: React.ReactNode; onLike: () => Promise<boolean>;
  onSingleTap?: () => void; className?: string;
}) {
  const [burst, setBurst] = useState(0);
  const last = useRef<{ time: number; x: number; y: number } | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; clearTimeout(timer.current); }; }, []);
  return <div className={`relative touch-manipulation select-none ${className}`} onPointerDown={event => {
    if (!event.isPrimary || event.button !== 0) return;
    down.current = { x: event.clientX, y: event.clientY };
  }} onPointerCancel={() => { down.current = null; last.current = null; clearTimeout(timer.current); }} onPointerUp={event => {
    const start = down.current; down.current = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
    const now = Date.now(), previous = last.current;
    if (previous && now - previous.time < 300 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 40) {
      last.current = null; clearTimeout(timer.current);
      void onLike().then(confirmed => { if (confirmed && alive.current) setBurst(value => value + 1); }).catch(() => {});
    } else {
      last.current = { time: now, x: event.clientX, y: event.clientY };
      clearTimeout(timer.current); timer.current = setTimeout(() => { last.current = null; onSingleTap?.(); }, 300);
    }
  }}>
    {children}
    {burst > 0 && <span key={burst} aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><Heart className="sathi-story-heart h-24 w-24 fill-rose-500 text-white drop-shadow-xl" /></span>}
  </div>;
}
