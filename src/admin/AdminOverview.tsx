import React, { useState, useEffect } from 'react';
import { Users, UserCheck, CalendarDays, ShieldAlert, UserPlus, FileText, AlertTriangle, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { firestore } from '../services/firestore';

interface AdminOverviewProps {
  onNavigate?: (tab: string) => void;
}

interface Stats {
  users: number;
  guides: number;
  pending: number;
  bookings: number;
  activeBookings: number;
  sosActive: number;
  postsCount: number;
  commentsCount: number;
}

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    guides: 0,
    pending: 0,
    bookings: 0,
    activeBookings: 0,
    sosActive: 0,
    postsCount: 0,
    commentsCount: 0,
  });
  const [chartData, setChartData] = useState<Array<{ name: string; users: number; bookings: number }>>([]);

  useEffect(() => {
    const unsubUsers = firestore.subscribe('users', { limitCount: 1 }, (items) => {
      setStats(prev => ({ ...prev, users: items.length }));
    });

    const unsubCompanions = firestore.subscribe('companions', { limitCount: 1 }, (items) => {
      setStats(prev => ({ ...prev, guides: items.length }));
    });

    const unsubBookings = firestore.subscribe('bookings', { limitCount: 100 }, (items) => {
      const active = items.filter(b => b.status === 'confirmed' || b.status === 'active').length;
      setStats(prev => ({ ...prev, bookings: items.length, activeBookings: active }));
      const monthly = new Map<string, { users: number; bookings: number }>();
      items.forEach((booking: any) => {
        const date = booking.createdAt || booking.date;
        if (!date) return;
        const month = new Date(date).toLocaleString('default', { month: 'short' });
        if (!monthly.has(month)) monthly.set(month, { users: 0, bookings: 0 });
        const entry = monthly.get(month)!;
        entry.bookings += 1;
      });
      const data = Array.from(monthly.entries()).map(([name, values]) => ({ name, ...values }));
      setChartData(data);
    });

    const unsubPending = firestore.subscribe('guideApplications', { where: [{ field: 'status', operator: '==', value: 'pending' }], limitCount: 1 }, (items) => {
      setStats(prev => ({ ...prev, pending: items.length }));
    });

    const unsubSOS = firestore.subscribe('sosAlerts', { where: [{ field: 'status', operator: '==', value: 'active' }], limitCount: 1 }, (items) => {
      setStats(prev => ({ ...prev, sosActive: items.length }));
    });

    const unsubPosts = firestore.subscribe('community_posts', { where: [{ field: 'status', operator: '==', value: 'published' }], limitCount: 1 }, (items) => {
      setStats(prev => ({ ...prev, postsCount: items.length }));
    });

    const unsubComments = firestore.subscribe('comments', { limitCount: 1 }, (items) => {
      setStats(prev => ({ ...prev, commentsCount: items.length }));
    });

    return () => {
      unsubUsers();
      unsubCompanions();
      unsubBookings();
      unsubPending();
      unsubSOS();
      unsubPosts();
      unsubComments();
    };
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-surface-elevated rounded-lg">
              <Users className="w-4 h-4 text-primary-action" />
            </div>
            <span className="text-sm font-medium text-gray-400">Total Users</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.users}</p>
        </div>
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-surface-elevated rounded-lg">
              <UserCheck className="w-4 h-4 text-primary-action" />
            </div>
            <span className="text-sm font-medium text-gray-400">Active Guides</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.guides}</p>
        </div>
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-900/10 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-yellow-500" />
            </div>
            <span className="text-sm font-medium text-gray-400">Pending</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.pending}</p>
        </div>
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-surface-elevated rounded-lg">
              <CalendarDays className="w-4 h-4 text-primary-action" />
            </div>
            <span className="text-sm font-medium text-gray-400">Total Bookings</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.bookings}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-surface-elevated rounded-lg">
              <CalendarDays className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-sm font-medium text-gray-400">Active Bookings</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.activeBookings}</p>
        </div>
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-900/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-medium text-gray-400">Active SOS</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.sosActive}</p>
        </div>
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-surface-elevated rounded-lg">
              <FileText className="w-4 h-4 text-primary-action" />
            </div>
            <span className="text-sm font-medium text-gray-400">Community Posts</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.postsCount}</p>
        </div>
        <div className="bg-background border border-border-token p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-surface-elevated rounded-lg">
              <MessageSquare className="w-4 h-4 text-primary-action" />
            </div>
            <span className="text-sm font-medium text-gray-400">Comments</span>
          </div>
          <p className="text-3xl font-bold text-white ml-2">{stats.commentsCount}</p>
        </div>
      </div>

      <div className="bg-background border border-border-token rounded-2xl p-5 mb-8 mt-8">
        <h3 className="font-semibold text-sm mb-4 text-white">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => onNavigate?.('guides')} className="flex items-center gap-3 p-4 bg-surface border border-border-token rounded-xl hover:border-primary-action/50 transition-colors text-left">
            <UserPlus className="w-5 h-5 text-primary-action" />
            <div>
              <p className="text-sm font-medium text-white">Review Guides</p>
              <p className="text-xs text-gray-400">{stats.pending} pending applications</p>
            </div>
          </button>
          <button onClick={() => onNavigate?.('bookings')} className="flex items-center gap-3 p-4 bg-surface border border-border-token rounded-xl hover:border-primary-action/50 transition-colors text-left">
            <CalendarDays className="w-5 h-5 text-primary-action" />
            <div>
              <p className="text-sm font-medium text-white">Manage Bookings</p>
              <p className="text-xs text-gray-400">{stats.bookings} total bookings</p>
            </div>
          </button>
          <button onClick={() => onNavigate?.('security')} className="flex items-center gap-3 p-4 bg-surface border border-border-token rounded-xl hover:border-red-500/50 transition-colors text-left">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-white">Security Center</p>
              <p className="text-xs text-gray-400">Review SOS & alerts</p>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-background border border-border-token rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-6 text-white">Platform Growth Overview</h3>
        <div className="h-64 w-full text-xs">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A25E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C8A25E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{ fill: '#666' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#666" tick={{ fill: '#666' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#C8A25E' }}
                />
                <Area type="monotone" dataKey="bookings" stroke="#C8A25E" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
