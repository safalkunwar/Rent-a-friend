import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  badge,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/5 pb-4 ${className}`}>
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-text-primary flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary-action" />}
          {title}
          {badge}
        </h2>
        {subtitle && (
          <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
