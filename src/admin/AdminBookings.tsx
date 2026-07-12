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
    <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1a1a1a]">
        <h3 className="font-semibold text-sm">All Bookings</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#222] px-2 py-1.5 rounded-lg border border-[#333]">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-xs text-white outline-none">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-[#222] px-3 py-1.5 rounded-lg border border-[#333]">
            <Search className="w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-white outline-none w-32 md:w-auto" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No bookings found.</p>}
        {filtered.map(booking => (
          <div key={booking.id} className="p-4 bg-[#1a1a1a] rounded-xl border border-[#222] flex items-center justify-between hover:border-[#C8A25E]/50 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono text-gray-500">{booking.id}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : booking.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-[#C8A25E]/10 text-[#C8A25E]'}`}>
                  {booking.status}
                </span>
              </div>
              <p className="text-sm text-white">
                <span className="font-medium">{booking.userId}</span> booked companion <span className="font-medium text-[#C8A25E]">{booking.companionId}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedBooking(booking)} className="p-1.5 rounded-lg text-[#C8A25E] hover:bg-[#C8A25E]/10 transition-colors"><Eye className="w-4 h-4" /></button>
              <div className="text-right">
                <div className="font-medium text-white text-sm">NPR {booking.totalPrice.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">{booking.date} at {booking.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop:blur-sm" onClick={() => setSelectedBooking(null)}>
          <div className="bg-[#111] border border-[#222] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#222] flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="text-[#8E9299] hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Booking ID</p>
                  <p className="text-sm text-white font-mono">{selectedBooking.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${selectedBooking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : selectedBooking.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-[#C8A25E]/10 text-[#C8A25E]'}`}>{selectedBooking.status}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
                  <p className="text-sm text-white">{selectedBooking.userId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Companion ID</p>
                  <p className="text-sm text-[#C8A25E]">{selectedBooking.companionId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date & Time</p>
                  <p className="text-sm text-white">{selectedBooking.date} at {selectedBooking.time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Duration / Participants</p>
                  <p className="text-sm text-white">{selectedBooking.duration} hrs • {selectedBooking.participants} people</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Meeting Point</p>
                  <p className="text-sm text-white">{selectedBooking.meetingPoint || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Price</p>
                  <p className="text-sm font-bold text-[#C8A25E]">NPR {selectedBooking.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
