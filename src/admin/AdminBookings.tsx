import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye } from 'lucide-react';
import { firestore } from '../services/firestore';
import { Booking } from '../types';

export function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const unsubscribe = firestore.subscribe<Booking>('bookings', { orderByField: 'createdAt', orderDirection: 'desc' }, (items) => {
      setBookings(items);
    });
    return () => unsubscribe();
  }, []);

  const filtered = bookings.filter(b => {
    const matchesSearch = b.id.includes(search) || b.meetingPoint?.toLowerCase().includes(search.toLowerCase()) || b.userId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <input type="text" placeholder="Search ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No bookings found.</p>}
        {filtered.map((booking, idx) => (
          <div key={`${booking.id || 'b'}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token flex items-center justify-between hover:border-primary-action/50 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono text-gray-500">{booking.id}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : booking.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-primary-action/10 text-primary-action'}`}>
                  {booking.status}
                </span>
              </div>
              <p className="text-sm text-text-primary">
                <span className="font-medium">{booking.userId}</span> booked companion <span className="font-medium text-primary-action">{booking.companionId}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedBooking(booking)} className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors"><Eye className="w-4 h-4" /></button>
              <div className="text-right">
                <div className="font-medium text-text-primary text-sm">NPR {booking.totalPrice.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">{booking.date} at {booking.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop:blur-sm" onClick={() => setSelectedBooking(null)}>
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
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${selectedBooking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : selectedBooking.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-primary-action/10 text-primary-action'}`}>{selectedBooking.status}</span>
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
