import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import { AdminAuthGuard } from './components/AdminAuthGuard';
import { AdminErrorBoundary } from './components/AdminErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { AdminLogin } from './pages/AdminLogin';
import { AdminUnauthorized } from './pages/AdminUnauthorized';
import { AdminOverview } from './pages/AdminOverview';
import { AdminGuides } from './pages/AdminGuides';
import { AdminBookings } from './pages/AdminBookings';
import { AdminSecurity } from './pages/AdminSecurity';
import { AdminFeedback } from './pages/AdminFeedback';
import { AdminUsers } from './pages/AdminUsers';
import { AdminCompanions } from './pages/AdminCompanions';
import { AdminContent } from './pages/AdminContent';
import { AdminAuditLogs } from './pages/AdminAuditLogs';
import { AdminModeration } from './pages/AdminModeration';
import { AdminReports } from './pages/AdminReports';
import { AdminStories } from './pages/AdminStories';
import { AdminPayments } from './pages/AdminPayments';
import { AdminMessages } from './pages/AdminMessages';
import { AdminPartners } from './pages/AdminPartners';
import { AdminSupport } from './pages/AdminSupport';
import { AdminCities } from './pages/AdminCities';
import { AdminHotels } from './pages/AdminHotels';
import { AdminRestaurants } from './pages/AdminRestaurants';
import { AdminCafes } from './pages/AdminCafes';
import { AdminLikes } from './pages/AdminLikes';
import { AdminAnalytics } from './pages/AdminAnalytics';
import { Activity, UserCheck, CalendarDays, ShieldAlert, MessageSquare, LogOut, Users, Briefcase, Flag, Image, CreditCard, MessageCircle, Store, MapPin, Hotel, Utensils, Coffee, Heart, BarChart3 } from 'lucide-react';
import * as motion from 'motion/react-client';

