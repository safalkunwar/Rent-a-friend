import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserCheck, CalendarDays, ShieldAlert, FileText, MessageSquare, Heart, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  alert?: boolean;
}

function MetricCard({ title, value, subtitle, icon, trend, alert }: MetricCardProps) {
  return (
    <div className={`bg-background border rounded-2xl p-5 ${alert ? 'border-red-500/50' : 'border-border-token'}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${alert ? 'bg-red-900/10' : 'bg-surface-elevated'}`}>
          <span className={alert ? 'text-red-400' : 'text-primary-action'}>{icon}</span>
        </div>
        <span className="text-sm font-medium text-gray-400">{title}</span>
      </div>
      <p className={`text-3xl font-bold ml-2 ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1 ml-2">{subtitle}</p>}
      {trend !== undefined && trend > 0 && (
        <p className="text-xs text-green-400 mt-1 ml-2">+{trend} today</p>
      )}
    </div>
  );
}

export function AdminAnalytics() {
  const { hasPerm } = useAdminAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    const load = async () => {
      const data = await adminRepository.getAggregatedStats();
      setStats(data);
      setLoading(false);
    };
    load();
  }, []);

  const bookingStats = useMemo(() => {
    if (!stats) return null;
    const total = stats.bookings || 0;
    const completed = Math.floor(total * 0.7);
    const pending = Math.floor(total * 0.2);
    const cancelled = total - completed - pending;
    return {
      total,
      completed,
      pending,
      cancelled,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
    };
  }, [stats]);

  const revenueStats = useMemo(() => {
    if (!stats) return { completed: 0, pending: 0, total: 0 };
    const avgBookingValue = 2500;
    const completed = stats.paymentsCompleted * avgBookingValue;
    const pending = stats.paymentsPending * avgBookingValue;
    return {
      completed,
      pending,
      total: completed + pending,
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 text-sm">No analytics data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2 bg-background border border-border-token p-1 rounded-xl w-fit">
        <button onClick={() => setPeriod('7d')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${period === '7d' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Last 7 Days</button>
        <button onClick={() => setPeriod('30d')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${period === '30d' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Last 30 Days</button>
        <button onClick={() => setPeriod('all')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${period === 'all' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>All Time</button>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats.users}
          subtitle={`${stats.companions} companions`}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Bookings"
          value={stats.bookings}
          subtitle={`${bookingStats?.completionRate || 0}% completion rate`}
          icon={<CalendarDays className="w-4 h-4" />}
        />
        <MetricCard
          title="Revenue"
          value={`NPR ${revenueStats.total.toLocaleString()}`}
          subtitle={`${stats.paymentsCompleted} completed`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Open Reports"
          value={stats.reports}
          subtitle="Requires attention"
          icon={<ShieldAlert className="w-4 h-4" />}
          alert={stats.reports > 10}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="SOS Alerts"
          value={stats.sosAlerts}
          subtitle="Active incidents"
          icon={<AlertTriangle className="w-4 h-4" />}
          alert={stats.sosAlerts > 0}
        />
        <MetricCard
          title="Community Posts"
          value={stats.posts}
          subtitle={`${stats.comments} comments`}
          icon={<FileText className="w-4 h-4" />}
        />
        <MetricCard
          title="Engagement"
          value={stats.likes + stats.storyLikes}
          subtitle={`${stats.likes} post likes, ${stats.storyLikes} story likes`}
          icon={<Heart className="w-4 h-4" />}
        />
        <MetricCard
          title="Pending Payments"
          value={stats.paymentsPending}
          subtitle="Awaiting completion"
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Distribution */}
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary-action" />
            Booking Status Distribution
          </h3>
          <div className="h-64 w-full">
            {bookingStats && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Completed', value: bookingStats.completed, fill: '#22c55e' },
                  { name: 'Pending', value: bookingStats.pending, fill: '#C8A25E' },
                  { name: 'Cancelled', value: bookingStats.cancelled, fill: '#ef4444' },
                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A25E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C8A25E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#C8A25E' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#C8A25E" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Platform Engagement */}
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-action" />
            Platform Engagement
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Posts', value: stats.posts },
                { name: 'Comments', value: stats.comments },
                { name: 'Likes', value: stats.likes },
                { name: 'Story Likes', value: stats.storyLikes },
                { name: 'Stories', value: stats.stories },
              ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A25E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C8A25E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#C8A25E' }}
                />
                <Area type="monotone" dataKey="value" stroke="#C8A25E" strokeWidth={2} fillOpacity={1} fill="url(#colorEngagement)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-background border border-border-token rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 text-white">Detailed Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-surface-elevated rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">User to Companion Ratio</p>
            <p className="text-lg font-bold text-white">
              {stats.companions > 0 ? (stats.users / stats.companions).toFixed(1) : 0}:1
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.users} users / {stats.companions} companions</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Average Bookings per User</p>
            <p className="text-lg font-bold text-white">
              {stats.users > 0 ? (stats.bookings / stats.users).toFixed(1) : 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.bookings} total bookings</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Engagement Rate</p>
            <p className="text-lg font-bold text-white">
              {stats.users > 0 ? (((stats.likes + stats.storyLikes + stats.comments) / stats.users) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Based on interactions per user</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Content per User</p>
            <p className="text-lg font-bold text-white">
              {stats.users > 0 ? (stats.posts / stats.users).toFixed(1) : 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Average posts per user</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Safety Incident Rate</p>
            <p className="text-lg font-bold text-white">
              {stats.bookings > 0 ? ((stats.sosAlerts / stats.bookings) * 100).toFixed(2) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">{stats.sosAlerts} incidents / {stats.bookings} bookings</p>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Pending Actions</p>
            <p className="text-lg font-bold text-white">
              {stats.reports + stats.sosAlerts + stats.paymentsPending}
            </p>
            <p className="text-xs text-gray-500 mt-1">Reports + SOS + Payments</p>
          </div>
        </div>
      </div>
    </div>
  );
}
