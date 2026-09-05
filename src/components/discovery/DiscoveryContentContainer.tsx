import React from 'react';

interface DiscoveryContentContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const DiscoveryContentContainer: React.FC<DiscoveryContentContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {children}
    </div>
  );
};