const AdminLayout: React.FC<{ activeTab: string; onTabChange: (tab: string) => void; children: React.ReactNode }> = ({ 
  activeTab, onTabChange, children 
}) => {
  return (
    <div className="min-h-screen bg-background font-sans text-text-primary flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border-token hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border-token">
          <span className="text-xl font-semibold tracking-tight text-text-primary">SATHI <span className="text-primary-action">Admin</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => onTabChange('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Activity className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => onTabChange('users')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Users className="w-4 h-4" /> Users
          </button>
          <button onClick={() => onTabChange('guides')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'guides' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <UserCheck className="w-4 h-4" /> Guides & Verification
          </button>
          <button onClick={() => onTabChange('companions')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'companions' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Briefcase className="w-4 h-4" /> Companions
          </button>
          <button onClick={() => onTabChange('bookings')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'bookings' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <CalendarDays className="w-4 h-4" /> Bookings
          </button>
          <button onClick={() => onTabChange('content')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'content' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Briefcase className="w-4 h-4" /> Content
          </button>
          <button onClick={() => onTabChange('stories')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'stories' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Image className="w-4 h-4" /> Stories
          </button>
          <button onClick={() => onTabChange('partners')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'partners' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Store className="w-4 h-4" /> Partners
          </button>
          <button onClick={() => onTabChange('cities')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'cities' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <MapPin className="w-4 h-4" /> Cities
          </button>
          <button onClick={() => onTabChange('hotels')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'hotels' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Hotel className="w-4 h-4" /> Hotels
          </button>
          <button onClick={() => onTabChange('restaurants')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'restaurants' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Utensils className="w-4 h-4" /> Restaurants
          </button>
          <button onClick={() => onTabChange('cafes')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'cafes' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Coffee className="w-4 h-4" /> Cafes
          </button>
          <button onClick={() => onTabChange('likes')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'likes' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Heart className="w-4 h-4" /> Likes
          </button>
          <button onClick={() => onTabChange('analytics')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <BarChart3 className="w-4 h-4" /> Analytics
          </button>
          <button onClick={() => onTabChange('payments')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'payments' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <CreditCard className="w-4 h-4" /> Payments
          </button>
          <button onClick={() => onTabChange('messages')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'messages' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <MessageCircle className="w-4 h-4" /> Messages
          </button>
          <button onClick={() => onTabChange('support')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'support' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <MessageSquare className="w-4 h-4" /> Support
          </button>
          <button onClick={() => onTabChange('moderation')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'moderation' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <ShieldAlert className="w-4 h-4" /> Moderation
          </button>
          <button onClick={() => onTabChange('security')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-red-500/10 text-red-500' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <ShieldAlert className="w-4 h-4" /> Security & SOS
          </button>
          <button onClick={() => onTabChange('feedback')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'feedback' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <MessageSquare className="w-4 h-4" /> Feedback & Alerts
          </button>
          <button onClick={() => onTabChange('audit')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'audit' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <ShieldAlert className="w-4 h-4" /> Audit Logs
          </button>
          <button onClick={() => onTabChange('reports')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
            <Flag className="w-4 h-4" /> Reports
          </button>
        </nav>
        <div className="p-4 border-t border-border-token">
          <a href="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            Exit to App
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary capitalize">{activeTab.replace('-', ' ')}</h1>
                <p className="text-text-secondary text-sm mt-1">
                  {activeTab === 'dashboard' && 'Monitor overall platform metrics and growth.'}
                  {activeTab === 'users' && 'Manage user accounts and roles.'}
                  {activeTab === 'guides' && 'Review and approve guides on the platform.'}
                  {activeTab === 'companions' && 'Manage companion profiles and verifications.'}
                  {activeTab === 'bookings' && 'Manage all platform transactions.'}
                  {activeTab === 'content' && 'Manage activities and events.'}
                  {activeTab === 'stories' && 'Moderate user stories and story likes.'}
                  {activeTab === 'partners' && 'Manage business partners.'}
                  {activeTab === 'cities' && 'Manage city locations and coordinates.'}
                  {activeTab === 'hotels' && 'Manage hotel listings.'}
                  {activeTab === 'restaurants' && 'Manage restaurant listings.'}
                  {activeTab === 'cafes' && 'Manage cafe listings.'}
                  {activeTab === 'likes' && 'Inspect post and story likes.'}
                  {activeTab === 'analytics' && 'Platform metrics and engagement analytics.'}
                  {activeTab === 'payments' && 'View and manage payment transactions.'}
                  {activeTab === 'messages' && 'Monitor conversations and support messages.'}
                  {activeTab === 'support' && 'Manage user support tickets.'}
                  {activeTab === 'moderation' && 'Review and moderate community content and comments.'}
                  {activeTab === 'security' && 'Monitor suspicious activities and SOS alerts.'}
                  {activeTab === 'feedback' && 'Review user feedback and system notifications.'}
                  {activeTab === 'audit' && 'Review privileged actions and system audit trail.'}
                  {activeTab === 'reports' && 'Manage and resolve user reports across the platform.'}
                </p>
              </div>
            </div>

            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminOverview onNavigate={(tab) => setActiveTab(tab)} />;
      case 'users':
        return <AdminUsers />;
      case 'guides':
        return <AdminGuides />;
      case 'companions':
        return <AdminCompanions />;
      case 'bookings':
        return <AdminBookings />;
      case 'content':
        return <AdminContent />;
      case 'stories':
        return <AdminStories />;
      case 'partners':
        return <AdminPartners />;
      case 'cities':
        return <AdminCities />;
      case 'hotels':
        return <AdminHotels type="hotels" />;
      case 'restaurants':
        return <AdminRestaurants type="restaurants" />;
      case 'cafes':
        return <AdminCafes type="cafes" />;
      case 'likes':
        return <AdminLikes />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'payments':
        return <AdminPayments />;
      case 'messages':
        return <AdminMessages />;
      case 'support':
        return <AdminSupport />;
      case 'moderation':
        return <AdminModeration />;
      case 'security':
        return <AdminSecurity />;
      case 'feedback':
        return <AdminFeedback />;
      case 'audit':
        return <AdminAuditLogs />;
      case 'reports':
        return <AdminReports />;
      default:
        return <AdminOverview onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
};

const AdminAppRoutes: React.FC = () => {
  const { status } = useAdminAuth();

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-text-secondary">Loading...</div></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/unauthorized" element={<AdminUnauthorized />} />
      <Route
        path="/"
        element={
          <AdminAuthGuard>
            <AdminDashboard />
          </AdminAuthGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AdminErrorBoundary>
      <BrowserRouter>
        <AdminAuthProvider>
          <ToastProvider>
            <AdminAppRoutes />
          </ToastProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </AdminErrorBoundary>
  );
}
