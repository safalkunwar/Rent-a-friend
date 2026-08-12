import { useState, useEffect } from 'react';
import { firestore } from '../services/firestore';
import { auditService } from '../services/audit';
import { AuditLogEntry } from '../types';

const PAGE_SIZE = 20;

export const useAdminAuditLogs = (limitCount = PAGE_SIZE) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore.subscribe<AuditLogEntry>('auditLogs', {
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount,
    }, (items) => {
      setLogs(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limitCount]);

  const search = (query: string) => {
    if (!query.trim()) return logs;
    const lower = query.toLowerCase();
    return logs.filter(log =>
      log.action.toLowerCase().includes(lower) ||
      log.actorName.toLowerCase().includes(lower) ||
      log.targetId?.toLowerCase().includes(lower)
    );
  };

  return { logs, loading, search };
};
