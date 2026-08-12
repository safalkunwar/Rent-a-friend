import React from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { LoadingScreen } from './LoadingScreen';

export const AdminAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAdminAuth('users.read');

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status === 'unauthorized') {
    window.location.replace('/');
    return null;
  }

  return <>{children}</>;
};
