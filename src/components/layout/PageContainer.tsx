import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'main';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  as = 'div',
}) => {
  const Component = as;
  return (
    <Component className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </Component>
  );
};
