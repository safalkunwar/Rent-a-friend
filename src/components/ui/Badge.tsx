import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'success' | 'warning' | 'danger';
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-primary-action/10 text-primary-action border border-primary-action/20',
    secondary: 'bg-surface-elevated text-text-secondary border border-border-token-light',
    gold: 'bg-gold-accent/10 text-gold-accent border border-gold-accent/20',
    success: 'bg-success-token/10 text-success-token border border-success-token/20',
    warning: 'bg-warning-token/10 text-warning-token border border-warning-token/20',
    danger: 'bg-danger-token/10 text-danger-token border border-danger-token/20'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide select-none ${variantStyles[variant]} ${className}`} 
      {...props}
    >
      {children}
    </span>
  );
};
