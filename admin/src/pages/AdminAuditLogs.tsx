import React, { useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { useAdminAuditLogs } from '../hooks/useAdminData';

export function AdminAuditLogs() {
  const { logs, loading, search } = useAdminAuditLogs(50);
  const [query, setQuery] = useState('');
  const filtered = search(query);

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary-action" /> Audit Logs
        </h3>
        <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
          />
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading audit logs...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No audit logs found.</p>
        )}
        {filtered.map((log, idx) => (
          <div key={`${log.id || 'log'}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-primary-action uppercase tracking-wider">{log.action}</span>
                <span className="text-[10px] text-gray-500">{log.targetType}</span>
              </div>
              <span className="text-[10px] text-gray-500">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400">
              <span>Actor: <span className="text-text-primary font-medium">{log.actorName}</span></span>
              <span>Target: <span className="text-text-primary font-medium">{log.targetId || '-'}</span></span>
            </div>
            {log.details && (
              <pre className="mt-2 text-[10px] text-gray-500 bg-surface-elevated p-2 rounded-lg overflow-x-auto">
                {JSON.stringify(log.details)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}