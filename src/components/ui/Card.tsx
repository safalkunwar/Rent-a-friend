import React from 'react';
import { motion } from 'motion/react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  hoverable = true,
  className = '',
  children,
  ...props
}) => {
  const CardComponent = hoverable ? motion.div : 'div';
  const hoverProps = hoverable
    ? {
        whileHover: { y: -4, transition: { duration: 0.2, ease: 'easeOut' } },
        className: `bg-card border border-border-token-light rounded-3xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 ${className}`
      }
    : {
        className: `bg-card border border-border-token-light rounded-3xl overflow-hidden shadow-md ${className}`
      };

  return (
    <CardComponent {...hoverProps} {...(props as any)}>
      {children}
    </CardComponent>
  );
};
