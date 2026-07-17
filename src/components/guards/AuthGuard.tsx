import React from 'react';

// TEMPORARY: Auth bypass for deployed testing. Remove after testing.
export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
