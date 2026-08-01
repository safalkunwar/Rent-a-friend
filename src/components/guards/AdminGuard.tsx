import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { LoadingScreen } from '../LoadingScreen';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAppContext();

  if (loading) {
    return <LoadingScreen />;
  }

  const isAdmin = currentUser?.role === 'admin' || Boolean(currentUser?.claims?.admin);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
