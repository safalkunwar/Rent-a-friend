import React from 'react';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'base' | 'secondary' | 'card' | 'elevated' | 'glass';
  className?: string;
  children: React.ReactNode;
}

export const Surface: React.FC<SurfaceProps> = ({
  variant = 'base',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    base: 'bg-background text-text-primary',
    secondary: 'bg-surface text-text-primary',
    card: 'bg-surface border border-border-token-light rounded-3xl p-5 shadow-md',
    elevated: 'bg-surface-elevated border border-border-token-light rounded-3xl p-6 shadow-lg',
    glass: 'bg-surface/95 backdrop-blur-md border border-border-token-light'
  };

  return (
    <div 
      className={`transition-all duration-200 ${variantStyles[variant]} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};
