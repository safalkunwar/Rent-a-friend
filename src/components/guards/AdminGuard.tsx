import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { LoadingScreen } from '../LoadingScreen';
import { hasPermission, type AdminRole } from '../../services/admin';

export const AdminGuard: React.FC<{ children: React.ReactNode; requiredPermission?: string }> = ({ children, requiredPermission }) => {
  const { currentUser, loading } = useAppContext();

  if (loading) {
    return <LoadingScreen />;
  }

  const role = (currentUser?.claims?.adminRole as AdminRole) || (currentUser?.role === 'admin' ? 'platform_admin' : null);
  if (!role || !hasPermission(role, requiredPermission || 'users.read')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
