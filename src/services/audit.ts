import { firestore } from './firestore';

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  targetType: 'user' | 'companion' | 'booking' | 'guideApplication' | 'content' | 'security' | 'comment';
  targetId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export const auditService = {
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
