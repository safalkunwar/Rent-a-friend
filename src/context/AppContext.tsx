import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Companion, Booking, Message, Notification, Conversation } from '../types';
import { COMPANIONS } from '../data';

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  favorites: string[];
  toggleFavorite: (companionId: string) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBookingStatus: (id: string, status: Booking['status']) => void;
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (conversationId: string, text: string) => void;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
}

const defaultUser: User = {
  id: 'u1',
  name: 'Alex Visitor',
  email: 'alex@example.com',
  avatar: 'https://ui-avatars.com/api/?name=Alex&background=random',
  role: 'customer',
  favorites: []
};

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(defaultUser);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const toggleFavorite = (companionId: string) => {
    setFavorites(prev => 
      prev.includes(companionId) 
        ? prev.filter(id => id !== companionId)
        : [...prev, companionId]
    );
  };

  const addBooking = (booking: Booking) => {
    setBookings(prev => [...prev, booking]);
    // Add notification
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: currentUser?.id || 'guest',
      title: 'Booking Requested',
      message: `Your booking for ${booking.date} is now pending.`,
      type: 'booking',
      isRead: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const updateBookingStatus = (id: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const sendMessage = (conversationId: string, text: string) => {
    if (!currentUser) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      text,
      timestamp: new Date().toISOString(),
      isRead: true
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Update conversation last message
    setConversations(prev => prev.map(c => 
      c.id === conversationId ? { ...c, lastMessage: newMessage } : c
    ));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      favorites,
      toggleFavorite,
      bookings,
      addBooking,
      updateBookingStatus,
      conversations,
      messages,
      sendMessage,
      notifications,
      markNotificationRead
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
