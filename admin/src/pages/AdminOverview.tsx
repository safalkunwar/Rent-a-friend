import React from 'react';
import { Users, UserCheck, CalendarDays, ShieldAlert, FileText, MessageSquare, Activity, TrendingUp, AlertTriangle, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminMetrics, useSystemHealth } from '../hooks/useAdmin';
import { getRoleBadgeColor } from '../security/rbac';

interface AdminOverviewProps {
  onNavigate?: (tab: string) => void;
}

export function AdminOverview({ onNavigate }: AdminOverviewProps) {
  const { metrics, bookingStats, userStats, contentStats, loading, error, lastUpdated, refresh } = useAdminMetrics();
  const { health, loading: healthLoading } = useSystemHealth();

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-medium">Failed to load dashboard metrics</p>
        <button onClick={refresh} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Banner */}
      {health && !healthLoading && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          health.overall === 'healthy' ? 'bg-green-500/10 border-green-500/30' :
          health.overall === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/30' :
          health.overall === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <Server className={`w-5 h-5 ${
            health.overall === 'healthy' ? 'text-green-400' :
            health.overall === 'degraded' ? 'text-yellow-400' :
            health.overall === 'warning' ? 'text-orange-400' :
            'text-red-400'
          }`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-white capitalize">{health.overall}</p>
            <p className="text-xs text-gray-400">
              {health.checks.map((c) => c.name).join(', ')} • Updated {new Date(health.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${
            health.overall === 'healthy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
            health.overall === 'degraded' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
            health.overall === 'warning' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
            'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            {health.overall}
          </span>
        </div>
      )}

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={loading ? '...' : metrics?.totalUsers ?? 0}
          subtitle={`+${metrics?.newUsers24h ?? 0} in last 24h`}
          icon={<Users className="w-4 h-4" />}
          trend={metrics?.newUsers24h ?? 0}
        />
        <MetricCard
          title="Active Companions"
          value={loading ? '...' : metrics?.activeCompanions ?? 0}
          subtitle={`${metrics?.pendingCompanionApplications ?? 0} pending applications`}
          icon={<UserCheck className="w-4 h-4" />}
          trend={metrics?.pendingCompanionApplications ?? 0}
        />
        <MetricCard
          title="Active Bookings"
          value={loading ? '...' : (metrics?.activeBookings ?? 0) + (metrics?.pendingBookings ?? 0)}
          subtitle={`${metrics?.pendingBookings ?? 0} pending`}
          icon={<CalendarDays className="w-4 h-4" />}
          trend={metrics?.completedBookings24h ?? 0}
        />
        <MetricCard
          title="Open Reports"
          value={loading ? '...' : metrics?.openReports ?? 0}
          subtitle={`${metrics?.totalReports ?? 0} total reports`}
          icon={<ShieldAlert className="w-4 h-4" />}
          alert={metrics && metrics.openReports > 10}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="SOS Incidents"
          value={loading ? '...' : metrics?.activeSOSIncidents ?? 0}
          subtitle="Active incidents"
          icon={<AlertTriangle className="w-4 h-4" />}
          alert={metrics && metrics.activeSOSIncidents > 0}
        />
        <MetricCard
          title="Messages (24h)"
          value={loading ? '...' : metrics?.messagesSent24h ?? 0}
          subtitle={`${metrics?.messageDeliveryFailures24h ?? 0} failures`}
          icon={<MessageSquare className="w-4 h-4" />}
          alert={metrics && metrics.messageDeliveryFailures24h > 0}
        />
        <MetricCard
          title="Content (24h)"
          value={loading ? '...' : (metrics?.communityPosts24h ?? 0) + (metrics?.comments24h ?? 0)}
          subtitle={`${metrics?.likes24h ?? 0} likes`}
          icon={<FileText className="w-4 h-4" />}
        />
        <MetricCard
          title="Pending KYC"
          value={loading ? '...' : metrics?.pendingKYC ?? 0}
          subtitle="Awaiting review"
          icon={<UserCheck className="w-4 h-4" />}
          alert={metrics && metrics.pendingKYC > 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-action" />
            Booking Trends
          </h3>
          <div className="h-64 w-full">
            {bookingStats && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookingStats.byHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A25E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C8A25E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
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

        <div className="bg-background border border-border-token rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4 text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-action" />
            User Registrations
          </h3>
          <div className="h-64 w-full">
            {userStats && userStats.registrationsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userStats.registrationsByDay.slice(-7)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A25E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C8A25E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#C8A25E' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#C8A25E" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No registration data available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-background border border-border-token rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 text-white">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => onNavigate?.('guides')} className="flex items-center gap-3 p-4 bg-surface border border-border-token rounded-xl hover:border-primary-action/50 transition-colors text-left">
            <UserCheck className="w-5 h-5 text-primary-action" />
            <div>
              <p className="text-sm font-medium text-white">Review Guides</p>
              <p className="text-xs text-gray-400">{loading ? '...' : metrics?.pendingCompanionApplications ?? 0} pending applications</p>
            </div>
          </button>
          <button onClick={() => onNavigate?.('bookings')} className="flex items-center gap-3 p-4 bg-surface border border-border-token rounded-xl hover:border-primary-action/50 transition-colors text-left">
            <CalendarDays className="w-5 h-5 text-primary-action" />
            <div>
              <p className="text-sm font-medium text-white">Manage Bookings</p>
              <p className="text-xs text-gray-400">{loading ? '...' : (metrics?.activeBookings ?? 0) + (metrics?.pendingBookings ?? 0)} active/pending</p>
            </div>
          </button>
          <button onClick={() => onNavigate?.('security')} className="flex items-center gap-3 p-4 bg-surface border border-border-token rounded-xl hover:border-red-500/50 transition-colors text-left">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-white">Security Center</p>
              <p className="text-xs text-gray-400">{loading ? '...' : metrics?.activeSOSIncidents ?? 0} active SOS incidents</p>
            </div>
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
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
