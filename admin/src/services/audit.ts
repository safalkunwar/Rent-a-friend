import { firestore } from './firestore';

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  targetType: 'user' | 'companion' | 'booking' | 'guideApplication' | 'content' | 'security' | 'comment' | 'report' | 'feedback' | 'notification' | 'sos' | 'post' | 'story' | 'kyc' | 'admin';
  targetId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export const auditService = {
  log: async (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const id = `audit-${Date.now()}`;
    await firestore.setDocument(`auditLogs/${id}`, {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
    });
  },

  list: async (limitCount = 100) => {
    return firestore.getDocuments<AuditLogEntry>('auditLogs', {
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount,
    });
  },
};
