import { useState, useEffect, useCallback } from 'react';
import { adminService, hasPermission, type AdminRole, getRolePermissions } from '../services/admin';
import { getRoleBadgeColor, getRoleLabel } from '../security/rbac';
import { adminRateLimiter } from '../services/rateLimiter';
import { aggregationService, type PlatformMetrics, type AggregatedBookingStats, type AggregatedUserStats, type AggregatedContentStats } from '../services/aggregation';
import { healthService, type SystemHealth } from '../services/health';

export interface AdminAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole | null;
  permissions: string[];
}

export const useAdminAuth = () => {
  const [user, setUser] = useState<AdminAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = adminService.onAuthStateChanged(async (authUser) => {
      if (cancelled) return;
      try {
        if (!authUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const role = await adminService.getUserRole(authUser.uid);
        if (!role) {
          setUser(null);
          setLoading(false);
          return;
        }

        const permissions = getRolePermissions(role);
        setUser({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          role,
          permissions,
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin session');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const hasPerm = useCallback((permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const canDo = useCallback((permission: string): boolean => {
    return hasPerm(permission);
  }, [hasPerm]);

  const isActionAllowed = useCallback((action: string): boolean => {
    if (!user) return false;
    return adminRateLimiter.checkAction(action, user.uid);
  }, [user]);

  return {
    user,
    loading,
    error,
    hasPerm,
    canDo,
    isActionAllowed,
    isAdmin: !!user,
    role: user?.role || null,
    permissions: user?.permissions || [],
  };
};

export const useAdminMetrics = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [bookingStats, setBookingStats] = useState<AggregatedBookingStats | null>(null);
  const [userStats, setUserStats] = useState<AggregatedUserStats | null>(null);
  const [contentStats, setContentStats] = useState<AggregatedContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const [platform, bookings, users, content] = await Promise.all([
        aggregationService.getPlatformMetrics(),
        aggregationService.getBookingStats(),
        aggregationService.getUserStats(),
        aggregationService.getContentStats(),
      ]);
      setMetrics(platform);
      setBookingStats(bookings);
      setUserStats(users);
      setContentStats(content);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  return {
    metrics,
    bookingStats,
    userStats,
    contentStats,
    loading,
    error,
    lastUpdated,
    refresh: loadMetrics,
  };
};

export const useSystemHealth = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      const result = await healthService.getSystemHealth();
      setHealth(result);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { health, loading, refresh: checkHealth };
};
