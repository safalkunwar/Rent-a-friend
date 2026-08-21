import React from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { LoadingScreen } from './LoadingScreen';
import { AdminUnauthorized } from '../pages/AdminUnauthorized';

interface AdminAuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children, requiredPermission }) => {
  const { status, session, hasPermission } = useAdminAuth();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (status === 'unauthorized' || status === 'access_restricted') {
    return <AdminUnauthorized />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AdminUnauthorized />;
  }

  return <>{children}</>;
};
