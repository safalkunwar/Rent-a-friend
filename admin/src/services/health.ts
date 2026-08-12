export type HealthStatus = 'healthy' | 'degraded' | 'warning' | 'critical';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  lastChecked: string;
  error?: string;
}

export interface SystemHealth {
  overall: HealthStatus;
  checks: HealthCheck[];
  lastUpdated: string;
}

export const healthService = {
  async checkFirestore(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const { firestore } = await import('../services/firestore');
      await firestore.getDocuments('users', { limitCount: 1 });
      return {
        name: 'Firestore',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'Firestore',
        status: 'critical',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: error?.message || 'Unknown error',
      };
    }
  },

  async checkAuth(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const { auth } = await import('../firebase');
      const user = auth?.currentUser;
      return {
        name: 'Authentication',
        status: user ? 'healthy' : 'degraded',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'Authentication',
        status: 'critical',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: error?.message || 'Unknown error',
      };
    }
  },

  async checkStorage(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const { storage } = await import('../firebase');
      return {
        name: 'Storage',
        status: storage ? 'healthy' : 'degraded',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        name: 'Storage',
        status: 'critical',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: error?.message || 'Unknown error',
      };
    }
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const [firestore, auth, storage] = await Promise.all([
      this.checkFirestore(),
      this.checkAuth(),
      this.checkStorage(),
    ]);

    const checks = [firestore, auth, storage];
    const overall = checks.some((c) => c.status === 'critical')
      ? 'critical'
      : checks.some((c) => c.status === 'degraded')
        ? 'degraded'
        : checks.some((c) => c.status === 'warning')
          ? 'warning'
          : 'healthy';

    return {
      overall,
      checks,
      lastUpdated: new Date().toISOString(),
    };
  },
};
