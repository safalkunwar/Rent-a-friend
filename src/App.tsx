import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { ClientApp } from './ClientApp';
import { AuthGuard } from './components/guards/AuthGuard';
import { LoadingScreen } from './components/LoadingScreen';
import { NotificationProvider } from './components/notifications/NotificationProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PaymentVerifyPage } from './pages/PaymentVerifyPage';
import { EsewaVerifyPage } from './pages/EsewaVerifyPage';
import { EsewaFailurePage } from './pages/EsewaFailurePage';
import { PostPage } from './pages/PostPage';

function AppRoutes() {
  const { loading } = useAppContext();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<ClientApp initialTab="home" />} />
      <Route path="/explore" element={<ClientApp initialTab="explore" />} />
      <Route
        path="/companions"
        element={<ClientApp initialTab="companions" />}
      />
      <Route
        path="/bookings"
        element={
          <AuthGuard>
            <ClientApp initialTab="bookings" />
          </AuthGuard>
        }
      />
      <Route
        path="/messages"
        element={
          <AuthGuard>
            <ClientApp initialTab="messages" />
          </AuthGuard>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <ClientApp initialTab="dashboard" />
          </AuthGuard>
        }
      />
      <Route
        path="/partner"
        element={
          <AuthGuard>
            <ClientApp initialTab="partner" />
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <ClientApp initialTab="settings" />
          </AuthGuard>
        }
      />
      <Route path="/post/:postId" element={<PostPage />} />
      <Route path="/payment/verify" element={<PaymentVerifyPage />} />
      <Route path="/payment/esewa-verify" element={<EsewaVerifyPage />} />
      <Route path="/payment/esewa-failure" element={<EsewaFailurePage />} />
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
              <AppRoutes />
            </NotificationProvider>
          </ToastProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
