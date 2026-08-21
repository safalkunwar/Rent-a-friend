import React, { useRef, useEffect, useState } from 'react';

interface VirtualizedTableProps<T> {
  items: T[];
  rowHeight: number;
  containerHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualizedTable<T>({
  items,
  rowHeight,
  containerHeight,
  renderRow,
  overscan = 5,
  onScroll,
}: VirtualizedTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);
  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflowY: 'auto' }}
      className="scrollbar-thin scrollbar-thumb-border-token scrollbar-track-transparent"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={index} style={{ height: rowHeight }}>
              {renderRow(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
