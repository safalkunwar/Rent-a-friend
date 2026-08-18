import React from 'react';
import { ChevronRight } from 'lucide-react';

interface CategoryHeaderProps {
  title: string;
  count: number;
  emoji?: string;
  onViewMore?: () => void;
  className?: string;
}

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  title,
  count,
  emoji,
  onViewMore,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {emoji && (
          <span className="text-xl" role="img" aria-label={title}>
            {emoji}
          </span>
        )}
        <div className="flex flex-col">
          <h3 className="text-base font-bold text-text-primary tracking-tight leading-tight">
            {title}
          </h3>
          <span className="text-[11px] text-text-secondary font-medium">
            {count} {count === 1 ? 'guide' : 'guides'}
          </span>
        </div>
      </div>
      {onViewMore && (
        <button
          onClick={onViewMore}
          className="text-xs font-bold text-primary-action hover:underline flex items-center gap-1 transition-colors"
        >
          View More <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
