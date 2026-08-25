import React, { useEffect, useRef, useState } from 'react';

interface ExpandableTextProps {
  text: string;
  lines?: number;
  className?: string;
  buttonClassName?: string;
  moreLabel?: string;
  lessLabel?: string;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  lines = 1,
  className = '',
  buttonClassName = 'font-bold text-primary-action hover:underline',
  moreLabel = 'Show more',
  lessLabel = 'Show less',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text, lines]);

  if (!text) return null;

  const collapsedStyle: React.CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  return (
    <div>
      <p
        ref={ref}
        className={`whitespace-pre-wrap ${className}`}
        style={expanded ? undefined : collapsedStyle}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className={`${buttonClassName}`}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </div>
  );
};
