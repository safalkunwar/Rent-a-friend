import React from 'react';

interface TypographyProps extends React.HTMLAttributes<HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'body-sm' | 'metadata' | 'label' | 'subtitle';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  as,
  className = '',
  children,
  ...props
}) => {
  // Determine standard tag based on variant if not provided explicitly
  const Tag = as || (
    variant === 'h1' ? 'h1' :
    variant === 'h2' ? 'h2' :
    variant === 'h3' ? 'h3' :
    variant === 'h4' ? 'h4' :
    variant === 'body' || variant === 'body-sm' || variant === 'subtitle' ? 'p' : 'span'
  );

  const variantStyles = {
    h1: 'text-2xl md:text-3.5xl font-bold text-text-primary tracking-tight leading-tight',
    h2: 'text-xl md:text-2xl font-semibold text-text-primary tracking-tight leading-snug',
    h3: 'text-lg md:text-xl font-semibold text-text-primary tracking-normal leading-normal',
    h4: 'text-base md:text-lg font-medium text-text-primary tracking-normal leading-normal',
    subtitle: 'text-sm md:text-base font-normal text-text-secondary leading-relaxed',
    body: 'text-sm md:text-base font-normal text-text-primary leading-relaxed',
    'body-sm': 'text-xs md:text-sm font-normal text-text-secondary leading-relaxed',
    metadata: 'text-xs font-normal text-text-secondary tracking-normal leading-none',
    label: 'text-xs uppercase font-medium text-text-secondary tracking-wider'
  };

  return (
    <Tag 
      className={`${variantStyles[variant]} ${className}`} 
      {...props}
    >
      {children}
    </Tag>
  );
};
