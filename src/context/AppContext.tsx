import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, Companion, Booking, Message, Notification, CommunityPost, ExperienceStory } from '../types';
import { authService, AuthUser } from '../services/auth';
import { firestore } from '../services/firestore';
import { offlineStorage } from '../services/storage';
import { offlineWriteQueue } from '../services/offlineQueue';
import { userRepository } from '../repositories/UserRepository';
import { companionRepository } from '../repositories/CompanionRepository';
import { bookingRepository } from '../repositories/BookingRepository';
import { socialRepository, Comment } from '../repositories/SocialRepository';
import { messagingService } from '../services/messaging';
import { loadAuthenticatedProfile } from '../services/profileBootstrap';
import { requireUid } from '../services/identity';

interface AppState {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  favorites: string[];
  toggleFavorite: (companionId: string) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => Promise<void>;
  updateBookingStatus: (id: string, status: Booking['status']) => Promise<void>;
  getConversationId: (otherUserId: string) => string;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => Promise<void>;
  loading: boolean;
  logout: () => Promise<void>;
  signInAnonymously: () => Promise<void>;

  // Social Layer Operations
  updateUserProfile: (updates: Partial<User & { 
    phone?: string; 
    bio?: string;
    languages?: string[];
    skills?: string[];
    availability?: string;
    interests?: string[];
    location?: string;
  }>) => Promise<void>;
  becomeCompanion: (companion: Omit<Companion, 'id'>, customId?: string) => Promise<string>;
  createPost: (post: Omit<CommunityPost, 'id'>) => Promise<string>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  likeStory: (storyId: string) => Promise<void>;
  unlikeStory: (storyId: string) => Promise<void>;
  checkUserLikedPost: (postId: string) => Promise<boolean>;
  checkUserLikedStory: (storyId: string) => Promise<boolean>;
  createComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => Promise<string>;
  deleteComment: (id: string, postId: string) => Promise<void>;
  uploadStory: typeof socialRepository.uploadStory;
  deleteStory: (id: string) => Promise<void>;
  openAuthModal: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const mapAuthUserToUser = (authUser: AuthUser | null): User | null => {
  if (!authUser) return null;
  const isAnonymous = authUser.claims?.anonymous === true;
  return {
    id: authUser.uid,
    name: isAnonymous ? 'Anonymous Traveler' : (authUser.displayName || 'User'),
    email: isAnonymous ? '' : (authUser.email || ''),
    avatar: isAnonymous ? '' : (authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.displayName || 'User')}&background=random`),
    role: isAnonymous ? 'guest' : 'customer',
    favorites: [],
    claims: authUser.claims,
  };
};

export const getConversationId = (userIdA: string, userIdB: string): string => {
  return [userIdA, userIdB].sort().join('_');
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[SATHI] AppProvider auth effect starting');
    let cancelled = false;
    let generation = 0;
    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      if (cancelled) return;
      const requestGeneration = ++generation;
      const isCurrent = () => !cancelled && requestGeneration === generation;
      setCurrentUser(null);
      setFavorites([]);
      setBookings([]);
      setNotifications([]);
      setLoading(true);
      // Old cached profiles are not an authorization source (or retained private PII).
      Object.keys(localStorage).filter(key => key.startsWith('sathi_user_profile_')).forEach(key => localStorage.removeItem(key));
      if ('caches' in window) {
        void Promise.all(['firestore-data','firebase-storage-images'].map(name => caches.delete(name)))
          .catch(() => console.warn('[SATHI] Could not clear legacy private-media caches.'));
      }
      try {
        const user = mapAuthUserToUser(authUser);
        console.log('[SATHI] AppProvider auth user:', user ? `uid=${user.id}` : 'null');
        if (user) {
          const isAnonymous = authUser.claims?.anonymous === true;

          if (!isAnonymous) {
            const profile = await loadAuthenticatedProfile(authUser);
            if (isCurrent()) {
              setCurrentUser(profile);
              setFavorites(profile.favorites);
            }
          } else {
            if (!cancelled) {
              setCurrentUser(user);
              setFavorites([]);
            }
          }
        } else {
          if (!cancelled) {
            setCurrentUser(null);
            setFavorites([]);
          }
        }
      } catch (err) {
        console.error('[SATHI] Failed to load user profile:', err);
        if (isCurrent()) {
          setCurrentUser(null);
          setFavorites([]);
        }
      } finally {
        if (isCurrent()) {
          console.log('[SATHI] AppProvider loading=false');
          setLoading(false);
        }
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[SATHI] Back online, processing offline write queue...');
      offlineWriteQueue.processQueue().catch(err => {
        console.warn('[SATHI] Failed to process offline write queue:', err);
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Map to keep bookings merged by id
    const bookingMap = new Map<string, Booking>();

    const unsubUserBookings = firestore.subscribe<Booking>('bookings', { 
      where: [{ field: 'userId', operator: '==', value: currentUser.id }],
      limitCount: 30 
    }, (items) => {
      items.forEach(b => { if (b?.id) bookingMap.set(b.id, b); });
      setBookings(Array.from(bookingMap.values()));
    });

    const unsubCompanionBookings = firestore.subscribe<Booking>('bookings', { 
      where: [{ field: 'companionId', operator: '==', value: currentUser.id }],
      limitCount: 30 
    }, (items) => {
      items.forEach(b => { if (b?.id) bookingMap.set(b.id, b); });
      setBookings(Array.from(bookingMap.values()));
    });

    const unsubNotifications = firestore.subscribe<Notification>('notifications', { 
      where: [{ field: 'userId', operator: '==', value: currentUser.id }],
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount: 20 
    }, (items) => {
      const seen = new Set<string>();
      const unique = items.filter(n => {
        if (!n?.id || seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      const sorted = [...unique].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      setNotifications(sorted);
    });

    return () => {
      unsubUserBookings();
      unsubCompanionBookings();
      unsubNotifications();
    };
  }, [currentUser]);

  const toggleFavorite = useCallback((companionId: string) => {
    setFavorites(prev => {
      const next = prev.includes(companionId) ? prev.filter(id => id !== companionId) : [...prev, companionId];
      if (currentUser) {
        firestore.updateDocument(`users/${currentUser.id}`, { favorites: next });
      }
      return next;
    });
  }, [currentUser]);

  const addBooking = useCallback(async (booking: Booking) => {
    await bookingRepository.createBooking(booking);
    // Committed snapshots own booking state; ancillary failure never rolls it back.
    const notification: Notification = {
      id: `notif_booking_${booking.id}`, userId: booking.userId,
      title: 'Booking Requested', message: `Your reservation for ${booking.date} is pending. No payment is verified.`,
      type: 'booking', isRead: false, timestamp: new Date().toISOString(),
    };
    const effects = await Promise.allSettled([
      messagingService.createConversation([booking.userId, booking.companionId]),
      firestore.setDocument(`notifications/${notification.id}`, { ...notification }),
    ]);
    if (effects.some(result => result.status === 'rejected')) {
      console.warn('[SATHI] Reservation saved; conversation/notification follow-up needs retry.');
    }
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: Booking['status']) => {
    await bookingRepository.updateBookingStatus(id, status);
  }, []);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    if (!currentUser) return;
    await messagingService.sendMessage(conversationId, currentUser.id, text);
  }, [currentUser]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await firestore.updateDocument(`notifications/${id}`, { isRead: true });
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    const batchOps = unreadIds.map(id => ({ type: 'update' as const, path: `notifications/${id}`, data: { isRead: true } }));
    await firestore.batchWrite(batchOps);
  }, [notifications]);

  const getConversationWith = useCallback((otherUserId: string): string => {
    if (!currentUser) return '';
    return getConversationId(currentUser.id, otherUserId);
  }, [currentUser]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('[SATHI] Error logging out:', err);
    }
    setCurrentUser(null);
    setFavorites([]);
    setBookings([]);
    setNotifications([]);
  }, []);

  const signInAnonymously = useCallback(async () => {
    try {
      const authUser = await authService.signInAnonymously();
      const user = mapAuthUserToUser(authUser);
      if (user) {
        setCurrentUser(user);
        setFavorites([]);
      }
    } catch (err) {
      console.error('[SATHI] Error signing in anonymously:', err);
      throw err;
    }
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<User & { 
    phone?: string; 
    bio?: string;
    languages?: string[];
    skills?: string[];
    availability?: string;
    interests?: string[];
    location?: string;
  }>) => {
    if (!currentUser) throw new Error('Sign in to update your profile.');
    const uid = requireUid(currentUser.id);
    await userRepository.updateUserProfile(uid, updates);
    requireUid(uid);
    setCurrentUser(prev => prev?.id === uid ? { ...prev, ...updates } : prev);
  }, [currentUser]);

  const becomeCompanion = useCallback(async (companion: Omit<Companion, 'id'>, customId?: string) => {
    throw new Error('Companion activation requires an approved application. Apply from Settings.');
  }, [currentUser]);

  const createPost = useCallback(async (post: Omit<CommunityPost, 'id'>) => {
    return await socialRepository.createPost(post);
  }, []);

  const likePost = useCallback(async (postId: string) => {
    if (!currentUser) return;
    await socialRepository.likePost(currentUser.id, postId);
  }, [currentUser]);

  const unlikePost = useCallback(async (postId: string) => {
    if (!currentUser) return;
    await socialRepository.unlikePost(currentUser.id, postId);
  }, [currentUser]);

  const checkUserLikedPost = useCallback(async (postId: string) => {
    if (!currentUser) return false;
    return await socialRepository.checkUserLikedPost(currentUser.id, postId);
  }, [currentUser]);

  const likeStory = useCallback(async (storyId: string) => {
    if (!currentUser) return;
    await socialRepository.likeStory(currentUser.id, storyId);
  }, [currentUser]);

  const unlikeStory = useCallback(async (storyId: string) => {
    if (!currentUser) return;
    await socialRepository.unlikeStory(currentUser.id, storyId);
  }, [currentUser]);

  const checkUserLikedStory = useCallback(async (storyId: string) => {
    if (!currentUser) return false;
    return await socialRepository.checkUserLikedStory(currentUser.id, storyId);
  }, [currentUser]);

  const createComment = useCallback(async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
    return await socialRepository.createComment(comment);
  }, []);

  const deleteComment = useCallback(async (id: string, postId: string) => {
    await socialRepository.deleteComment(id, postId);
  }, []);

  const uploadStory = useCallback((...args: Parameters<typeof socialRepository.uploadStory>) => {
    return socialRepository.uploadStory(...args);
  }, []);

  const deleteStory = useCallback(async (id: string) => {
    await socialRepository.deleteStory(id);
  }, []);

  const openAuthModal = useCallback(() => {
    // Custom event dispatch to trigger AuthModal globally if needed or handle via window event
    window.dispatchEvent(new CustomEvent('sathi_open_auth_modal'));
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      favorites,
      toggleFavorite,
      bookings,
      addBooking,
      updateBookingStatus,
      getConversationId: getConversationWith,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      loading,
      logout,
      signInAnonymously,
      updateUserProfile,
      becomeCompanion,
      createPost,
      likePost,
      unlikePost,
      likeStory,
      unlikeStory,
      checkUserLikedPost,
      checkUserLikedStory,
      createComment,
      deleteComment,
      uploadStory,
      deleteStory,
      openAuthModal,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
