import React from 'react';

// TEMPORARY: Admin guard bypass for deployed testing. Remove after testing.
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
