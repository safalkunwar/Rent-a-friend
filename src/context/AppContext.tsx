import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, Companion, Booking, Message, Notification, CommunityPost, ExperienceStory } from '../types';
import { authService, AuthUser } from '../services/auth';
import { firestore } from '../services/firestore';
import { offlineStorage } from '../services/storage';
import { userRepository } from '../repositories/UserRepository';
import { companionRepository } from '../repositories/CompanionRepository';
import { bookingRepository } from '../repositories/BookingRepository';
import { socialRepository, Comment } from '../repositories/SocialRepository';

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  favorites: string[];
  toggleFavorite: (companionId: string) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  getConversationId: (otherUserId: string) => string;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  loading: boolean;
  logout: () => Promise<void>;
  
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
  checkUserLikedPost: (postId: string) => Promise<boolean>;
  createComment: (comment: Omit<Comment, 'id' | 'createdAt'>) => Promise<string>;
  deleteComment: (id: string, postId: string) => Promise<void>;
  uploadStory: (story: Omit<ExperienceStory, 'id'>) => Promise<string>;
  deleteStory: (id: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

const mapAuthUserToUser = (authUser: AuthUser | null): User | null => {
  if (!authUser) return null;
  return {
    id: authUser.uid,
    name: authUser.displayName || 'User',
    email: authUser.email || '',
    avatar: authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.displayName || 'User')}&background=random`,
    role: 'customer',
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
    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      if (cancelled) return;
      try {
        const user = mapAuthUserToUser(authUser);
        console.log('[SATHI] AppProvider auth user:', user ? `uid=${user.id}` : 'null');
        if (user) {
          let profile: User | null = null;
          try {
            profile = await firestore.getDocument<User>(`users/${user.id}`);
            console.log('[SATHI] Firestore user profile loaded:', profile ? 'found' : 'not found');
          } catch (docErr) {
            console.warn('[SATHI] Failed to get user profile from Firestore, attempting local cache fallback:', docErr);
          }

          if (!profile) {
            try {
              const cachedProfileStr = localStorage.getItem(`sathi_user_profile_${user.id}`);
              if (cachedProfileStr) {
                profile = JSON.parse(cachedProfileStr);
                console.log('[SATHI] Fallback user profile loaded from localStorage:', profile);
              }
            } catch (cacheErr) {
              console.error('[SATHI] Failed to load user profile from localStorage:', cacheErr);
            }
          }

          if (profile && !cancelled) {
            const mergedUser: User = { 
              ...user, 
              ...profile,
              id: user.id,
              email: profile.email || user.email,
              name: profile.name || user.name,
              avatar: profile.avatar || user.avatar,
              role: profile.role || (authUser.claims?.admin ? 'admin' : authUser.claims?.role === 'companion' ? 'companion' : 'customer'), 
              favorites: profile.favorites || [] 
            };
            setCurrentUser(mergedUser);
            setFavorites(profile.favorites || []);
            try {
              localStorage.setItem(`sathi_user_profile_${user.id}`, JSON.stringify(profile));
            } catch (cacheWriteErr) {
              console.warn('[SATHI] Failed to cache user profile in localStorage:', cacheWriteErr);
            }
          } else if (!cancelled) {
            const defaultUser: User = { ...user, role: 'customer', favorites: [] };
            try {
              await firestore.setDocument(`users/${user.id}`, {
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: 'customer',
                favorites: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            } catch (writeErr) {
              console.warn('[SATHI] Could not save new user document to Firestore (offline?):', writeErr);
            }
            if (!cancelled) {
              setCurrentUser(defaultUser);
              setFavorites([]);
              try {
                localStorage.setItem(`sathi_user_profile_${user.id}`, JSON.stringify(defaultUser));
              } catch (e) {}
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
        if (!cancelled) {
          setCurrentUser(null);
          setFavorites([]);
        }
      } finally {
        if (!cancelled) {
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
    if (!currentUser) return;
    const unsubBookings = firestore.subscribe<Booking>('bookings', { where: [{ field: 'userId', operator: '==', value: currentUser.id }] }, (items) => {
      const seen = new Set<string>();
      const unique = items.filter(b => {
        if (!b?.id || seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
      setBookings(unique);
    });
    const unsubNotifications = firestore.subscribe<Notification>('notifications', { where: [{ field: 'userId', operator: '==', value: currentUser.id }] }, (items) => {
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
      unsubBookings();
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
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      await offlineStorage.cacheItem('pendingBookings', { ...booking, _pending: true });
      setBookings(prev => {
        const filtered = prev.filter(b => b.id !== booking.id);
        return [...filtered, { ...booking, _pending: true }];
      });
      return;
    }

    setBookings(prev => {
      const filtered = prev.filter(b => b.id !== booking.id);
      return [...filtered, booking];
    });
    const ref = await firestore.setDocument(`bookings/${booking.id}`, {
      ...booking,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      title: 'Booking Requested',
      message: `Your booking for ${booking.date} is now pending.`,
      type: 'booking',
      isRead: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notification.id);
      return [notification, ...filtered];
    });
    await firestore.setDocument(`notifications/${notification.id}`, notification as any);
  }, [currentUser]);

  const updateBookingStatus = useCallback(async (id: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    await firestore.updateDocument(`bookings/${id}`, { status, updatedAt: new Date().toISOString() });
    const booking = bookings.find(b => b.id === id);
    if (booking && currentUser) {
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        userId: currentUser.id,
        title: `Booking ${status}`,
        message: `Your booking for ${booking.date} has been ${status}.`,
        type: 'booking',
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications(prev => [notification, ...prev]);
      await firestore.setDocument(`notifications/${notification.id}`, notification as any);

      // SATHI Business Rule: Auto-create conversation on accepted/confirmed booking
      if (status === 'confirmed') {
        const convoId = getConversationId(booking.userId, booking.companionId);
        try {
          const existingConvo = await firestore.getDocument<any>(`conversations/${convoId}`);
          if (!existingConvo) {
            await firestore.setDocument(`conversations/${convoId}`, {
              id: convoId,
              participantIds: [booking.userId, booking.companionId],
              unreadCount: 0,
              lastMessage: {
                text: 'Your booking is accepted! You can now chat directly.',
                timestamp: new Date().toISOString(),
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn('[SATHI] Error checking/creating booking conversation:', e);
        }
      }
    }
  }, [bookings, currentUser]);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    if (!currentUser) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      text,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    await firestore.setDocument(`messages/${newMessage.id}`, newMessage as any);

    await firestore.updateDocument(`conversations/${conversationId}`, {
      lastMessage: {
        id: newMessage.id,
        conversationId,
        senderId: newMessage.senderId,
        text: newMessage.text,
        timestamp: newMessage.timestamp,
        isRead: false,
      },
      updatedAt: newMessage.timestamp,
    });
  }, [currentUser]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await firestore.updateDocument(`notifications/${id}`, { isRead: true });
  }, []);

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

  const updateUserProfile = useCallback(async (updates: Partial<User & { 
    phone?: string; 
    bio?: string;
    languages?: string[];
    skills?: string[];
    availability?: string;
    interests?: string[];
    location?: string;
  }>) => {
    if (!currentUser) return;
    await userRepository.updateUserProfile(currentUser.id, updates);
    setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  }, [currentUser]);

  const becomeCompanion = useCallback(async (companion: Omit<Companion, 'id'>, customId?: string) => {
    if (!currentUser) throw new Error('Must be logged in to apply to become a companion.');
    const id = await companionRepository.createCompanionProfile(companion, customId);
    // Update local role
    await userRepository.updateUserProfile(currentUser.id, { role: 'companion' });
    setCurrentUser(prev => prev ? { ...prev, role: 'companion' } : null);
    return id;
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

  const createComment = useCallback(async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
    return await socialRepository.createComment(comment);
  }, []);

  const deleteComment = useCallback(async (id: string, postId: string) => {
    await socialRepository.deleteComment(id, postId);
  }, []);

  const uploadStory = useCallback(async (story: Omit<ExperienceStory, 'id'>) => {
    return await socialRepository.uploadStory(story);
  }, []);

  const deleteStory = useCallback(async (id: string) => {
    await socialRepository.deleteStory(id);
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
      loading,
      logout,
      updateUserProfile,
      becomeCompanion,
      createPost,
      likePost,
      unlikePost,
      checkUserLikedPost,
      createComment,
      deleteComment,
      uploadStory,
      deleteStory,
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
