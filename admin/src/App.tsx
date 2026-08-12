import React from 'react';
import { useState, useEffect } from 'react';
import { Activity, UserCheck, CalendarDays, ShieldAlert, MessageSquare, LogOut, Users, Briefcase } from 'lucide-react';
import * as motion from 'motion/react-client';

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
import { AdminAuthGuard } from './components/AdminAuthGuard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'guides' | 'companions' | 'bookings' | 'content' | 'security' | 'feedback' | 'moderation' | 'audit'>('overview');

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-background font-sans text-text-primary flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border-token hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border-token">
           <span className="text-xl font-semibold tracking-tight text-text-primary">SATHI <span className="text-primary-action">Admin</span></span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
           <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <Activity className="w-4 h-4" /> Overview
           </button>
           <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <Users className="w-4 h-4" /> Users
           </button>
           <button onClick={() => setActiveTab('guides')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'guides' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <UserCheck className="w-4 h-4" /> Guides & Verification
           </button>
           <button onClick={() => setActiveTab('companions')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'companions' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <Briefcase className="w-4 h-4" /> Companions
           </button>
           <button onClick={() => setActiveTab('bookings')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'bookings' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <CalendarDays className="w-4 h-4" /> Bookings
           </button>
           <button onClick={() => setActiveTab('content')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'content' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <Briefcase className="w-4 h-4" /> Content
           </button>
           <button onClick={() => setActiveTab('moderation')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'moderation' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <ShieldAlert className="w-4 h-4" /> Moderation
           </button>
           <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-red-500/10 text-red-500' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <ShieldAlert className="w-4 h-4" /> Security & SOS
           </button>
           <button onClick={() => setActiveTab('feedback')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'feedback' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <MessageSquare className="w-4 h-4" /> Feedback & Alerts
           </button>
           <button onClick={() => setActiveTab('audit')} className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'audit' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'}`}>
             <ShieldAlert className="w-4 h-4" /> Audit Logs
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
         {/* Mobile Header */}
         <div className="md:hidden h-14 bg-background border-b border-border-token flex items-center justify-between px-4 sticky top-0 z-50">
            <span className="font-semibold text-text-primary">SATHI Admin</span>
            <div className="flex gap-2">
               <button onClick={() => setActiveTab('security')} className="p-2 text-red-500 hover:text-red-400"><ShieldAlert className="w-5 h-5" /></button>
               <a href="/" className="p-2 text-text-secondary hover:text-text-primary"><LogOut className="w-5 h-5" /></a>
            </div>
         </div>
         
          {/* Mobile Nav Tabs */}
          <div className="md:hidden flex overflow-x-auto bg-background border-b border-border-token hide-scrollbar">
            {['overview', 'users', 'guides', 'companions', 'bookings', 'content', 'moderation', 'security', 'feedback', 'audit'].map((tab) => (
              <button
                 key={tab}
                 onClick={() => setActiveTab(tab as any)}
                 className={`px-4 py-3 text-xs font-medium whitespace-nowrap capitalize ${activeTab === tab ? 'text-primary-action border-b-2 border-primary-action' : 'text-text-secondary'}`}
              >
                 {tab}
              </button>
            ))}
          </div>

         <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                 <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary capitalize">{activeTab.replace('-', ' ')}</h1>
                     <p className="text-text-secondary text-sm mt-1">
                        {activeTab === 'overview' && 'Monitor overall platform metrics and growth.'}
                        {activeTab === 'users' && 'Manage user accounts and roles.'}
                        {activeTab === 'guides' && 'Review and approve guides on the platform.'}
                        {activeTab === 'companions' && 'Manage companion profiles and verifications.'}
                        {activeTab === 'bookings' && 'Manage all platform transactions.'}
                        {activeTab === 'content' && 'Manage activities and events.'}
                        {activeTab === 'moderation' && 'Review and moderate community content and comments.'}
                        {activeTab === 'security' && 'Monitor suspicious activities and SOS alerts.'}
                        {activeTab === 'feedback' && 'Review user feedback and system notifications.'}
                        {activeTab === 'audit' && 'Review privileged actions and system audit trail.'}
                     </p>
                 </div>
              </div>

                {activeTab === 'overview' && <AdminOverview onNavigate={(tab) => setActiveTab(tab as any)} />}
               {activeTab === 'users' && <AdminUsers />}
               {activeTab === 'guides' && <AdminGuides />}
               {activeTab === 'companions' && <AdminCompanions />}
               {activeTab === 'bookings' && <AdminBookings />}
               {activeTab === 'content' && <AdminContent />}
               {activeTab === 'moderation' && <AdminModeration />}
               {activeTab === 'security' && <AdminSecurity />}
                {activeTab === 'feedback' && <AdminFeedback />}
                {activeTab === 'audit' && <AdminAuditLogs />}

             </motion.div>
          </div>
       </main>
      </div>
    </AdminAuthGuard>
  );
}
