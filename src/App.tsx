import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { ClientApp } from './ClientApp';
import { AuthGuard } from './components/guards/AuthGuard';
import { AdminGuard } from './components/guards/AdminGuard';
import { LoadingScreen } from './components/LoadingScreen';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { AdminApplicationsPage } from './pages/AdminApplicationsPage';

function AppRoutes() {
  const { loading } = useAppContext();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/companions" replace />} />
      <Route path="/explore" element={<Navigate to="/companions" replace />} />
      <Route path="/events" element={<Navigate to="/companions" replace />} />
      <Route path="/companions" element={<ClientApp initialTab="explore" />} />
      <Route path="/bookings" element={<Navigate to="/companions" replace />} />
      <Route
        path="/messages"
        element={
          <AuthGuard>
            <ClientApp initialTab="messages" />
          </AuthGuard>
        }
      />
      <Route path="/dashboard" element={<Navigate to="/settings" replace />} />
      <Route path="/partner" element={<Navigate to="/companions" replace />} />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <ClientApp initialTab="settings" />
          </AuthGuard>
        }
      />
      <Route path="/post/:postId" element={<Navigate to="/companions" replace />} />
      <Route path="/story/:storyId" element={<Navigate to="/companions" replace />} />
      <Route path="/event/:eventId" element={<Navigate to="/companions" replace />} />
      <Route
        path="/admin/applications"
        element={
          <AdminGuard requiredPermission="companions.verify">
            <AdminApplicationsPage />
          </AdminGuard>
        }
      />
      <Route path="/payment/verify" element={<Navigate to="/companions" replace />} />
      <Route path="/payment/esewa-verify" element={<Navigate to="/companions" replace />} />
      <Route path="/payment/esewa-failure" element={<Navigate to="/companions" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <ToastProvider>
            <NotificationProvider>
              <PWAInstallPrompt />
              <PWAUpdatePrompt />
              <AppRoutes />
            </NotificationProvider>
          </ToastProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
