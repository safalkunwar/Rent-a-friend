import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, AlertTriangle } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';

export function AdminPayments() {
  const { hasPerm } = useAdminAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const data = await adminRepository.listPayments(100);
      setPayments(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(p => 
      (p.id || '').toLowerCase().includes(q) || 
      (p.userId || '').toLowerCase().includes(q) ||
      (p.companionId || '').toLowerCase().includes(q) ||
      (p.provider || '').toLowerCase().includes(q)
    );
  }, [payments, search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'pending': return 'bg-primary-action/10 text-primary-action border-primary-action/30';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/30';
      default: return 'bg-surface-elevated text-text-secondary border-border-token';
    }
  };

  const totalRevenue = useMemo(() => {
    return payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const pendingAmount = useMemo(() => {
    return payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-white">NPR {totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">{payments.filter(p => p.status === 'completed').length} completed transactions</p>
        </div>
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <p className="text-sm text-gray-400 mb-1">Pending Amount</p>
          <p className="text-2xl font-bold text-primary-action">NPR {pendingAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">{payments.filter(p => p.status === 'pending').length} pending transactions</p>
        </div>
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <p className="text-sm text-gray-400 mb-1">Failed Transactions</p>
          <p className="text-2xl font-bold text-red-400">{payments.filter(p => p.status === 'failed').length}</p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
          <h3 className="font-semibold text-sm">All Payments</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search payments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading payments...</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No payments found.</p>}

          {filtered.length > 0 && (
            <div className="divide-y divide-border-token">
              {filtered.map((payment, idx) => (
                <div key={payment.id || `pay-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">{payment.id}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                      <span className="text-[10px] text-gray-500 capitalize">{payment.provider}</span>
                    </div>
                    <p className="text-sm text-text-primary">
                      User: <span className="font-medium">{payment.userId}</span> • Companion: <span className="font-medium text-primary-action">{payment.companionId}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Booking: {payment.bookingId} • {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="font-medium text-text-primary text-sm">NPR {payment.amount?.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{payment.currency || 'NPR'}</div>
                    </div>
                    {hasPerm('finance.read') && (
                      <button onClick={() => setSelectedPayment(payment)} className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPayment(null)}>
          <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-token flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary">Payment Details</h2>
              <button onClick={() => setSelectedPayment(null)} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payment ID</p>
                  <p className="text-sm text-text-primary font-mono">{selectedPayment.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusColor(selectedPayment.status)}`}>{selectedPayment.status}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
                  <p className="text-sm font-bold text-primary-action">NPR {selectedPayment.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Provider</p>
                  <p className="text-sm text-text-primary capitalize">{selectedPayment.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
                  <p className="text-sm text-text-primary">{selectedPayment.userId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Companion ID</p>
                  <p className="text-sm text-primary-action">{selectedPayment.companionId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Booking ID</p>
                  <p className="text-sm text-text-primary">{selectedPayment.bookingId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Transaction ID</p>
                  <p className="text-sm text-text-primary font-mono">{selectedPayment.transactionId || 'N/A'}</p>
                </div>
              </div>
              {selectedPayment.customerInfo && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Customer Info</p>
                  <div className="bg-surface border border-border-token rounded-xl p-4 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Name:</span><span className="text-sm">{selectedPayment.customerInfo.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Email:</span><span className="text-sm">{selectedPayment.customerInfo.email}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 text-sm">Phone:</span><span className="text-sm">{selectedPayment.customerInfo.phone}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
