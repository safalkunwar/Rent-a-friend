import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { AdminBookingRow } from '../types';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminPagination } from '../hooks/useAdminPagination';
import { useAdminAuth } from '../hooks/useAdmin';
import { VirtualizedTable } from '../components/VirtualizedTable';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 72;

type BookingAction = 'confirm' | 'cancel' | 'complete' | 'reject';

export function AdminBookings() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingRow | null>(null);
  const [processing, setProcessing] = useState(false);

  const { items: bookings, loading, hasMore, nextPage } = useAdminPagination<AdminBookingRow>(
    async ({ startAfter, limitCount }) => {
      const result = await adminRepository.listBookings(limitCount, startAfter);
      return { items: result.items, lastVisible: result.lastVisible, hasMore: result.hasMore };
    },
    PAGE_SIZE
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(b => 
      b.id.toLowerCase().includes(q) || 
      b.userId.toLowerCase().includes(q) ||
      b.companionId.toLowerCase().includes(q) ||
      (b.meetingPoint || '').toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const executeBookingAction = async (bookingId: string, action: BookingAction) => {
    if (!adminUser || !hasPerm('bookings.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(action, adminUser.uid, 5)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(action, bookingId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      await adminRepository.updateBookingStatus(bookingId, action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : action === 'complete' ? 'completed' : 'rejected');
      await idempotencyService.set(idempotencyKey, action, bookingId, { success: true });

      await auditService.log({
        action: `booking_${action}`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'booking',
        targetId: bookingId,
        details: { action },
      });

      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : action === 'complete' ? 'completed' : 'rejected' });
      }
    } catch (err: any) {
      console.error(`Failed to ${action} booking:`, err);
      alert(`Failed to ${action} booking: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'pending': return 'bg-primary-action/10 text-primary-action border-primary-action/30';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'rejected': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
        <h3 className="font-semibold text-sm">All Bookings</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-elevated px-2 py-1.5 rounded-lg border border-border-token">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-xs text-text-primary outline-none">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && bookings.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Loading bookings...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No bookings found.</p>
        )}

        {filtered.length > 0 && (
          <VirtualizedTable
            items={filtered}
            rowHeight={ROW_HEIGHT}
            containerHeight={Math.min(600, filtered.length * ROW_HEIGHT)}
            renderRow={(booking) => (
              <div className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors border-b border-border-token/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500 truncate">{booking.id}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary truncate">
                    User <span className="font-medium">{booking.userId}</span> booked companion <span className="font-medium text-primary-action">{booking.companionId}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{booking.date} at {booking.time} • {booking.duration}h • {booking.participants} people</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {hasPerm('bookings.write') && booking.status === 'pending' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => executeBookingAction(booking.id, 'confirm')}
                        disabled={processing}
                        className="p-1.5 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10 transition-colors disabled:opacity-50"
                        title="Confirm"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => executeBookingAction(booking.id, 'reject')}
                        disabled={processing}
                        className="p-1.5 text-orange-400 hover:text-orange-300 rounded-lg hover:bg-orange-500/10 transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {hasPerm('bookings.write') && booking.status === 'confirmed' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => executeBookingAction(booking.id, 'complete')}
                        disabled={processing}
                        className="p-1.5 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                        title="Complete"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => executeBookingAction(booking.id, 'cancel')}
                        disabled={processing}
                        className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button onClick={() => setSelectedBooking(booking)} className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <div className="text-right min-w-[80px]">
                    <div className="font-medium text-text-primary text-sm">NPR {booking.totalPrice.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">{booking.date}</div>
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {hasMore && (
        <div className="p-4 border-t border-border-token flex justify-center">
          <button onClick={nextPage} disabled={loading} className="px-6 py-2 bg-primary-action text-background text-xs font-bold rounded-lg hover:bg-primary-action-hover transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
          <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-token flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Booking ID</p>
                  <p className="text-sm text-text-primary font-mono">{selectedBooking.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusColor(selectedBooking.status)}`}>{selectedBooking.status}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
                  <p className="text-sm text-text-primary">{selectedBooking.userId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Companion ID</p>
                  <p className="text-sm text-primary-action">{selectedBooking.companionId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date & Time</p>
                  <p className="text-sm text-text-primary">{selectedBooking.date} at {selectedBooking.time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Duration / Participants</p>
                  <p className="text-sm text-text-primary">{selectedBooking.duration} hrs • {selectedBooking.participants} people</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Meeting Point</p>
                  <p className="text-sm text-text-primary">{selectedBooking.meetingPoint || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Price</p>
                  <p className="text-sm font-bold text-primary-action">NPR {selectedBooking.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
