import { firestore } from './firestore';

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  targetType: 'user' | 'companion' | 'booking' | 'guideApplication' | 'content' | 'security';
  targetId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export const auditService = {
  log: async (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    await firestore.setDocument('auditLogs', {
      ...entry,
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
