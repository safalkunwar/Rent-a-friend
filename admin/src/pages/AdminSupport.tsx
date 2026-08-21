import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageSquare, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export function AdminSupport() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await adminRepository.listSupportTickets(100);
      setTickets(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = tickets;
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => 
        (t.id || '').toLowerCase().includes(q) || 
        (t.subject || '').toLowerCase().includes(q) ||
        (t.userId || '').toLowerCase().includes(q) ||
        (t.message || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, search, statusFilter]);

  const executeAction = async (ticketId: string, action: string) => {
    if (!adminUser || !hasPerm('content.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(`ticket_${action}`, adminUser.uid, 20)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(`ticket_${action}`, ticketId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      await adminRepository.updateSupportTicketStatus(ticketId, action);
      await idempotencyService.set(idempotencyKey, `ticket_${action}`, ticketId, { success: true });

      await auditService.log({
        action: `ticket_${action}`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'support_ticket',
        targetId: ticketId,
        details: { action },
      });

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: action } : t));
      setSelectedTicket(null);
      setReplyText('');
    } catch (err: any) {
      console.error(`Failed to ${action} ticket:`, err);
      alert(`Failed to ${action} ticket: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'closed': return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
      default: return 'bg-surface-elevated text-text-secondary border-border-token';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-background border border-border-token rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Open Tickets</p>
          <p className="text-xl font-bold text-red-400">{tickets.filter(t => t.status === 'open').length}</p>
        </div>
        <div className="bg-background border border-border-token rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">In Progress</p>
          <p className="text-xl font-bold text-yellow-400">{tickets.filter(t => t.status === 'in_progress').length}</p>
        </div>
        <div className="bg-background border border-border-token rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Resolved</p>
          <p className="text-xl font-bold text-green-400">{tickets.filter(t => t.status === 'resolved').length}</p>
        </div>
        <div className="bg-background border border-border-token rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Closed</p>
          <p className="text-xl font-bold text-gray-400">{tickets.filter(t => t.status === 'closed').length}</p>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
        <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
          <h3 className="font-semibold text-sm">Support Tickets</h3>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')} className="bg-surface-elevated border border-border-token text-text-primary text-xs rounded-lg px-3 py-1.5 outline-none">
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading tickets...</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No tickets found.</p>}

          {filtered.length > 0 && (
            <div className="divide-y divide-border-token">
              {filtered.map((ticket, idx) => (
                <div key={ticket.id || `ticket-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">{ticket.id}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary truncate">{ticket.subject || 'No subject'}</p>
                    <p className="text-xs text-gray-500 truncate">{ticket.message || ''}</p>
                    <p className="text-xs text-gray-400 mt-1">User: {ticket.userId} • {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {hasPerm('content.write') && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                      <button onClick={() => executeAction(ticket.id, 'in_progress')} disabled={processing} className="px-2 py-1 text-yellow-400 hover:text-yellow-300 rounded-lg hover:bg-yellow-500/10 transition-colors text-xs disabled:opacity-50">
                        In Progress
                      </button>
                    )}
                    {hasPerm('content.write') && ticket.status === 'in_progress' && (
                      <button onClick={() => executeAction(ticket.id, 'resolved')} disabled={processing} className="px-2 py-1 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10 transition-colors text-xs disabled:opacity-50">
                        Resolve
                      </button>
                    )}
                    {hasPerm('content.write') && ticket.status === 'resolved' && (
                      <button onClick={() => executeAction(ticket.id, 'closed')} disabled={processing} className="px-2 py-1 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-500/10 transition-colors text-xs disabled:opacity-50">
                        Close
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
