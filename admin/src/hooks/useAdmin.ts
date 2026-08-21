import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth as useAdminSession } from '../contexts/AdminAuthContext';
import { type AdminRole } from '../services/admin';
import { aggregationService, type PlatformMetrics, type AggregatedBookingStats, type AggregatedUserStats, type AggregatedContentStats } from '../services/aggregation';
import { healthService, type SystemHealth } from '../services/health';

export interface AdminAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole | null;
  permissions: string[];
}

export const useAdminAuth = (requiredPermission?: string) => {
  const { session, status, error, hasPermission, isActionAllowed } = useAdminSession();
  
  const mappedUser: AdminAuthUser | null = session ? {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    permissions: session.permissions,
  } : null;

  const effectiveStatus = requiredPermission && status === 'authenticated' && !hasPermission(requiredPermission)
    ? 'unauthorized'
    : status;

  const hasPerm = useCallback((permission: string): boolean => {
    return hasPermission(permission);
  }, [hasPermission]);

  const canDo = useCallback((permission: string): boolean => {
    return hasPermission(permission);
  }, [hasPermission]);

  return {
    status: effectiveStatus,
    user: mappedUser,
    error: error || null,
    hasPerm,
    canDo,
    isActionAllowed,
    isAdmin: effectiveStatus === 'authenticated',
    role: mappedUser?.role || null,
    permissions: mappedUser?.permissions || [],
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
