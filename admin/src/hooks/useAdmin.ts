import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { firestore } from '../services/firestore';
import { hasPermission, getRolePermissions, type AdminRole } from '../services/admin';
import { adminRateLimiter } from '../services/rateLimiter';
import { aggregationService, type PlatformMetrics, type AggregatedBookingStats, type AggregatedUserStats, type AggregatedContentStats } from '../services/aggregation';
import { healthService, type SystemHealth } from '../services/health';

type AuthStatus = 'loading' | 'authenticated' | 'unauthorized';

export interface AdminAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole | null;
  permissions: string[];
}

export const useAdminAuth = (requiredPermission?: string) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AdminAuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;
      if (!firebaseUser) {
        setUser(null);
        setStatus('unauthorized');
        return;
      }

      try {
        const claimRole = (await firebaseUser.getIdTokenResult()).claims.adminRole as AdminRole | undefined;
        const adminDoc = claimRole 
          ? { role: claimRole }
          : await firestore.getDocument<{ role: AdminRole }>(`admins/${firebaseUser.uid}`);
        const role = adminDoc?.role ?? null;

        if (!role) {
          setUser(null);
          setStatus('unauthorized');
          return;
        }

        const permissions = getRolePermissions(role);
        const adminUser: AdminAuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role,
          permissions,
        };

        setUser(adminUser);

        if (requiredPermission && !permissions.includes(requiredPermission)) {
          setStatus('unauthorized');
          return;
        }

        setStatus('authenticated');
      } catch (err: any) {
        setError(err.message || 'Failed to load admin session');
        setStatus('unauthorized');
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [requiredPermission]);

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
    status,
    user,
    error,
    hasPerm,
    canDo,
    isActionAllowed,
    isAdmin: status === 'authenticated',
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
