import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { useCompanions } from '../../hooks/useFirestoreData';
import { companionDashboardService } from '../../services/companionDashboard';
import { Star, ShieldCheck, Heart, MapPin, Settings, Calendar, X, Bell } from 'lucide-react';
import * as motion from 'motion/react-client';
import { SafeImage } from '../ui/SafeImage';

export const DashboardTab: React.FC = () => {
  const { currentUser, favorites, toggleFavorite, bookings, setCurrentUser, notifications } = useAppContext();
  const { showToast } = useToast();
  const { companions: fetchedCompanions } = useCompanions();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [companionStats, setCompanionStats] = useState<{
    totalEarnings: number;
    pendingRequests: number;
    profileViews: number;
    averageRating: number;
    totalReviews: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  if (!currentUser) return <div className="text-text-primary p-8">Please log in to view dashboard</div>;

  const favoriteCompanions = fetchedCompanions.filter(c => favorites.includes(c.id));
  const myBookings = bookings.filter(b => b.userId === currentUser.id);

  useEffect(() => {
    if (currentUser.role !== 'companion') return;
    let cancelled = false;
    setLoadingStats(true);
    companionDashboardService.getStats(currentUser.id)
      .then(stats => {
        if (!cancelled) {
          setCompanionStats({
            totalEarnings: stats.totalEarnings,
            pendingRequests: stats.pendingRequests,
            profileViews: stats.profileViews,
            averageRating: stats.averageRating,
            totalReviews: stats.totalReviews,
          });
        }
      })
      .catch(err => {
        console.error('[DashboardTab] Failed to load companion stats:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => { cancelled = true; };
  }, [currentUser.id, currentUser.role]);
  const totalSpent = myBookings.reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-surface border border-border-token rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-action/5 rounded-full blur-3xl" />
        <SafeImage src={currentUser.avatar} alt={currentUser.name} className="w-32 h-32 rounded-full border-4 border-surface-elevated shadow-xl relative z-10" fallbackType="avatar" textForInitials={currentUser.name} />

        <div className="flex-1 text-center md:text-left relative z-10">
          <h1 className="text-3xl font-bold text-text-primary mb-2">{currentUser.name}</h1>
          <p className="text-text-secondary mb-4">{currentUser.email}</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
             <span className="px-3 py-1 bg-surface-elevated text-text-primary rounded-lg border border-border-token capitalize">
               {currentUser.role} Account
             </span>
             {currentUser.role === 'customer' && (
               <span className="px-3 py-1 bg-surface-elevated text-primary-action rounded-lg border border-border-token">
                 {myBookings.length} Trips Booked
               </span>
             )}
          </div>
        </div>

        {isEditing ? (
          <div className="relative z-10 bg-surface border border-border-token rounded-xl p-5 flex flex-col gap-4 w-full md:w-auto">
            <button onClick={() => setIsEditing(false)} className="absolute top-3 right-3 text-text-secondary hover:text-text-primary"><X className="w-4 h-4" /></button>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold block mb-2">Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2 bg-surface-elevated border border-border-token rounded-xl text-text-primary outline-none focus:border-primary-action text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold block mb-2">Email</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-4 py-2 bg-surface-elevated border border-border-token rounded-xl text-text-primary outline-none focus:border-primary-action text-sm" />
            </div>
            <button onClick={() => { setCurrentUser({ ...currentUser!, name: editName, email: editEmail, avatar: currentUser!.avatar }); setIsEditing(false); showToast('Profile updated', 'success'); }} className="px-4 py-2 bg-primary-action text-white rounded-xl text-sm font-bold hover:bg-primary-action-hover transition-colors">Save Changes</button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="relative z-10 px-6 py-3 bg-surface-elevated text-text-primary border border-border-token rounded-xl hover:border-primary-action transition-colors flex items-center gap-2 font-medium"
          >
            <Settings className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>

      {currentUser.role === 'customer' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border-token rounded-2xl p-6">
              <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-2">Total Spent</h3>
              <p className="text-3xl font-bold text-text-primary">NPR {totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-surface border border-border-token rounded-2xl p-6">
              <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-2">Saved Favorites</h3>
              <p className="text-3xl font-bold text-text-primary">{favorites.length}</p>
            </div>
            <div className="bg-surface border border-border-token rounded-2xl p-6">
              <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-2">Upcoming Trips</h3>
              <p className="text-3xl font-bold text-text-primary">{myBookings.filter(b => b.status === 'confirmed').length}</p>
            </div>
          </div>

          {/* Recent Notifications */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Notifications</h2>
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification, idx) => (
                  <div key={`${notification.id || 'notif'}-${idx}`} className={`p-4 rounded-2xl border flex items-start gap-4 ${notification.isRead ? 'bg-surface border-border-token' : 'bg-primary-action/5 border-primary-action/20'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.isRead ? 'bg-surface-elevated text-text-secondary' : 'bg-primary-action/10 text-primary-action'}`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium mb-1 ${notification.isRead ? 'text-text-secondary' : 'text-text-primary'}`}>{notification.title}</h3>
                      <p className="text-xs text-text-secondary">{notification.message}</p>
                      <p className="text-[10px] text-text-muted mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                    </div>
                    {!notification.isRead && <span className="w-2 h-2 rounded-full bg-primary-action mt-2 shrink-0" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border-token rounded-2xl p-8 text-center text-text-secondary">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No notifications yet.</p>
              </div>
            )}
          </div>

          {/* Recent Bookings */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Recent Bookings</h2>
            {myBookings.length > 0 ? (
              <div className="space-y-4">
                {myBookings.slice(0, 3).map((booking, idx) => {
                  const companion = favoriteCompanions.find(c => c.id === booking.companionId) || fetchedCompanions.find(c => c.id === booking.companionId);
                  return (
                    <div key={`${booking.id || 'b'}-${idx}`} className="bg-surface border border-border-token rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {companion && (
                          <SafeImage src={companion.imageUrl} alt={companion.name} className="w-12 h-12 rounded-full object-cover border border-border-token" fallbackType="avatar" textForInitials={companion.name} />
                        )}
                        <div>
                          <h3 className="font-bold text-text-primary mb-1">Booking with {companion?.name || 'Companion'}</h3>
                          <p className="text-sm text-text-secondary flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {booking.date} at {booking.time}</p>
                          <p className="text-xs text-text-muted">{booking.duration} hour(s) x {booking.participants} people</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-primary-action">NPR {booking.totalPrice.toFixed(2)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full border ${booking.status === 'confirmed' ? 'bg-success/10 border-success/50 text-success' : booking.status === 'cancelled' ? 'bg-danger/10 border-danger/50 text-danger' : 'bg-warning/10 border-warning/50 text-warning'}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-surface border border-border-token rounded-2xl p-8 text-center text-text-secondary">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No bookings yet. Explore companions to book your first experience!</p>
              </div>
            )}
          </div>

          {/* Favorites List */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-6">Saved Favorites</h2>
            {favoriteCompanions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                {favoriteCompanions.map(companion => (
                  <div key={companion.id} className="group bg-surface rounded-[20px] overflow-hidden shadow-md border border-border-token/50 relative flex flex-col">
                    <div className="relative aspect-[4/5]">
                      <SafeImage src={companion.imageUrl} alt={companion.name} className="w-full h-full object-cover" fallbackType="thumbnail" />
                      <button onClick={() => toggleFavorite(companion.id)} className="absolute top-3 right-3 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 z-20">
                         <Heart className="w-4 h-4 fill-primary-action text-primary-action" />
                      </button>
                    </div>
                    <div className="p-4 bg-surface-elevated">
                      <h3 className="font-bold text-text-primary flex items-center gap-1.5">{companion.name} <ShieldCheck className="w-3.5 h-3.5 text-primary-action" /></h3>
                      <p className="text-xs text-text-secondary flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {companion.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border-token rounded-2xl p-8 text-center text-text-secondary">
                 <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                 <p>You haven't saved any companions yet.</p>
              </div>
            )}
          </div>
        </>
      )}

      {currentUser.role === 'companion' && (
        <div className="bg-surface border border-border-token p-8 rounded-3xl text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">Guide Dashboard</h2>
          <p className="text-text-secondary mb-6">Manage your availability, view incoming requests, and track earnings.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-surface-elevated rounded-2xl p-6 border border-border-token">
              <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-2">Total Earnings</h3>
              <p className="text-3xl font-bold text-text-primary">
                {loadingStats ? '...' : `NPR ${companionStats?.totalEarnings.toFixed(2) ?? '0.00'}`}
              </p>
            </div>
            <div className="bg-surface-elevated rounded-2xl p-6 border border-border-token">
              <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-2">Pending Requests</h3>
              <p className="text-3xl font-bold text-primary-action">
                {loadingStats ? '...' : companionStats?.pendingRequests ?? 0}
              </p>
            </div>
            <div className="bg-surface-elevated rounded-2xl p-6 border border-border-token">
              <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-2">Profile Views (30d)</h3>
              <p className="text-3xl font-bold text-text-primary">
                {loadingStats ? '...' : companionStats?.profileViews ?? 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
