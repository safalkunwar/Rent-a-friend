/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CompanionProfileModal } from './components/modals/CompanionProfileModal';
import { AuthModal } from './components/AuthModal';
import { MessagesTab } from './components/messages/MessagesTab';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { PartnerDashboard } from './components/dashboard/PartnerDashboard';
import { SettingsTab } from './components/settings/SettingsTab';
import { SafetyWidget } from './components/SafetyWidget';
import { CommunityFeed } from './components/social/CommunityFeed';
import { DiscoveryFeed } from './components/discovery/DiscoveryFeed';
import { CompanionCard } from './components/companions/CompanionCard';
import { CategoryHeader } from './components/discovery/CategoryHeader';
import { PageContainer, SectionHeader } from './components/layout';
import { ProfileEditModal } from './components/modals/ProfileEditModal';
import { DocumentModal } from './components/modals/DocumentModal';
import { MapPreview } from './components/maps/MapPreview';
import { Companion, ExperienceStory, Activity, Event as SathiEvent } from './types';
import { socialRepository } from './repositories/SocialRepository';
import { CreateStoryModal } from './components/modals/CreateStoryModal';
import { 
  MapPin, Star, ShieldCheck, Languages, Search, Play, Clock, 
  Home, Compass, Users, Calendar, MessageSquare, BookOpen, Heart, 
  Wallet, Smile, ArrowRight, CheckCircle, Info, Menu, X, Bell, 
  ChevronDown, Award, Sparkles, AlertTriangle, Coins, Briefcase, ChevronRight, ChevronLeft, HelpCircle, UserCircle, SlidersHorizontal,
  Lock, Settings, LogOut, Sun, Moon, Trash2, ShieldAlert
} from 'lucide-react';
import * as motion from 'motion/react-client';
import { useAppContext } from './context/AppContext';
import { useToast } from './components/ui/Toast';
import { useCompanions, useStories, useActivities, useEvents, usePartners, useCommunityPosts } from './hooks/useFirestoreData';
import { useCompanionCategories } from './hooks/useCompanionCategories';
import { useDiscoveryFeed } from './hooks/useDiscoveryFeed';
import { type FeedItem } from './services/feedGenerator';
import { SafeImage } from './components/ui/SafeImage';
import { AnimatePresence } from 'motion/react';
import { saveStoredPreferences } from './services/preferences';
import { paymentService } from './services/payments';
import { eventParticipantsService } from './services/eventParticipants';

interface ClientAppProps {
  initialTab?: 'home' | 'explore' | 'companions' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner' | 'settings';
}

export const ClientApp = React.memo(({ initialTab }: ClientAppProps = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookings, currentUser, updateBookingStatus, favorites, toggleFavorite, notifications, markNotificationRead, logout, openAuthModal } = useAppContext();
  const { showToast } = useToast();

  // Sync state with URL path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/bookings') {
      setActiveTab('bookings');
      setMobileTab('bookings');
    } else if (path === '/companions') {
      setActiveTab('companions');
      setMobileTab('search');
    } else if (path === '/explore') {
      setActiveTab('explore');
      setMobileTab('explore');
    } else if (path === '/messages') {
      setActiveTab('messages');
      setMobileTab('messages');
    } else if (path === '/dashboard') {
      setActiveTab('dashboard');
      setMobileTab('profile');
    } else if (path === '/partner') {
      setActiveTab('partner');
    } else if (path === '/settings') {
      setActiveTab('settings');
    } else if (path === '/') {
      setActiveTab('home');
      setMobileTab('home');
    }
  }, [location.pathname]);
  
  const { companions: fetchedCompanions, loading: companionsLoading } = useCompanions();
  const { stories: fetchedStories, loading: storiesLoading } = useStories();
  const { activities, loading: activitiesLoading } = useActivities();
  const { events, loading: eventsLoading } = useEvents();
  const { partners, loading: partnersLoading } = usePartners();
  const { posts, loading: postsLoading } = useCommunityPosts();

  const homeFeedItems = useDiscoveryFeed(fetchedCompanions, activities, events, fetchedStories, posts);

  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'companions' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner' | 'settings'>(initialTab || 'home');
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingStory, setViewingStory] = useState<ExperienceStory | null>(null);
  const [joinedEvents, setJoinedEvents] = useState<Record<string, boolean>>({});
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyLiked, setStoryLiked] = useState<Record<string, boolean>>({});
  const [storyLikesCount, setStoryLikesCount] = useState<Record<string, number>>({});
  const [visibleMobileCategoryCount, setVisibleMobileCategoryCount] = useState(2);
  const mobileSentinelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sentinel = mobileSentinelRef.current;
      if (!sentinel) return;
      const rect = sentinel.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.top < windowHeight + 200) {
        setVisibleMobileCategoryCount(prev => prev + 1);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [homeFeedItems]);

  useEffect(() => {
    if (viewingStory) {
      setStoryLikesCount(prev => ({
        ...prev,
        [viewingStory.id]: viewingStory.likesCount || viewingStory.likes || 0
      }));
      if (currentUser) {
        socialRepository.checkUserLikedStory(currentUser.id, viewingStory.id).then(liked => {
          setStoryLiked(prev => ({ ...prev, [viewingStory.id]: liked }));
        });
      }
    }
  }, [viewingStory, currentUser]);

  useEffect(() => {
    if (!currentUser || !events || events.length === 0) return;
    let cancelled = false;
    const checkJoined = async () => {
      const joined: Record<string, boolean> = {};
      for (const event of events) {
        try {
          const isJoined = await eventParticipantsService.isUserJoined(event.id, currentUser.id);
          if (!cancelled) joined[event.id] = isJoined;
        } catch {
          // ignore
        }
      }
      if (!cancelled) setJoinedEvents(joined);
    };
    checkJoined();
    return () => { cancelled = true; };
  }, [currentUser, events]);

  const handleJoinEvent = async (eventId: string) => {
    if (!currentUser) {
      setAuthMode('login');
      return;
    }
    try {
      await eventParticipantsService.joinEvent(eventId);
      setJoinedEvents(prev => ({ ...prev, [eventId]: true }));
      showToast('Successfully joined event!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to join event', 'error');
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!currentUser) return;
    try {
      await eventParticipantsService.leaveEvent(eventId);
      setJoinedEvents(prev => ({ ...prev, [eventId]: false }));
      showToast('Left event', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to leave event', 'error');
    }
  };

  const isEventFull = (event: any) => {
    const currentParticipants = event.participants?.length || event.participants || 0;
    return currentParticipants >= event.spots;
  };

  const getEventButtonState = (event: any) => {
    if (!currentUser) return { text: 'Join', disabled: false, action: 'join' };
    const isJoined = joinedEvents[event.id];
    if (isJoined) return { text: 'Joined', disabled: false, action: 'leave' };
    if (isEventFull(event)) return { text: 'Full', disabled: true, action: 'none' };
    return { text: 'Join', disabled: false, action: 'join' };
  };

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'guide' | null>(null);
  const [isGuide, setIsGuide] = useState(false);
  const [showGuideSetup, setShowGuideSetup] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'priceAsc' | 'priceDesc' | 'rating'>('recommended');
  const [showSOS, setShowSOS] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  
  // Custom dashboard / UI states
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [maxHourlyRate, setMaxHourlyRate] = useState<number>(3000);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'search' | 'explore' | 'experiences' | 'bookings' | 'messages' | 'profile' | 'notifications'>('home');
  
  // SATHI Mobile Navigation Scroll Persistence & Tab Redirection
  const previousMobileTabRef = React.useRef<string>(mobileTab);
  const scrollPositionsRef = React.useRef<Record<string, number>>({});
  const isRestoringScrollRef = React.useRef<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringScrollRef.current) return;
      scrollPositionsRef.current[mobileTab] = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileTab]);

  useEffect(() => {
    const prevTab = previousMobileTabRef.current;
    const nextTab = mobileTab;
    if (prevTab !== nextTab) {
      isRestoringScrollRef.current = true;
      const savedPosition = scrollPositionsRef.current[nextTab] || 0;
      const timer = setTimeout(() => {
        window.scrollTo(0, savedPosition);
        isRestoringScrollRef.current = false;
      }, 50);
      previousMobileTabRef.current = nextTab;
      return () => clearTimeout(timer);
    }
  }, [mobileTab]);

  // Freeze background scrolling when messages tab is active on mobile
  useEffect(() => {
    if (mobileTab === 'messages') {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [mobileTab]);
  const [discoveryTab, setDiscoveryTab] = useState<'all' | 'companions' | 'activities' | 'events'>('all');
  const [activeChatCompanionId, setActiveChatCompanionId] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<'terms' | 'privacy' | 'help' | null>(null);
  
  // Earnings Calculator States
  const [calcHourlyRate, setCalcHourlyRate] = useState<number>(1200); // NPR per hour
  const [calcWeeklyHours, setCalcWeeklyHours] = useState<number>(15); // Hours per week
  
  // Interactive social reaction counts
  const [momentLiked, setMomentLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentUser || !fetchedStories) return;
    fetchedStories.forEach(story => {
      socialRepository.checkUserLikedStory(currentUser.id, story.id).then(liked => {
        setMomentLiked(prev => ({ ...prev, [story.id]: liked }));
      });
    });
  }, [fetchedStories, currentUser]);

  useEffect(() => {
    if (showSOS) {
      const timer = setTimeout(() => {
        setShowSOS(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSOS]);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveHeroSlide(prev => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, []);

  const handleBrowseCompanions = () => {
    if (window.innerWidth < 640) {
      setMobileTab('search');
      setDiscoveryTab('companions');
    } else {
      setActiveTab('explore');
      setDiscoveryTab('companions');
      navigate('/companions');
    }
  };

  const handleBrowseActivities = () => {
    if (window.innerWidth < 640) {
      setMobileTab('search');
      setDiscoveryTab('activities');
    } else {
      setActiveTab('explore');
      setDiscoveryTab('activities');
      navigate('/companions');
    }
  };
  
  const companions = fetchedCompanions;
  const stories = fetchedStories;
  const unreadNotifCount = notifications ? notifications.filter(n => !n.isRead).length : 0;

  const handleViewCompanion = (companion: Companion) => {
    setSelectedCompanion(companion);
  };

  const handleToggleLikeMoment = async (id: string | number) => {
    if (!currentUser) {
      showToast('Please sign in to like community adventures!', 'info');
      return;
    }

    const storyId = String(id);
    const isLiked = momentLiked[storyId] || false;

    // Optimistic UI update
    setMomentLiked(prev => ({ ...prev, [storyId]: !isLiked }));
    setStoryLikesCount(prev => ({
      ...prev,
      [storyId]: Math.max(0, (prev[storyId] || 0) + (isLiked ? -1 : 1))
    }));

    try {
      if (isLiked) {
        await socialRepository.unlikeStory(currentUser.id, storyId);
      } else {
        await socialRepository.likeStory(currentUser.id, storyId);
      }
    } catch (err) {
      // Revert optimistic state
      setMomentLiked(prev => ({ ...prev, [storyId]: isLiked }));
      setStoryLikesCount(prev => ({
        ...prev,
        [storyId]: Math.max(0, (prev[storyId] || 0) + (isLiked ? 1 : -1))
      }));
      showToast('Failed to sync like with Firebase. Try again.', 'error');
    }
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    showToast(`Filtering experiences in ${city}`, 'info');
  };

  const handleTriggerInvite = () => {
    navigator.clipboard.writeText("https://sathi.com/invite?ref=safal_kunwar");
    showToast("Invite link copied to clipboard! Share with friends to earn NPR 5,000.", "success");
  };

  const handleWalletTopUp = async () => {
    try {
      const result = await paymentService.initiatePayment({
        provider: 'khalti',
        amount: 1000,
        currency: 'NPR',
        companionId: 'wallet',
        bookingId: `wallet-topup-${Date.now()}`,
        returnUrl: window.location.origin,
      });
      window.open(result.paymentUrl, '_blank');
      showToast('Redirecting to secure Khalti Gateway for wallet top up...', 'info');
    } catch (error) {
      showToast('Wallet top-up is currently unavailable. Please try again later.', 'error');
    }
  };

  const activeFilterCount = (selectedCity !== 'All' ? 1 : 0) +
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedLanguage !== 'All' ? 1 : 0) +
    (maxHourlyRate < 3000 ? 1 : 0) +
    (minRatingFilter > 0 ? 1 : 0) +
    (sortBy !== 'recommended' ? 1 : 0);

  const filteredCompanions = companions.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      c.location.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.bio.toLowerCase().includes(q) ||
      c.interests.some(i => i.toLowerCase().includes(q)) ||
      c.languages.some(l => l.toLowerCase().includes(q));
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      c.interests.includes(selectedCategory) || 
      c.bio.toLowerCase().includes(selectedCategory.toLowerCase());
    
    const matchesCity = 
      selectedCity === 'All' || 
      c.location.toLowerCase() === selectedCity.toLowerCase();

    const matchesLanguage =
      selectedLanguage === 'All' ||
      c.languages.some(l => l.toLowerCase() === selectedLanguage.toLowerCase());

    const matchesMaxRate = (c.hourlyRate || 0) <= maxHourlyRate;

    const matchesMinRating = (c.rating || 0) >= minRatingFilter;
    
    const matchesSaved = 
      !showSavedOnly || 
      (favorites && favorites.includes(c.id));
    
    return matchesSearch && matchesCategory && matchesCity && matchesLanguage && matchesMaxRate && matchesMinRating && matchesSaved;
  }).sort((a, b) => {
    if (sortBy === 'priceAsc') return a.hourlyRate - b.hourlyRate;
    if (sortBy === 'priceDesc') return b.hourlyRate - a.hourlyRate;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // recommended
  });

  const filteredActivities = (activities || []).filter(act => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      act.title?.toLowerCase().includes(q) ||
      act.description?.toLowerCase().includes(q) ||
      act.location?.toLowerCase().includes(q);
    
    const matchesCity = 
      selectedCity === 'All' || 
      act.location?.toLowerCase().includes(selectedCity.toLowerCase());
      
    return matchesSearch && matchesCity;
  });

  const filteredEvents = (events || []).filter(evt => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      evt.title?.toLowerCase().includes(q) ||
      evt.description?.toLowerCase().includes(q) ||
      evt.location?.toLowerCase().includes(q);
    
    const matchesCity = 
      selectedCity === 'All' || 
      evt.location?.toLowerCase().includes(selectedCity.toLowerCase());
      
    return matchesSearch && matchesCity;
  });

  // Dynamic calculations for guide earnings
  const estWeeklyEarnings = calcHourlyRate * calcWeeklyHours;
  const estMonthlyEarnings = Math.round(estWeeklyEarnings * 4.33);

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary flex flex-col lg:flex-row relative overflow-x-hidden selection:bg-primary-action/30 selection:text-primary-action">
      
      {/* ==================== LEFT SIDEBAR (DESKTOP) ==================== */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bottom-0 bg-background border-r border-border-token/40 p-5 select-none z-40 shrink-0 justify-between overflow-y-auto hide-scrollbar">
        <div className="space-y-5">
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-surface-elevated/30 transition-all"
            onClick={() => {
              setActiveTab('explore');
              setSelectedCategory('All');
              setSelectedCity('All');
              setShowSavedOnly(false);
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-primary-action flex items-center justify-center font-bold text-background text-lg shadow-md shadow-primary-action/20">
              S
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-text-primary block">SATHI<span className="text-primary-action">.</span></span>
              <span className="text-[9px] uppercase tracking-wider text-text-secondary block font-light -mt-1">Trusted Experiences</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Sidebar navigation">
            <button 
              onClick={() => { navigate('/'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/' && !showSavedOnly ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Home className="w-4 h-4" /> Home
            </button>
            <button 
              onClick={() => { navigate('/explore'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/explore' ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Compass className="w-4 h-4" /> Explore
            </button>
            <button 
              onClick={() => { navigate('/companions'); setSelectedCategory('All'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/companions' && !showSavedOnly ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <span className="flex items-center gap-3"><Users className="w-4 h-4" /> Companions</span>
              <span className="text-[10px] bg-primary-action/20 text-primary-action px-1.5 py-0.5 rounded font-bold">Active</span>
            </button>
            <button 
              onClick={() => { navigate('/'); const actSection = document.getElementById('activities-section'); if (actSection) actSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <BookOpen className="w-4 h-4" /> Activities
            </button>
            <button 
              onClick={() => { navigate('/'); const evSection = document.getElementById('events-section'); if (evSection) evSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <Calendar className="w-4 h-4" /> Events
            </button>
            <button 
              onClick={() => { navigate('/messages'); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/messages' ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <span className="flex items-center gap-3"><MessageSquare className="w-4 h-4" /> Messages</span>
              <span className="w-2.5 h-2.5 bg-primary-action rounded-full animate-pulse"></span>
            </button>
            <button 
              onClick={() => { navigate('/bookings'); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/bookings' ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Calendar className="w-4 h-4" /> Bookings
            </button>
            <button 
              onClick={() => { navigate('/companions'); setShowSavedOnly(true); setIsMobileSidebarOpen(false); showToast("Viewing Saved Companions", "success"); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/companions' && showSavedOnly ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Heart className="w-4 h-4" /> Saved
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); const testSection = document.getElementById('testimonials-section'); if (testSection) testSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <Smile className="w-4 h-4" /> Reviews
            </button>
            <button 
              onClick={() => setShowWalletModal(true)} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <Wallet className="w-4 h-4" /> Wallet
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); const feedSection = document.getElementById('moments-section'); if (feedSection) feedSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <Users className="w-4 h-4" /> Community
            </button>
            <button 
              onClick={() => { navigate('/settings'); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/settings' || activeTab === 'settings' ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </nav>
        </div>

        {/* Sidebar Footer - Compact Height-Safe Invite Card */}
        <div className="bg-surface-elevated/50 border border-border-token/40 rounded-2xl p-3 relative overflow-hidden mt-auto">
          <div className="absolute -right-5 -bottom-5 w-16 h-16 bg-primary-action/5 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-primary-action text-[10px] font-black uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5 animate-pulse text-primary-action" /> Invite & Earn
            </div>
            <span className="text-[9px] text-primary-action font-mono bg-primary-action/15 px-1.5 py-0.5 rounded-md font-bold">NPR 5K</span>
          </div>
          <p className="text-[9px] text-text-secondary leading-relaxed mt-1.5">Earn referral bonus for signups.</p>
          <button 
            onClick={handleTriggerInvite}
            className="w-full mt-2 py-1.5 bg-primary-action hover:bg-primary-action-hover active:scale-95 text-background rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all shadow-md"
          >
            Invite Now
          </button>
        </div>
      </aside>

      {/* ==================== MOBILE SLIDING SIDEBAR DRAWER ==================== */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-background h-full p-6 flex flex-col justify-between border-r border-border-token/50 shadow-2xl z-50"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-action flex items-center justify-center font-bold text-background text-base">S</div>
                    <span className="text-lg font-bold text-text-primary">SATHI<span className="text-primary-action">.</span></span>
                  </div>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-text-secondary hover:text-text-primary rounded-full bg-surface-elevated">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-2">
                  <button onClick={() => { navigate('/'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/' && !showSavedOnly ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Home className="w-4 h-4" /> Home
                  </button>
                  <button onClick={() => { navigate('/companions'); setSelectedCategory('All'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/companions' && !showSavedOnly ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Users className="w-4 h-4" /> Companions
                  </button>
                  <button onClick={() => { navigate('/messages'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/messages' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <MessageSquare className="w-4 h-4" /> Messages
                  </button>
                  <button onClick={() => { navigate('/bookings'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/bookings' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Calendar className="w-4 h-4" /> Bookings
                  </button>
                  <button onClick={() => { navigate('/companions'); setShowSavedOnly(true); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/companions' && showSavedOnly ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Heart className="w-4 h-4" /> Saved Companions
                  </button>
                  <button onClick={() => { setShowWalletModal(true); setIsMobileSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-text-secondary">
                    <Wallet className="w-4 h-4" /> My Wallet
                  </button>
                  <button onClick={() => { navigate('/partner'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/partner' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Briefcase className="w-4 h-4" /> Partners
                  </button>
                  <button onClick={() => { navigate('/dashboard'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/dashboard' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <UserCircle className="w-4 h-4" /> My Profile
                  </button>
                  <button onClick={() => { navigate('/settings'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/settings' || activeTab === 'settings' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </nav>
              </div>

              <div className="bg-surface-elevated rounded-2xl p-4 text-center space-y-2">
                <p className="text-xs text-text-secondary">Share & Earn NPR 5,000</p>
                <button onClick={handleTriggerInvite} className="w-full py-2 bg-primary-action text-background rounded-xl text-xs font-bold">Invite Contacts</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MAIN WORKSPACE CONTAINER (DESKTOP ONLY) ==================== */}
      <div className="flex-1 hidden lg:flex flex-col min-w-0 bg-background lg:pl-64">
        
        {/* ==================== STICKY TOP HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border-token/40 py-3 px-4 md:px-8 flex justify-between items-center gap-4">
          
          {/* Left section: mobile hamburger & brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-text-secondary hover:text-text-primary rounded-xl bg-surface-elevated/50 border border-border-token/30 transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex lg:hidden items-center gap-2 cursor-pointer" onClick={() => setActiveTab('explore')}>
              <div className="w-8 h-8 rounded-lg bg-primary-action flex items-center justify-center font-bold text-background text-base">S</div>
              <span className="text-base font-bold text-text-primary tracking-tight">SATHI<span className="text-primary-action">.</span></span>
            </div>
          </div>

          {/* Search bar inside header (Responsive with compact Filters button) */}
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-secondary absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search companions, local skills, activities, or chiya spots..." 
                className="w-full bg-surface-elevated/50 border border-border-token/40 rounded-full h-10 pl-11 pr-16 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-action focus:bg-surface transition-all shadow-inner focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[10px] uppercase font-bold text-text-secondary hover:text-text-primary"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="relative flex items-center gap-1.5 h-10 px-3.5 bg-surface-elevated/80 hover:bg-surface-elevated border border-border-token/60 hover:border-primary-action rounded-full text-xs font-bold text-text-primary transition-all shadow-sm shrink-0"
              title="Open filters drawer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary-action" />
              <span className="hidden md:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary-action text-background text-[9px] font-extrabold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Right section: location selector, notifications, user profile badge */}
          <div className="flex items-center gap-3 md:gap-5">
            
            {/* Custom Location Selector Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-surface-elevated/60 border border-border-token/40 rounded-full px-3.5 py-1.5 text-xs font-semibold text-text-primary cursor-pointer hover:border-primary-action hover:bg-surface transition-all">
                <MapPin className="w-3.5 h-3.5 text-primary-action" />
                <span className="max-w-[80px] md:max-w-none truncate">{selectedCity === 'All' ? 'Nepal' : selectedCity}</span>
                <ChevronDown className="w-3 h-3 text-text-secondary" />
              </div>
              
              {/* City Selection dropdown list */}
              <select 
                value={selectedCity}
                onChange={(e) => handleCitySelect(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Filter companions by city"
              >
                <option value="All">All Cities</option>
                <option value="Kathmandu">Kathmandu</option>
                <option value="Pokhara">Pokhara</option>
                <option value="Patan">Patan</option>
                <option value="Bhaktapur">Bhaktapur</option>
                <option value="Nagarkot">Nagarkot</option>
                <option value="Chitwan">Chitwan</option>
              </select>
            </div>

            {/* Notifications Dropdown Toggle */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative w-9 h-9 rounded-full bg-surface-elevated/60 border border-border-token/40 hover:border-primary-action hover:bg-surface transition-all flex items-center justify-center text-text-primary focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-text-primary flex items-center justify-center border-2 border-surface-elevated animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationsDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotificationsDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-11 mt-2 w-80 bg-surface border border-border-token rounded-2xl shadow-2xl py-3 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-border-token/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">Notifications</span>
                        <span className="text-[10px] text-primary-action cursor-pointer hover:underline" onClick={() => showToast("All marked as read!", "success")}>Mark all read</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-border-token-light">
                        {notifications && notifications.length > 0 ? (
                          notifications.slice(0, 5).map(n => (
                            <div key={n.id} onClick={() => { markNotificationRead(n.id); setShowNotificationsDropdown(false); }} className={`p-3 text-left hover:bg-surface-elevated transition-colors cursor-pointer ${!n.isRead ? 'bg-primary-action/5' : ''}`}>
                              <p className={`text-xs ${!n.isRead ? 'font-bold text-text-primary' : 'text-gray-300'}`}>{n.title}</p>
                              <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[8px] text-text-muted block mt-1">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-text-secondary space-y-2">
                            <Sparkles className="w-8 h-8 mx-auto text-primary-action/40" />
                            <p className="text-xs">No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown Badge */}
            <div className="relative">
              <div 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 p-1 md:pr-3 bg-surface-elevated/60 border border-border-token/40 rounded-full cursor-pointer hover:border-primary-action transition-all"
              >
                <SafeImage 
                  src={currentUser?.avatar} 
                  alt={currentUser?.name || "Guest User"} 
                  fallbackType="avatar"
                  textForInitials={currentUser?.name || "Guest User"}
                  className="w-7 h-7 rounded-full object-cover border border-border-token"
                />
                <div className="hidden md:block text-left select-none">
                  <span className="text-[11px] font-bold text-text-primary block -mb-0.5 leading-tight">{currentUser?.name || "Guest User"}</span>
                  <span className="text-[9px] font-semibold text-primary-action block leading-none">{currentUser ? "Premium" : "Guest Mode"}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-text-secondary hidden md:block" />
              </div>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-11 mt-2 w-64 bg-surface border border-border-token rounded-2xl shadow-2xl py-2 z-50 overflow-hidden text-left"
                    >
                      <div className="px-4 py-2.5 border-b border-border-token/60">
                        <span className="text-xs font-bold text-text-primary block truncate">{currentUser?.name || "Guest User"}</span>
                        <span className="text-[10px] text-text-secondary block whitespace-normal leading-normal">{currentUser?.email || "Explore Nepali companions"}</span>
                      </div>
                      
                      {/* Section 1: Personal & Companion */}
                      <div className="py-1.5 border-b border-border-token/40">
                        <button onClick={() => { setActiveTab('dashboard'); navigate('/dashboard'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <UserCircle className="w-4 h-4 text-primary-action" /> My Profile / Dashboard
                        </button>
                        <button onClick={() => { setActiveTab('bookings'); navigate('/bookings'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Calendar className="w-4 h-4 text-primary-action" /> My Bookings
                        </button>
                        <button onClick={() => { setActiveTab('messages'); navigate('/messages'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <MessageSquare className="w-4 h-4 text-primary-action" /> Messages
                        </button>
                        <button onClick={() => { setShowSavedOnly(true); setActiveTab('explore'); navigate('/companions'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Heart className="w-4 h-4 text-red-500 fill-current" /> Favorites
                        </button>
                        {(currentUser?.role === 'companion' || currentUser?.role === 'admin') && (
                          <button onClick={() => { setActiveTab('partner'); navigate('/partner'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                            <Briefcase className="w-4 h-4 text-primary-action" /> Companion Dashboard
                          </button>
                        )}
                        {currentUser?.role === 'admin' && (
                          <button onClick={() => { window.open('http://localhost:3001', '_blank'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                            <ShieldAlert className="w-4 h-4 text-red-400" /> Admin Panel
                          </button>
                        )}
                      </div>

                      {/* Section 2: Finances & Customization */}
                      <div className="py-1.5 border-b border-border-token/40">
                        <button onClick={() => { setShowWalletModal(true); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Wallet className="w-4 h-4 text-primary-action" /> Wallet
                        </button>
                        <button onClick={() => { setActiveTab('settings'); navigate('/settings'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Settings className="w-4 h-4 text-primary-action" /> Settings
                        </button>
                        <button onClick={() => { setActiveTab('settings'); navigate('/settings'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Languages className="w-4 h-4 text-primary-action" /> Language (EN/NE)
                        </button>
                        <button onClick={() => {
                          const isCurrentlyLight = document.documentElement.classList.toggle('theme-light');
                          saveStoredPreferences({ theme: isCurrentlyLight ? 'light' : 'dark' });
                          showToast(isCurrentlyLight ? 'SATHI Premium Light Theme Active' : 'SATHI Cosmic Dark Theme Active', 'success');
                          setShowProfileDropdown(false);
                        }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Sun className="w-4 h-4 text-primary-action" /> Appearance
                        </button>
                        <button onClick={() => { showToast("Privacy protection active. SATHI uses end-to-end escrow security.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <ShieldCheck className="w-4 h-4 text-primary-action" /> Privacy & Security
                        </button>
                      </div>

                      {/* Section 3: Policies & Support */}
                      <div className="py-1.5 border-b border-border-token/40 bg-white/[0.01]">
                        <button onClick={() => { setActiveDocType('terms'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <BookOpen className="w-4 h-4" /> Terms of Service
                        </button>
                        <button onClick={() => { setActiveDocType('privacy'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Lock className="w-4 h-4" /> Privacy Policy
                        </button>
                        <button onClick={() => { setActiveDocType('help'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <HelpCircle className="w-4 h-4" /> Help & Support
                        </button>
                        <button onClick={() => { showToast("Emergency Contact: +977-9801234567. Location: Thamel, Kathmandu.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Smile className="w-4 h-4" /> Contact Us
                        </button>
                      </div>

                      {/* Section 4: Log Out */}
                      <div className="py-1">
                        {currentUser ? (
                          <button 
                            onClick={async () => { await logout(); navigate('/'); setShowProfileDropdown(false); showToast("Logged out successfully", "success"); }}
                            className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2 font-bold"
                          >
                            <LogOut className="w-4 h-4" /> Log Out
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setAuthMode('login'); setShowProfileDropdown(false); }}
                            className="w-full text-left px-4 py-2 text-xs text-primary-action hover:bg-surface-elevated flex items-center gap-2 font-bold"
                          >
                            <UserCircle className="w-4 h-4" /> Sign In / Register
                          </button>
                        )}
                      </div>
                    </motion.div>


                  </>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* ==================== SCREEN CONTENT LAYOUT ==================== */}
        <div className="grid grid-cols-12 w-full flex-1">
          
          {/* ==================== CENTRAL FEED / ACTIVE TAB CONTAINER ==================== */}
          <main className="col-span-12 xl:col-span-9 p-4 md:p-8 space-y-12 min-w-0">
            
            {/* Complete Guide Setup prompt if verified guide */}
            {isGuide && showGuideSetup && (
              <div className="p-6 bg-background border border-primary-action/30 rounded-3xl relative overflow-hidden">
                <button onClick={() => setShowGuideSetup(false)} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">✕</button>
                <h2 className="text-xl font-bold text-text-primary mb-2 flex items-center gap-2"><Star className="w-5 h-5 text-primary-action" /> Complete Your SATHI Profile</h2>
                <p className="text-sm text-text-secondary mb-6">Complete your profile to unlock bookings from thousands of travelers visiting Nepal.</p>
                <button onClick={() => { setShowGuideSetup(false); setShowProfileEditModal(true); }} className="px-5 py-2 bg-primary-action text-background font-bold text-xs rounded-xl hover:bg-primary-action-hover">Complete Profile</button>
              </div>
            )}

            {/* Render dynamically based on Tab */}
            {activeTab === 'home' && (
              <DiscoveryFeed
                companions={companions}
                activities={activities}
                events={events}
                stories={stories}
                posts={posts}
                currentUser={currentUser}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onViewCompanion={handleViewCompanion}
                onShowToast={showToast}
                onNavigateExplore={(category) => { setMobileTab('explore'); if (category) setSelectedCategory(category); }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
                onCreateStory={() => setShowCreateStoryModal(true)}
                onViewStory={setViewingStory}
                feedItems={homeFeedItems}
              />
            )}

            {activeTab === 'explore' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                
                {/* Desktop Interactive Map */}
                <div className="hidden lg:block">
                  <div className="bg-surface border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl shadow-black/40">
                    <div className="p-4 bg-surface-elevated/40 border-b border-white/5 flex justify-between items-center text-left">
                      <span className="text-xs uppercase font-black tracking-wider text-text-secondary flex items-center gap-2">
                        <Compass className="w-4 h-4 text-primary-action animate-spin" /> Interactive Guide Map
                      </span>
                      <span className="text-[10px] text-text-secondary">Click pins to view details</span>
                    </div>
                    
                    {/* Map Component */}
                    <div className="relative">
                      {(() => {
                        const getCoords = (item: any) => {
                          if (!item?.coordinates) return null;
                          const lat = item.coordinates.latitude ?? item.coordinates._lat ?? item.coordinates.lat;
                          const lng = item.coordinates.longitude ?? item.coordinates._long ?? item.coordinates.lng;
                          if (typeof lat === 'number' && typeof lng === 'number') {
                            return { lat, lng };
                          }
                          return null;
                        };

                        const mapMarkers = [
                          ...(companions || []).map(c => {
                            const coords = getCoords(c);
                            return coords ? {
                              id: c.id,
                              position: { lat: coords.lat, lng: coords.lng },
                              title: c.name,
                              subtitle: `${c.interests[0] || 'Buddy'} • NPR ${c.hourlyRate}/h`,
                              type: 'companion' as const
                            } : null;
                          }).filter(Boolean),
                          ...(activities || []).map(act => {
                            const coords = getCoords(act);
                            return coords ? {
                              id: act.id,
                              position: { lat: coords.lat, lng: coords.lng },
                              title: act.title,
                              subtitle: act.location || 'Nepal',
                              type: 'activity' as const
                            } : null;
                          }).filter(Boolean),
                          ...(events || []).map(evt => {
                            const coords = getCoords(evt);
                            return coords ? {
                              id: evt.id,
                              position: { lat: coords.lat, lng: coords.lng },
                              title: evt.title,
                              subtitle: evt.location || 'Nepal',
                              type: 'event' as const
                            } : null;
                          }).filter(Boolean)
                        ] as any[];

                        return (
                          <MapPreview 
                            center={{ lat: 27.7172, lng: 85.3240 }}
                            zoom={12}
                            height="400px"
                            markers={mapMarkers}
                            onMarkerClick={(id) => {
                              const comp = companions.find(c => c.id === id);
                              if (comp) {
                                handleViewCompanion(comp);
                                showToast(`Opening ${comp.name}'s profile`, 'info');
                              } else {
                                const act = activities.find(a => a.id === id);
                                if (act) {
                                  showToast(`Experience: ${act.title}`, 'info');
                                } else {
                                  showToast('Marker selected on map', 'info');
                                }
                              }
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>

                  {/* Companion Marketplace Feed */}
                  <section id="marketplace-section" className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border-token/40 pb-4">
                      <div>
                        <h2 className="text-xl md:text-3xl font-extrabold text-text-primary flex items-center gap-2">
                          Top Companions for You <span className="text-xs text-primary-action bg-primary-action/10 border border-primary-action/20 px-2.5 py-0.5 rounded-full">KYC Verified</span>
                        </h2>
                        <p className="text-xs text-text-secondary mt-1">Book safely. Hourly rates listed in NPR. Zero commission or matching fee.</p>
                      </div>
                    </div>

                    {companionsLoading ? (
                    <div className="text-center py-20 text-text-secondary flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full border-2 border-t-primary-action border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                      <span>Syncing companion profiles...</span>
                    </div>
                  ) : filteredCompanions.length === 0 ? (
                    <div className="text-center py-16 bg-surface border border-border-token/50 rounded-3xl space-y-4">
                      <Search className="w-12 h-12 text-text-secondary mx-auto mb-2" />
                      <h3 className="text-lg font-bold text-text-primary">No companions match your criteria</h3>
                      <p className="text-xs text-text-secondary max-w-sm mx-auto">Try resetting filters, selecting a different city, or checking your Saved list.</p>
                      <button 
                        onClick={() => { setSelectedCategory('All'); setSelectedCity('All'); setShowSavedOnly(false); setSearchQuery(''); }}
                        className="px-5 py-2.5 bg-primary-action text-background font-bold text-xs rounded-xl hover:bg-primary-action-hover"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : selectedCategory === 'All' && !searchQuery && selectedCity === 'All' && !showSavedOnly ? (
                    /* Grouped category-based horizontal scrolling rows */
                    (() => {
                      const categories = useCompanionCategories(filteredCompanions);

                      return (
                        <div className="space-y-10">
                          {categories.map(cat => (
                            <div key={cat.category} className="space-y-4 text-left">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl" role="img" aria-label={cat.category}>{cat.emoji}</span>
                                  <h3 className="text-lg font-bold text-text-primary tracking-tight">{cat.category}</h3>
                                  <span className="text-[10px] bg-surface-elevated text-text-secondary px-2.5 py-0.5 rounded-full border border-border-token/30">
                                    {cat.companions.length} {cat.companions.length === 1 ? 'guide' : 'guides'}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => {
                                    setSelectedCategory(cat.category);
                                    showToast(`Viewing all ${cat.category} guides`, 'success');
                                  }}
                                  className="text-xs font-bold text-primary-action hover:underline flex items-center gap-1"
                                >
                                  See all <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory pt-1">
                                {cat.companions.map((comp, compIdx) => {
                                    const isFav = favorites && favorites.includes(comp.id);
                                    return (
                                      <div key={`${cat.category}-${comp.id}-${compIdx}`}>
                                        <CompanionCard
                                          companion={comp}
                                          isFav={isFav}
                                          onToggleFavorite={toggleFavorite}
                                          onViewCompanion={handleViewCompanion}
                                          onShowToast={showToast}
                                          layout="featured"
                                        />
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    /* High-fidelity Companion grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredCompanions.map((comp, idx) => (
                        <CompanionCard
                          key={`${comp.id}-${idx}`}
                          companion={comp}
                          isFav={favorites.includes(comp.id)}
                          onToggleFavorite={toggleFavorite}
                          onViewCompanion={handleViewCompanion}
                          onShowToast={showToast}
                          layout="featured"
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* 2. IMMERSIVE HERO SECTION WITH INTEGRATED MINIMAL SEARCH */}
                <section className="relative rounded-[32px] overflow-hidden min-h-[340px] md:min-h-[460px] border border-border-token/40 bg-surface group shadow-2xl">
                  {/* Background Carousel Image */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeHeroSlide}
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 w-full h-full"
                    >
                      <img 
                        src={
                          activeHeroSlide === 0 
                            ? "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1200&auto=format&fit=crop" 
                            : activeHeroSlide === 1 
                              ? "https://images.unsplash.com/photo-1510425463958-dcced28da480?q=80&w=1200&auto=format&fit=crop" 
                              : "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop"
                        } 
                        alt="Himalayan Adventure Backdrop" 
                        className="w-full h-full object-cover brightness-[0.6]" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    </motion.div>
                  </AnimatePresence>
 
                  {/* Top-right Navigation Arrows */}
                  <div className="absolute top-6 right-6 flex gap-2 z-20">
                    <button 
                      onClick={() => setActiveHeroSlide(prev => (prev === 0 ? 2 : prev - 1))}
                      className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-text-primary backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-action"
                      aria-label="Previous slide"
                    >
                      ←
                    </button>
                    <button 
                      onClick={() => setActiveHeroSlide(prev => (prev + 1) % 3)}
                      className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-text-primary backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-action"
                      aria-label="Next slide"
                    >
                      →
                    </button>
                  </div>
 
                  {/* Left Content Column (Maximum visual priority) */}
                  <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent text-left">
                    <div className="max-w-2xl space-y-4">
                      {/* 10K+ beautiful indicator */}
                      <div className="flex items-center gap-2 text-primary-action text-xs font-bold uppercase tracking-wider drop-shadow-md">
                        <Sparkles className="w-4 h-4 animate-spin-slow" />
                        <span>10K+ amazing connections are waiting</span>
                      </div>

                      <h1 className="text-4xl md:text-6xl font-black text-text-primary leading-[1.1] tracking-tight drop-shadow-lg">
                        Explore Nepal <br/>
                        Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8A25E] via-[#E4D1AC] to-[#B69150]">Real People</span>
                      </h1>
                    </div>
                  </div>
 
                  {/* Indicator slider dots */}
                  <div className="absolute bottom-5 right-8 flex gap-1.5 z-20">
                    {[0, 1, 2].map(idx => (
                      <button 
                        key={idx}
                        onClick={() => setActiveHeroSlide(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-black focus:outline-none ${activeHeroSlide === idx ? 'bg-primary-action w-4' : 'bg-white/30 hover:bg-white/50'}`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </section>

                {/* 5. EXPLORE CURATED NEPAL EXPERIENCES */}
                <section id="activities-section" className="space-y-6">
                  <SectionHeader
                    title="📍 Explore Nepal Experiences"
                    subtitle="Book direct curated local adventures guided by trusted hosts."
                    action={
                      <button
                        onClick={() => { document.getElementById('activities-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className="text-xs font-bold text-primary-action hover:underline"
                      >
                        Explore All
                      </button>
                    }
                  />

                  <div id="activities-section" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {activitiesLoading ? (
                      [1, 2, 3].map(i => (
                        <div key={i} className="aspect-[4/3] bg-surface border border-border-token/40 rounded-3xl animate-pulse"></div>
                      ))
                    ) : (
                      activities.map((act, index) => {
                        const tags = ["TRENDING", "POPULAR", "TOP RATED", "NEW"];
                        const tag = tags[index % tags.length];
                        return (
                          <div
                            key={`${act.id || 'act'}-${index}`}
                            onClick={() => { setSelectedCategory((act as any).category || 'All'); showToast(`Filtered by ${act.title}`, 'success'); }}
                            className="group relative aspect-[4/3] rounded-[32px] overflow-hidden border border-border-token-light bg-surface hover:border-primary-action/40 hover:shadow-lg transition-all duration-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-action"
                          >
                            <img
                              src={act.imageUrl || act.image}
                              alt={act.title}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent z-10" />

                            {/* Top tag */}
                            <span className="absolute top-4 left-4 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black tracking-widest text-primary-action border border-border-token/60 uppercase z-20">
                              {tag}
                            </span>

                            {/* Bottom Details */}
                            <div className="absolute bottom-5 left-5 right-5 z-20 space-y-2 text-left">
                              <h4 className="text-lg font-extrabold text-text-primary leading-tight group-hover:text-primary-action transition-colors drop-shadow-md">
                                {act.title}
                              </h4>
                              <div className="flex items-center justify-between pt-1.5 border-t border-border-token/60 text-[10px] text-text-secondary">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-primary-action" /> {act.duration}
                                </span>
                                <span className="font-bold text-primary-action">
                                  Avg. NPR {act.avgPrice}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                {/* 6. INTERACTIVE INCOME ESTIMATOR CALCULATOR */}
                <section className="bg-gradient-to-br from-background to-surface border border-primary-action/20 rounded-[32px] p-8 md:p-10 text-left relative overflow-hidden my-12">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary-action/5 rounded-full blur-3xl"></div>
                  <div className="max-w-xl space-y-4">
                    <span className="text-[10px] uppercase tracking-widest font-black text-primary-action flex items-center gap-2"><Coins className="w-4 h-4" /> Earn Income as a SATHI Companion</span>
                    <h3 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight">How much can you earn guiding with us?</h3>
                    <p className="text-xs text-text-secondary leading-relaxed font-light max-w-lg">Set your own rates, host on your calendar, share Nepal's local flavor with global digital nomads, and earn. Calculate your potential earnings below!</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
                    {/* Input Sliders */}
                    <div className="space-y-8 self-center">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-secondary font-medium">Your Hourly Rate</span>
                          <span className="text-text-primary font-bold font-mono text-sm">NPR {calcHourlyRate}/hr</span>
                        </div>
                        <input 
                          type="range" 
                          min="500" 
                          max="3000" 
                          step="100"
                          value={calcHourlyRate}
                          onChange={(e) => setCalcHourlyRate(Number(e.target.value))}
                          className="w-full accent-primary-action h-1.5 bg-border-token rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-text-secondary font-medium">Weekly Hours Committed</span>
                          <span className="text-text-primary font-bold font-mono text-sm">{calcWeeklyHours} hrs/week</span>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="40" 
                          step="1"
                          value={calcWeeklyHours}
                          onChange={(e) => setCalcWeeklyHours(Number(e.target.value))}
                          className="w-full accent-primary-action h-1.5 bg-border-token rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Calculated Earnings display */}
                    <div className="bg-black/45 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-center text-center md:text-left space-y-6 relative shadow-inner">
                      <div className="grid grid-cols-2 gap-6 divide-x divide-white/10">
                        <div className="text-center">
                          <span className="text-[10px] uppercase text-text-secondary tracking-wider block font-bold">Est. Weekly</span>
                          <span className="text-xl md:text-2xl font-black text-text-primary font-mono mt-1 block">NPR {estWeeklyEarnings.toLocaleString()}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] uppercase text-primary-action tracking-wider block font-black">Est. Monthly</span>
                          <span className="text-2xl md:text-3xl font-black text-primary-action font-mono mt-1 block">NPR {estMonthlyEarnings.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => { setAuthMode('guide'); showToast("Initiating companion registration portal!", "success"); }}
                        className="w-full py-3 bg-primary-action hover:bg-primary-action-hover text-background rounded-2xl text-xs font-black uppercase tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-primary-action"
                      >
                        Apply to Become a SATHI Guide
                      </button>
                    </div>
                  </div>
                </section>

                {/* 7. INSTAGRAM-STYLE COMMUNITY FEED */}
                <section id="moments-section" className="space-y-6">
                  <SectionHeader
                    title="📸 Community Moments Feed"
                    subtitle="Live adventures shared by travelers and companion guides in Kathmandu valley."
                  />

                  <CommunityFeed />
                </section>

                {/* 8. COMMISSION-SUPPORTING PARTNERS ROW */}
                <section className="space-y-6">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary-action">SATHI Co-Experiences</span>
                    <h3 className="text-xl md:text-2xl font-extrabold text-text-primary">Our Local Experience Partners</h3>
                    <p className="text-xs text-text-secondary">Book companion activities and enjoy exclusive discounts & commissions at these fine spots.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {partners.slice(0, 8).map((partner, i) => (
                      <div key={`${partner.id || 'p'}-${i}`} className="bg-surface border border-border-token/50 rounded-2xl p-5 text-center space-y-2 hover:border-primary-action/30 hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-surface-elevated border border-border-token rounded-full flex items-center justify-center mx-auto text-primary-action font-black text-sm">
                          {partner.name.substring(0, 2)}
                        </div>
                        <h4 className="text-xs font-bold text-text-primary block truncate">{partner.name}</h4>
                        <span className="text-[9px] text-primary-action bg-primary-action/10 px-2 py-0.5 rounded-full font-bold block w-max mx-auto">{partner.disc}</span>
                        <span className="text-[9px] text-text-secondary block">{partner.loc}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 9. PREMIUM SINGLE TRUST & SAFETY STATEMENT */}
                <section className="bg-gradient-to-br from-surface to-background border border-border-token/40 rounded-[32px] p-8 md:p-12 text-center md:text-left shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-action/5 rounded-full blur-3xl"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-3 max-w-xl text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-action/10 rounded-full flex items-center justify-center text-primary-action">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">SATHI Shield Protection</h3>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed font-light">
                        Every companion buddy is fully ID-verified, background screened, and managed under strict Nepal Tourism safety guidelines. Your funds are protected in escrow and disbursed only after your adventure completes.
                      </p>
                      <span className="text-lg font-black text-primary-action block tracking-tight pt-1">
                        Trusted by 25,000+ Travelers
                      </span>
                    </div>

                    <button 
                      onClick={() => { setShowSOS(true); showToast('SOS Emergency protocol initiated', 'info'); }}
                      className="px-6 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      🚨 Emergency Support Protocol
                    </button>
                  </div>
                </section>

                {/* 10. PREMIUM MARKETPLACE FOOTER */}
                <footer className="pt-8 border-t border-border-token/40 text-left space-y-8 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary-action">Company</h4>
                      <ul className="space-y-1.5 text-xs text-text-secondary">
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('about'); }} className="hover:text-text-primary transition-colors">About SATHI</a></li>
                        <li><a href="https://sathi.com/careers" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Careers</a></li>
                        <li><a href="https://sathi-blog.example.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Safety Blog</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('partner'); }} className="hover:text-text-primary transition-colors">Partnership Hub</a></li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Community</h4>
                      <ul className="space-y-1.5 text-xs text-text-secondary">
                        <li><a href="#" onClick={(e) => { e.preventDefault(); const momentSec = document.getElementById('moments-section'); momentSec?.scrollIntoView({behavior:'smooth'}); }} className="hover:text-text-primary transition-colors">Shared Adventures</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("Community guidelines are being updated", "info"); }} className="hover:text-text-primary transition-colors">Community Rules</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('about'); }} className="hover:text-text-primary transition-colors">Local Events</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('guide'); }} className="hover:text-text-primary transition-colors">Become SATHI Companion</a></li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Security & Help</h4>
                      <ul className="space-y-1.5 text-xs text-text-secondary">
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveDocType('help'); }} className="hover:text-text-primary transition-colors">24/7 Support Desk</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveDocType('privacy'); }} className="hover:text-text-primary transition-colors">Privacy Policy & Verification</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setShowSOS(true); }} className="hover:text-text-primary transition-colors">Emergency Protocol</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveDocType('terms'); }} className="hover:text-text-primary transition-colors">Terms of Service</a></li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary-action">Location</h4>
                      <p className="text-xs text-text-secondary leading-relaxed font-light">SATHI Experiences Inc.<br/>Thamel High Street, Ward 26<br/>Kathmandu, Nepal</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-border-token/30 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-secondary">
                    <span>&copy; {new Date().getFullYear()} SATHI. Nepal Social Experiences Marketplace. All Rights Reserved.</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary-action" /> Managed under Nepal Tourism Guidelines</span>
                  </div>
                </footer>

              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <DashboardTab onMessageCompanion={(companionId) => {
                  setActiveChatCompanionId(companionId);
                  setActiveTab('messages');
                  setMobileTab('messages');
                }} />
              </motion.div>
            )}

             {activeTab === 'companions' && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 <SectionHeader
                   title="Discover Companions"
                   subtitle="Browse verified local companions by category, location, and interest."
                   badge={<span className="text-xs text-primary-action bg-primary-action/10 border border-primary-action/20 px-2.5 py-0.5 rounded-full">KYC Verified</span>}
                   action={
                     <button 
                       onClick={() => setIsFilterDrawerOpen(true)}
                       className="flex items-center gap-2 px-3.5 py-2 bg-surface-elevated hover:bg-border-token border border-border-token hover:border-primary-action rounded-xl text-xs font-bold text-text-primary transition-all shadow-sm"
                     >
                       <SlidersHorizontal className="w-3.5 h-3.5 text-primary-action" />
                       <span>Filters</span>
                       {activeFilterCount > 0 && (
                         <span className="w-4 h-4 rounded-full bg-primary-action text-background text-[9px] font-extrabold flex items-center justify-center">{activeFilterCount}</span>
                       )}
                     </button>
                   }
                 />

                 {companionsLoading ? (
                   <div className="text-center py-20 text-text-secondary flex flex-col items-center gap-2">
                     <div className="w-10 h-10 rounded-full border-2 border-t-primary-action border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                     <span>Syncing companion profiles...</span>
                   </div>
                 ) : filteredCompanions.length === 0 ? (
                   <div className="text-center py-20">
                     <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
                     <p className="text-sm font-bold text-text-secondary">No companions found</p>
                     <p className="text-[10px] text-text-muted mt-1">Try adjusting your search or filters</p>
                   </div>
                  ) : (
                    <div className="space-y-8">
                      {(() => {
                        const categories = useCompanionCategories(filteredCompanions);

                        return categories.map(cat => (
                          <div key={cat.category} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl" role="img" aria-label={cat.category}>{cat.emoji}</span>
                                <h3 className="text-lg font-bold text-text-primary tracking-tight">{cat.category}</h3>
                                <span className="text-[10px] bg-surface-elevated text-text-secondary px-2.5 py-0.5 rounded-full border border-border-token/30">
                                  {cat.companions.length} {cat.companions.length === 1 ? 'guide' : 'guides'}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory">
                              {cat.companions.map((comp, idx) => (
                                <div key={`${comp.id}-${idx}`}>
                                  <CompanionCard
                                    companion={comp}
                                    isFav={favorites.includes(comp.id)}
                                    onToggleFavorite={toggleFavorite}
                                    onViewCompanion={handleViewCompanion}
                                    onShowToast={showToast}
                                    layout="featured"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
               </motion.div>
             )}

            {activeTab === 'partner' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <PartnerDashboard />
              </motion.div>
            )}

            {activeTab === 'bookings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left">
                <h2 className="text-2xl font-extrabold text-text-primary mb-6 border-b border-border-token/40 pb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary-action" /> My Companion Bookings
                </h2>
                {bookings.filter(b => b.userId === currentUser?.id).length > 0 ? (
                  <div className="grid gap-4">
                    {bookings.filter(b => b.userId === currentUser?.id).map((booking, idx) => {
                      const companion = companions.find(c => c.id === booking.companionId);
                      const isCancellable = booking.status === 'pending' || booking.status === 'confirmed';
                      return (
                        <div key={`${booking.id || 'booking'}-${idx}`} className="bg-surface border border-border-token/40 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-text-primary mb-1">Booking with {companion?.name || 'Companion'}</h3>
                            <p className="text-xs text-text-secondary">Scheduled: {booking.date} at {booking.time}</p>
                            <p className="text-xs text-text-secondary mt-0.5">Duration: {booking.duration} hours {booking.participants > 1 ? `x ${booking.participants} persons` : ''}</p>
                            {booking.meetingPoint && <p className="text-xs text-text-secondary">Meeting Point: {booking.meetingPoint}</p>}
                          </div>
                          <div className="text-right flex flex-col items-end gap-2 shrink-0">
                            <span className="block font-bold text-primary-action">NPR {booking.totalPrice.toFixed(2)}</span>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${booking.status === 'confirmed' ? 'bg-green-500/10 border-green-500/50 text-green-500' : booking.status === 'cancelled' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'}`}>
                              {booking.status}
                            </span>
                            <div className="flex gap-2 mt-1">
                              {isCancellable && (
                                <button onClick={() => { updateBookingStatus(booking.id, 'cancelled'); showToast('Booking cancelled', 'info'); }} className="text-xs text-red-400 hover:text-red-300 transition-colors">Cancel</button>
                              )}
                              {booking.status === 'confirmed' && (
                                <button onClick={() => { updateBookingStatus(booking.id, 'completed'); showToast('Booking marked as completed', 'success'); }} className="text-xs text-green-400 hover:text-green-300 transition-colors">Mark Complete</button>
                              )}
                              <button 
                                onClick={() => {
                                  setActiveChatCompanionId(booking.companionId);
                                  setActiveTab('messages');
                                  setMobileTab('messages');
                                }} 
                                className="text-xs text-primary-action hover:text-primary-action-hover font-semibold transition-colors ml-2"
                              >
                                Message Companion
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-surface border border-border-token/40 p-8 rounded-2xl flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-surface-elevated border border-border-token flex items-center justify-center">
                      <Star className="w-8 h-8 text-text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-primary">No active bookings</h3>
                      <p className="text-xs text-text-secondary mt-1">You do not have any upcoming experiences scheduled with SATHI guides yet.</p>
                    </div>
                    <button onClick={() => setActiveTab('explore')} className="mt-4 px-6 py-2.5 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors text-xs uppercase tracking-wider">
                      Discover Companions
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'messages' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <MessagesTab 
                  onOpenAuth={setAuthMode} 
                  initialCompanionId={activeChatCompanionId} 
                  onBrowseCompanions={handleBrowseCompanions}
                  onBrowseActivities={handleBrowseActivities}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SettingsTab />
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto text-left">
                <h2 className="text-3xl font-light text-text-primary mb-6 border-b border-border-token pb-4">About <span className="font-bold">SATHI<span className="text-primary-action">.</span></span></h2>
                
                <div className="bg-surface border border-border-token p-8 rounded-3xl space-y-6 text-text-secondary leading-relaxed">
                  <p className="text-lg text-text-primary">
                    SATHI is Nepal's elite social marketplace connecting travelers with KYC-verified, trusted local guides for non-dating cultural exchange, outdoor hiking, and Lake Pokhara adventure.
                  </p>
                  <p className="font-light text-xs">
                    We ensure transparent hourly billing in NPR, zero hidden commission fees, complete safety backup checks, and localized experiences that make you feel at home in our glorious mountains.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ==================== RESPONSIVE BOTTOM SIDEBAR FOR TABLETS/MOBILE (xl:hidden) ==================== */}
            <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border-token/40 pt-10 mt-12">
              {/* Upcoming Events */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Upcoming Group Events</h4>
                  <button onClick={() => showToast('Events calendar loaded', 'info')} className="text-[10px] text-primary-action font-bold hover:underline">View All</button>
                </div>

                <div className="space-y-3.5">
                  {eventsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-16 bg-surface rounded-xl"></div>
                      <div className="h-16 bg-surface rounded-xl"></div>
                    </div>
                  ) : (
                    events.slice(0, 2).map((event, idx) => {
                      const dateObj = new Date(event.date);
                      const month = dateObj.toLocaleString('en-US', { month: 'short' });
                      const day = dateObj.getDate();
                      return (
                        <div key={`${event.id || 'evt'}-${idx}`} className="bg-surface border border-border-token/40 p-4 rounded-2xl flex gap-3.5 hover:border-primary-action/40 transition-colors text-left relative group">
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-surface-elevated border border-border-token/60 flex flex-col items-center justify-center">
                            <span className="text-primary-action text-[9px] font-extrabold uppercase leading-none">{month}</span>
                            <span className="text-text-primary font-black text-sm mt-0.5 leading-none">{day}</span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <h5 className="font-bold text-text-primary text-xs truncate group-hover:text-primary-action transition-colors">{event.title}</h5>
                            <p className="text-[10px] text-text-secondary flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-primary-action" /> {event.location}</p>
                            <p className="text-[10px] text-text-secondary flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</p>
                            
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[9px] text-text-secondary"><span className="text-text-primary font-semibold">{event.spots}</span> spots left</span>
                              {(() => {
                                const btn = getEventButtonState(event);
                                return (
                                  <button 
                                    onClick={() => {
                                      if (btn.action === 'join') handleJoinEvent(event.id);
                                      else if (btn.action === 'leave') handleLeaveEvent(event.id);
                                    }}
                                    disabled={btn.disabled}
                                    className="px-2.5 py-1 bg-surface-elevated text-text-primary border border-border-token/60 text-[9px] font-bold rounded-lg hover:bg-primary-action hover:text-background hover:border-primary-action transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {btn.text}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Security trust panel & Social impact tracker */}
              <div className="space-y-6">
                {/* Trust panel */}
                <div className="bg-surface border border-border-token-light rounded-3xl p-6 text-left space-y-5 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-border-token-light">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Why Choose SATHI?</h4>
                    <span className="text-[10px] text-primary-action font-semibold bg-primary-action/10 px-3 py-1 rounded-full">✔ Secure Platform</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
                    {[
                      { title: "✔ KYC Verification", desc: "All companion identities strictly checked & verified." },
                      { title: "✔ Secure Escrow", desc: "Funds held safely in secure escrow in NPR currency." },
                      { title: "✔ SOS Support", desc: "24/7 SOS location check-ins and helpline backup." },
                      { title: "✔ Free Discovery", desc: "Explore peer profiles and build connections entirely free." }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1 text-xs group">
                        <span className="font-bold text-text-primary block text-sm tracking-tight leading-normal">
                          {item.title}
                        </span>
                        <span className="text-xs text-text-secondary block font-normal leading-relaxed">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Impact widget */}
                <div className="bg-surface/80 border border-border-token/40 rounded-2xl p-4 text-left space-y-3 relative overflow-hidden">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Your Social Impact</h4>
                  <p className="text-[10px] text-text-secondary font-light">Connections and cultural adventures built by you this month in Nepal.</p>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1.5">
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-base font-black text-text-primary block">12</span>
                      <span className="text-[8px] uppercase tracking-wider text-text-secondary block font-semibold">Matched</span>
                    </div>
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-base font-black text-primary-action block">5</span>
                      <span className="text-[8px] uppercase tracking-wider text-text-secondary block font-semibold">Trips</span>
                    </div>
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-base font-black text-text-primary block">3</span>
                      <span className="text-[8px] uppercase tracking-wider text-text-secondary block font-semibold">Friends</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>

          {/* ==================== RIGHT SIDEBAR (DASHBOARD WIDGETS) ==================== */}
          <aside className="hidden xl:block col-span-3 p-6 border-l border-border-token/40 space-y-6 bg-background h-max sticky top-[72px]">
            
            {/* 1. UPCOMING EVENTS (MEETUP INSPIRED) */}
            <div id="events-section" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Upcoming Group Events</h4>
                <button onClick={() => showToast('Events calendar loaded', 'info')} className="text-[10px] text-primary-action font-bold hover:underline">View All</button>
              </div>

              <div className="space-y-3.5">
                {eventsLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-16 bg-surface rounded-xl"></div>
                    <div className="h-16 bg-surface rounded-xl"></div>
                  </div>
                ) : (
                  events.slice(0, 3).map((event, idx) => {
                    const dateObj = new Date(event.date);
                    const month = dateObj.toLocaleString('en-US', { month: 'short' });
                    const day = dateObj.getDate();
                    return (
                      <div key={`${event.id || 'evt'}-${idx}`} className="bg-surface border border-border-token/40 p-4 rounded-2xl flex gap-3.5 hover:border-primary-action/40 transition-colors text-left relative group">
                        {/* Event Date badge */}
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-surface-elevated border border-border-token/60 flex flex-col items-center justify-center">
                          <span className="text-primary-action text-[9px] font-extrabold uppercase leading-none">{month}</span>
                          <span className="text-text-primary font-black text-sm mt-0.5 leading-none">{day}</span>
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-bold text-text-primary text-xs truncate group-hover:text-primary-action transition-colors">{event.title}</h5>
                          <p className="text-[10px] text-text-secondary flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-primary-action" /> {event.location}</p>
                          <p className="text-[10px] text-text-secondary flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</p>
                          
                           <div className="flex items-center justify-between pt-2">
                             <span className="text-[9px] text-text-secondary"><span className="text-text-primary font-semibold">{event.spots}</span> spots left</span>
                             {(() => {
                               const btn = getEventButtonState(event);
                               return (
                                 <button 
                                   onClick={() => {
                                     if (btn.action === 'join') handleJoinEvent(event.id);
                                     else if (btn.action === 'leave') handleLeaveEvent(event.id);
                                   }}
                                   disabled={btn.disabled}
                                   className="px-2.5 py-1 bg-surface-elevated text-text-primary border border-border-token/60 text-[9px] font-bold rounded-lg hover:bg-primary-action hover:text-background hover:border-primary-action transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                   {btn.text}
                                 </button>
                               );
                             })()}
                           </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. BECOME A COMPANION BANNER */}
            <div className="bg-surface-elevated/40 border border-border-token/50 rounded-2xl p-5 text-left relative overflow-hidden flex flex-col justify-between h-44">
              <div className="space-y-1.5 z-10">
                <span className="text-[9px] uppercase tracking-widest text-primary-action font-bold">Guiding Careers</span>
                <h4 className="text-sm font-bold text-text-primary">Become a SATHI Companion Mating Host</h4>
                <p className="text-[10px] text-text-secondary leading-relaxed">Host experiences, meet world travelers, and earn secure NPR rates.</p>
              </div>
              <button 
                onClick={() => { setAuthMode('guide'); }}
                className="w-full py-2 bg-primary-action hover:bg-primary-action-hover text-background rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md z-10"
              >
                Apply to Host
              </button>
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary-action/5 rounded-full blur-xl"></div>
            </div>

            {/* 3. WHY CHOOSE SATHI FEATURE PANEL */}
            <div className="bg-surface border border-border-token-light rounded-3xl p-5 text-left space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between pb-2 border-b border-border-token-light">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Why Choose SATHI?</h4>
                <span className="text-[9px] text-primary-action font-semibold bg-primary-action/10 px-2.5 py-0.5 rounded-full">✔ Secure</span>
              </div>
              <div className="space-y-4">
                {[
                  { title: "✔ KYC Verification", desc: "All companion identities checked & verified." },
                  { title: "✔ Secure Escrow", desc: "Funds held safely in NPR currency." },
                  { title: "✔ SOS Support", desc: "SOS check-ins and active helpline support." },
                  { title: "✔ Free Discovery", desc: "Explore peer profiles and connect free." }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1 text-xs group">
                    <span className="font-bold text-text-primary block text-sm tracking-tight leading-normal">
                      {item.title}
                    </span>
                    <span className="text-xs text-text-secondary block font-normal leading-relaxed">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. USER CONNECTIONS IMPACT WIDGET */}
            <div className="bg-gradient-to-tr from-surface-elevated to-surface border border-border-token/40 rounded-2xl p-4 text-left space-y-3 relative overflow-hidden">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Your Social Impact</h4>
              <p className="text-[10px] text-text-secondary font-light">Connections and cultural adventures built by you this month in Nepal.</p>
              
              <div className="grid grid-cols-3 gap-2 text-center pt-1.5">
                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-base font-black text-text-primary block">12</span>
                  <span className="text-[8px] uppercase tracking-wider text-text-secondary block font-semibold">Matched</span>
                </div>
                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-base font-black text-primary-action block">5</span>
                  <span className="text-[8px] uppercase tracking-wider text-text-secondary block font-semibold">Trips</span>
                </div>
                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-base font-black text-text-primary block">3</span>
                  <span className="text-[8px] uppercase tracking-wider text-text-secondary block font-semibold">Friends</span>
                </div>
              </div>

              {/* Decorative Vector Path (Matches bottom ambient waves) */}
              <div className="h-6 w-full pt-2 opacity-30">
                <svg className="w-full h-full text-primary-action" viewBox="0 0 100 20" fill="none" preserveAspectRatio="none">
                  <path d="M0 10 C 25 15, 25 5, 50 10 C 75 15, 75 5, 100 10 L 100 20 L 0 20 Z" fill="currentColor"/>
                </svg>
              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* ==================== MOBILE VIEWPORT (lg:hidden) ==================== */}
      <div className="lg:hidden flex flex-col flex-1 min-h-screen relative bg-background pb-24 text-left">
        
        {/* Render Mobile Active Tab Overrides */}
        {activeTab === 'dashboard' ? (
          <div className="p-4 space-y-6 pb-20">
            <div className="flex items-center justify-between p-3 bg-background border-b border-white/5 sticky top-0 z-20 backdrop-blur-md">
              <button onClick={() => { setActiveTab('explore'); setMobileTab('home'); navigate('/'); }} className="flex items-center gap-1.5 text-xs font-bold text-primary-action">
                <ChevronLeft className="w-4 h-4" /> Home
              </button>
              <span className="text-xs font-black text-text-primary uppercase tracking-wider">My Dashboard</span>
              <div className="w-12" />
            </div>
            <DashboardTab onMessageCompanion={(companionId) => {
              setActiveChatCompanionId(companionId);
              setActiveTab('messages');
              setMobileTab('messages');
            }} />
          </div>
        ) : activeTab === 'partner' ? (
          <div className="p-4 space-y-6 pb-20">
            <div className="flex items-center justify-between p-3 bg-background border-b border-white/5 sticky top-0 z-20 backdrop-blur-md">
              <button onClick={() => { setActiveTab('explore'); setMobileTab('home'); navigate('/'); }} className="flex items-center gap-1.5 text-xs font-bold text-primary-action">
                <ChevronLeft className="w-4 h-4" /> Home
              </button>
              <span className="text-xs font-black text-text-primary uppercase tracking-wider">Companion Console</span>
              <div className="w-12" />
            </div>
            <PartnerDashboard />
          </div>
        ) : activeTab === 'settings' ? (
          <div className="p-4 space-y-6 pb-20">
            <div className="flex items-center justify-between p-3 bg-background border-b border-white/5 sticky top-0 z-20 backdrop-blur-md">
              <button onClick={() => { setActiveTab('explore'); setMobileTab('home'); navigate('/'); }} className="flex items-center gap-1.5 text-xs font-bold text-primary-action">
                <ChevronLeft className="w-4 h-4" /> Home
              </button>
              <span className="text-xs font-black text-text-primary uppercase tracking-wider">Settings</span>
              <div className="w-12" />
            </div>
            <SettingsTab />
          </div>
        ) : activeTab === 'about' ? (
          <div className="p-4 space-y-6 pb-20 text-left">
            <div className="flex items-center justify-between p-3 bg-background border-b border-white/5 sticky top-0 z-20 backdrop-blur-md mb-2">
              <button onClick={() => { setActiveTab('explore'); setMobileTab('home'); navigate('/'); }} className="flex items-center gap-1.5 text-xs font-bold text-primary-action">
                <ChevronLeft className="w-4 h-4" /> Home
              </button>
              <span className="text-xs font-black text-text-primary uppercase tracking-wider">About SATHI</span>
              <div className="w-12" />
            </div>
            <h2 className="text-2xl font-light text-text-primary mb-4 border-b border-border-token pb-3">About <span className="font-bold">SATHI<span className="text-primary-action">.</span></span></h2>
            <div className="bg-surface border border-border-token p-6 rounded-3xl space-y-4 text-text-secondary leading-relaxed">
              <p className="text-base text-text-primary">
                SATHI is Nepal's elite social marketplace connecting travelers with KYC-verified, trusted local guides for non-dating cultural exchange, outdoor hiking, and Lake Pokhara adventure.
              </p>
              <p className="font-light text-xs">
                We ensure transparent hourly billing in NPR, zero hidden commission fees, complete safety backup checks, and localized experiences that make you feel at home in our glorious mountains.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Render Mobile Tab Home */}
            {mobileTab === 'home' && (
              <div className="space-y-6">
                {/* Header with Search Bar */}
                <div className="flex items-center justify-between gap-3 p-4 bg-background border-b border-white/5 h-[62px]">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-primary-action flex items-center justify-center font-bold text-background text-base">S</div>
                    <span className="text-lg font-black tracking-tight text-text-primary hidden sm:inline">SATHI</span>
                  </div>
                  
                  {/* Fully rounded Glassmorphism Search Bar */}
                  <div className="flex-1 relative flex items-center">
                    <Search className="w-4 h-4 text-primary-action absolute left-3" />
                    <input 
                      type="text" 
                      placeholder="Where are you going?" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-9 bg-surface-elevated/60 backdrop-blur-md rounded-full border border-white/10 text-xs text-text-primary focus:outline-none focus:border-primary-action transition-all"
                    />
                    <button 
                      onClick={() => setIsFilterDrawerOpen(true)}
                      className="absolute right-3 text-text-secondary hover:text-primary-action transition-colors"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                  </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* User profile with golden border */}
                <img 
                  src={currentUser?.avatar || "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?q=80&w=300&auto=format&fit=crop"} 
                  className="w-9 h-9 rounded-full object-cover border-2 border-primary-action cursor-pointer" 
                  alt="Profile"
                  onClick={() => { setShowProfileDropdown(true); }}
                />
              </div>
            </div>

            {/* Instagram-style Stories */}
            <div id="stories-section" className="px-4 py-1 bg-background">
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1 snap-x">
                {/* Your Story */}
                <div 
                  onClick={() => setShowCreateStoryModal(true)} 
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 snap-start"
                >
                  <div className="relative w-[68px] h-[68px] rounded-full border-2 border-dashed border-primary-action/60 flex items-center justify-center bg-surface">
                    <span className="text-lg font-bold text-primary-action">+</span>
                  </div>
                  <span className="text-[10px] text-text-secondary font-bold">Your Story</span>
                </div>
                
                {/* Dynamic Stories based on companions */}
                {fetchedStories.map((st, i) => (
                  <div 
                    key={`${st.id}-${i}`} 
                    onClick={() => setViewingStory(st)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 snap-start"
                  >
                    <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#C8A25E] via-pink-600 to-purple-600">
                      <div className="p-[1.5px] rounded-full bg-background">
                        <SafeImage 
                          src={st.userAvatar} 
                          alt={st.userName} 
                          fallbackType="avatar"
                          textForInitials={st.userName}
                          className="w-[60px] h-[60px] rounded-full object-cover" 
                        />
                      </div>
                      <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                    </div>
                    <span className="text-[10px] text-text-primary font-bold truncate max-w-[65px]">{st.userName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic category-based feed for Mobile */}
            {(() => {
              const feedItems = homeFeedItems;

              const categoryChunks = feedItems.reduce<FeedItem[][]>((acc, item) => {
                if (item.type === 'category-header' && acc.length > 0 && acc[acc.length - 1].length > 0) {
                  acc.push([item]);
                } else if (item.type === 'category-header') {
                  acc.push([item]);
                } else {
                  if (acc.length === 0) acc.push([item]);
                  else acc[acc.length - 1].push(item);
                }
                return acc;
              }, []);

              const visibleMobileItems = categoryChunks.slice(0, visibleMobileCategoryCount).flat();

              const grouped = visibleMobileItems.reduce<Record<string, FeedItem[]>>((acc, item) => {
                if (item.type === 'category-header') return acc;
                const cat = (item as Extract<FeedItem, { category?: string }>).category || 'General';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {});

              const categories = Object.keys(grouped);

              return (
                <div className="space-y-6">
                  {categories.map(cat => {
                    const items = grouped[cat];
                    const companions = items.filter(i => i.type === 'companion');
                    const activities = items.filter(i => i.type === 'activity');
                    const events = items.filter(i => i.type === 'event');
                    const stories = items.filter(i => i.type === 'story');

                    const emoji = (cat === 'Hiking Partner' && '🥾') ||
                      (cat === 'Coffee Buddy' && '☕') ||
                      (cat === 'Photography Guide' && '📷') ||
                      (cat === 'Food Explorer' && '🍜') ||
                      (cat === 'Cultural Guide' && '🏛️') ||
                      (cat === 'Local Host' && '✨') ||
                      (cat === 'Travel Companion' && '✈️') ||
                      '📌';

                    return (
                      <div key={cat} className="space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{emoji}</span>
                            <h3 className="text-sm font-extrabold text-text-primary">{cat}</h3>
                          </div>
                          <span className="text-[10px] font-bold text-primary-action cursor-pointer" onClick={() => { setSelectedCategory(cat); setMobileTab('search'); showToast(`Viewing all ${cat} guides`, 'success'); }}>See all</span>
                        </div>

                        {companions.length > 0 && (
                          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x">
                            {companions.map((item, idx) => (
                              <div key={`${cat}-comp-${item.data.id}-${idx}`}>
                                <CompanionCard
                                  companion={item.data as Companion}
                                  isFav={favorites.includes(item.data.id)}
                                  onToggleFavorite={toggleFavorite}
                                  onViewCompanion={handleViewCompanion}
                                  onShowToast={showToast}
                                  layout="compact"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {activities.length > 0 && (
                          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x">
                            {activities.map((item, idx) => (
                              <div key={`${cat}-act-${item.data.id}-${idx}`} className="shrink-0 w-44 bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col snap-start">
                                <div className="relative h-24 bg-surface-elevated">
                                  <SafeImage src={(item.data as Activity).imageUrl || (item.data as Activity).image} className="w-full h-full object-cover" alt={(item.data as Activity).title} />
                                </div>
                                <div className="p-2.5 space-y-1 text-left">
                                  <h4 className="text-[11px] font-bold text-text-primary truncate">{(item.data as Activity).title}</h4>
                                  <p className="text-[9px] text-text-secondary">NPR {(item.data as Activity).avgPrice || (item.data as Activity).price || '1,500'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {events.length > 0 && (
                          <div className="space-y-2">
                            {events.slice(0, 3).map((item, idx) => (
                              <div key={`${cat}-evt-${item.data.id}-${idx}`} className="bg-surface border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-surface-elevated flex flex-col items-center justify-center border border-white/10">
                                  <span className="text-primary-action text-[7px] font-black leading-none uppercase">
                                    {new Date((item.data as SathiEvent).date || Date.now()).toLocaleString('en-US', { month: 'short' })}
                                  </span>
                                  <span className="text-text-primary font-black text-xs leading-none mt-0.5">
                                    {new Date((item.data as SathiEvent).date || Date.now()).getDate()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                   <h5 className="text-[11px] font-bold text-text-primary truncate">{(item.data as SathiEvent).title}</h5>
                                   <p className="text-[9px] text-text-secondary truncate">{(item.data as SathiEvent).location}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {stories.length > 0 && (
                          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x">
                            {stories.map((item, idx) => (
                              <div key={`${cat}-story-${item.data.id}-${idx}`} className="shrink-0 w-36 bg-surface border border-white/5 rounded-2xl overflow-hidden">
                                <div className="relative h-24 bg-surface-elevated">
                                  <SafeImage src={(item.data as ExperienceStory).imageUrl} className="w-full h-full object-cover" alt={(item.data as ExperienceStory).caption} />
                                </div>
                                <div className="p-2">
                                  <p className="text-[10px] text-text-primary line-clamp-2">{(item.data as ExperienceStory).caption}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Mobile progressive loading sentinel */}
            {(() => {
              const feedItems = homeFeedItems;
              const categoryChunks = feedItems.reduce<FeedItem[][]>((acc, item) => {
                if (item.type === 'category-header' && acc.length > 0 && acc[acc.length - 1].length > 0) {
                  acc.push([item]);
                } else if (item.type === 'category-header') {
                  acc.push([item]);
                } else {
                  if (acc.length === 0) acc.push([item]);
                  else acc[acc.length - 1].push(item);
                }
                return acc;
              }, []);
              
              if (visibleMobileCategoryCount >= categoryChunks.length) return null;
              
              return (
                <div ref={mobileSentinelRef} className="flex justify-center py-4">
                  <div className="w-8 h-8 rounded-full border-2 border-t-primary-action border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
              );
            })()}

            {/* Community Feed */}
            <div className="px-4 py-1 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-secondary">Community Feed</h3>
              </div>
              <CommunityFeed />
            </div>

            {/* Activities Section */}
            <div className="px-4 py-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-secondary">Explore by Activities</h3>
                <span className="text-xs font-bold text-primary-action cursor-pointer" onClick={() => setMobileTab('explore')}>See all</span>
              </div>
              
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                {[
                  { name: 'Hiking', icon: '🥾', cat: 'Hiking' },
                  { name: 'Coffee', icon: '☕', cat: 'Coffee' },
                  { name: 'Photography', icon: '📸', cat: 'Photography' },
                  { name: 'Culture', icon: '🏛️', cat: 'Culture' },
                  { name: 'Food', icon: '🍜', cat: 'Food' },
                  { name: 'Music', icon: '🎵', cat: 'Music' },
                  { name: 'Trekking', icon: '🏔️', cat: 'Trekking' }
                ].map((act) => (
                  <div 
                    key={act.name}
                    onClick={() => { setSelectedCategory(act.cat); setMobileTab('explore'); showToast(`Exploring ${act.name} experiences`, 'info'); }}
                    className="flex items-center gap-2 bg-surface border border-white/5 hover:border-primary-action/40 px-3.5 py-2.5 rounded-xl cursor-pointer shrink-0 transition-all duration-200"
                  >
                    <span className="text-base">{act.icon}</span>
                    <span className="text-xs font-bold text-text-primary">{act.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Experiences */}
            <div className="px-4 py-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-secondary">Popular Experiences</h3>
                <span className="text-xs font-bold text-primary-action cursor-pointer" onClick={() => showToast('Opening experience catalog...', 'info')}>See all</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1 snap-x">
                {activities.slice(0, 6).map((exp, i) => (
                  <div 
                    key={`${exp.id || 'exp'}-${i}`} 
                    className="shrink-0 w-56 bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col snap-start cursor-pointer hover:border-primary-action/30 transition-all"
                    onClick={() => showToast(`Opening ${exp.title} details...`, 'info')}
                  >
                    <div className="relative h-28 bg-surface-elevated">
                      <img src={exp.imageUrl || exp.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600'} className="w-full h-full object-cover" alt={exp.title} />
                      <span className="absolute top-2 left-2 bg-primary-action text-background text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {i === 0 ? 'TRENDING' : i === 1 ? 'POPULAR' : 'TOP RATED'}
                      </span>
                    </div>
                    <div className="p-3 space-y-1.5 text-left">
                      <h4 className="text-xs font-bold text-text-primary truncate">{exp.title}</h4>
                      <p className="text-[10px] text-text-secondary flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary-action" />
                        {exp.duration} • {exp.companionCount || 10} buddies
                      </p>
                      <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                        <span className="text-xs font-black text-primary-action">NPR {exp.avgPrice}</span>
                        <div className="flex items-center gap-0.5 text-[10px] text-primary-action font-bold">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>4.8</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="px-4 py-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-secondary">Upcoming Events</h3>
                <span className="text-xs font-bold text-primary-action cursor-pointer" onClick={() => showToast('All events loaded', 'success')}>See all</span>
              </div>
              
              <div className="space-y-3">
                {events.slice(0, 5).map((ev, idx) => {
                  const dateObj = new Date(ev.date || Date.now());
                  const monthStr = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase() || 'JUL';
                  const dayStr = String(dateObj.getDate() || '16');
                  const attendeesCount = ev.participants 
                    ? (Array.isArray(ev.participants) ? ev.participants.length : (typeof ev.participants === 'number' ? ev.participants : 8))
                    : 8;

                  return (
                    <div key={`${ev.id || 'ev'}-${idx}`} className="bg-surface border border-white/5 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="shrink-0 w-11 h-11 rounded-xl bg-surface-elevated flex flex-col items-center justify-center border border-white/10">
                          <span className="text-primary-action text-[8px] font-black leading-none uppercase">{monthStr}</span>
                          <span className="text-text-primary font-black text-sm leading-none mt-1">{dayStr}</span>
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-bold text-text-primary truncate max-w-[160px]">{ev.title}</h5>
                          <p className="text-[9px] text-text-secondary truncate max-w-[160px]">{ev.location} • {ev.time || "10:00 AM"}</p>
                          <span className="text-[8px] text-primary-action font-bold">{attendeesCount} buddies attending</span>
                        </div>
                      </div>
                       <button 
                         onClick={() => {
                           const btn = getEventButtonState(ev);
                           if (btn.action === 'join') handleJoinEvent(ev.id);
                           else if (btn.action === 'leave') handleLeaveEvent(ev.id);
                         }}
                         disabled={getEventButtonState(ev).disabled}
                         className="px-3 py-1.5 bg-primary-action hover:bg-primary-action-hover text-background text-[9px] font-black rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         {getEventButtonState(ev).text}
                       </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Become a Companion */}
            <div className="px-4 py-1 pb-6">
              <div className="relative rounded-[24px] overflow-hidden min-h-[160px] border border-white/5 flex flex-col justify-end p-5 text-left bg-surface">
                <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover brightness-[0.4]" alt="Become a Companion" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
                <div className="relative z-10 space-y-2.5">
                  <h3 className="text-sm font-extrabold text-text-primary leading-tight">Become a SATHI Companion</h3>
                  <p className="text-[10px] text-gray-300 leading-relaxed max-w-[240px]">Share your favorite local spots, guide travelers, and earn up to <span className="text-text-primary font-bold">NPR 15,000/week</span> on your own schedule.</p>
                  <button 
                    onClick={() => { setAuthMode('guide'); setIsGuide(true); }}
                    className="w-max px-4 py-2 bg-primary-action hover:bg-primary-action-hover active:scale-95 text-background rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Render Mobile Tab Explore */}
        {mobileTab === 'explore' && (
          <div className="space-y-6 pb-20 select-none">
            {/* Header */}
            <div className="p-4 bg-background border-b border-white/5 flex justify-between items-center sticky top-0 z-20 backdrop-blur-md bg-opacity-95">
              <div className="text-left">
                <span className="text-[10px] text-primary-action font-extrabold uppercase tracking-widest">SATHI Live Radar</span>
                <h2 className="text-xl font-extrabold text-text-primary">Explore Nearby</h2>
              </div>
              <div className="flex items-center gap-1 bg-primary-action/10 px-2.5 py-1 rounded-full border border-primary-action/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-primary-action tracking-wider">Live</span>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="px-4">
              <div className="bg-surface border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl shadow-black/40">
                <div className="p-3 bg-surface-elevated/40 border-b border-white/5 flex justify-between items-center text-left">
                  <span className="text-[10px] uppercase font-black tracking-wider text-text-secondary flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-primary-action animate-spin" /> Interactive Guide Map
                  </span>
                  <span className="text-[8px] text-text-secondary">Click pins to view details</span>
                </div>
                
                {/* Map Component */}
                <div className="relative">
                  {(() => {
                    // Safe Coordinate Resolver
                    const getCoords = (item: any) => {
                      if (!item?.coordinates) return null;
                      const lat = item.coordinates.latitude ?? item.coordinates._lat ?? item.coordinates.lat;
                      const lng = item.coordinates.longitude ?? item.coordinates._long ?? item.coordinates.lng;
                      if (typeof lat === 'number' && typeof lng === 'number') {
                        return { lat, lng };
                      }
                      return null;
                    };

                    const mapMarkers = [
                      ...(companions || []).map(c => {
                        const coords = getCoords(c);
                        return coords ? {
                          id: c.id,
                          position: { lat: coords.lat, lng: coords.lng },
                          title: c.name,
                          subtitle: `${c.interests[0] || 'Buddy'} • NPR ${c.hourlyRate}/h`,
                          type: 'companion' as const
                        } : null;
                      }).filter(Boolean),
                      ...(activities || []).map(act => {
                        const coords = getCoords(act);
                        return coords ? {
                          id: act.id,
                          position: { lat: coords.lat, lng: coords.lng },
                          title: act.title,
                          subtitle: act.location || 'Nepal',
                          type: 'activity' as const
                        } : null;
                      }).filter(Boolean),
                      ...(events || []).map(evt => {
                        const coords = getCoords(evt);
                        return coords ? {
                          id: evt.id,
                          position: { lat: coords.lat, lng: coords.lng },
                          title: evt.title,
                          subtitle: evt.location || 'Nepal',
                          type: 'event' as const
                        } : null;
                      }).filter(Boolean)
                    ] as any[];

                    return (
                      <MapPreview 
                        center={{ lat: 27.7172, lng: 85.3240 }} // Kathmandu center
                        zoom={12}
                        height="260px"
                        markers={mapMarkers}
                        onMarkerClick={(id) => {
                          const comp = companions.find(c => c.id === id);
                          if (comp) {
                            handleViewCompanion(comp);
                            showToast(`Opening ${comp.name}'s profile`, 'info');
                          } else {
                            const act = activities.find(a => a.id === id);
                            if (act) {
                              showToast(`Experience: ${act.title}`, 'info');
                            } else {
                              showToast('Marker selected on map', 'info');
                            }
                          }
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Trending Curated Experiences Nearby */}
            <div className="px-4 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-text-secondary">Trending Nearby Experiences</span>
                <button onClick={() => { setMobileTab('search'); setDiscoveryTab('activities'); }} className="text-[10px] font-black text-primary-action uppercase hover:underline">See All</button>
              </div>

              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
                {(activities || []).slice(0, 5).map((act) => (
                  <div 
                    key={act.id}
                    onClick={() => { setMobileTab('search'); setSearchQuery(act.title); setDiscoveryTab('activities'); }}
                    className="shrink-0 w-48 bg-surface border border-white/5 rounded-2xl overflow-hidden relative group cursor-pointer active:scale-98 transition-all"
                  >
                    <div className="w-full h-28 overflow-hidden bg-surface-elevated relative">
                      <SafeImage src={act.imageUrl || act.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={act.title} fallbackType="thumbnail" />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black text-primary-action uppercase tracking-wider">
                        {act.category || 'Curated'}
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="text-[11px] font-bold text-text-primary truncate leading-tight">{act.title}</h4>
                      <p className="text-[9px] text-text-secondary truncate flex items-center gap-0.5 font-light">
                        <MapPin className="w-2.5 h-2.5 text-primary-action" /> {act.location || 'Nepal'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Meetups and Events nearby */}
            <div className="px-4 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-text-secondary">Upcoming Local Events</span>
                <button onClick={() => { setMobileTab('search'); setDiscoveryTab('events'); }} className="text-[10px] font-black text-primary-action uppercase hover:underline">See All</button>
              </div>

              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1">
                {(events || []).slice(0, 5).map((evt) => (
                  <div 
                    key={evt.id}
                    onClick={() => showToast(`Event details: ${evt.title}`, 'info')}
                    className="shrink-0 w-64 bg-surface border border-white/5 rounded-2xl p-3 flex gap-3 cursor-pointer active:scale-98 transition-all"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-elevated shrink-0">
                      <SafeImage src={evt.imageUrl} className="w-full h-full object-cover" alt={evt.title} fallbackType="thumbnail" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[11px] font-extrabold text-text-primary truncate leading-tight">{evt.title}</h4>
                        <p className="text-[9px] text-text-secondary mt-0.5 truncate font-light">{evt.location}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] text-primary-action font-bold font-mono">{evt.date}</span>
                        <span className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{evt.spots} Left</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Itineraries */}
            <div className="px-4 space-y-3 text-left">
              <span className="text-[10px] uppercase font-black tracking-widest text-text-secondary block">Suggested Local Itineraries</span>
              <div className="space-y-3">
                {[
                  {
                    title: "Kathmandu Ancient Durbar Walk",
                    duration: "3 Hours • Easy",
                    desc: "Explore Newari pottery, hidden courtyards, and tea points in Patan Durbar Square with a coffee buddy.",
                    tag: "Culture"
                  },
                  {
                    title: "Sarangkot Sunset Acoustic Picnic",
                    duration: "4 Hours • Moderate",
                    desc: "An acoustic jam and evening local snack picnic with panoramic sunset mountain views of Annapurna.",
                    tag: "Scenic"
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => showToast(`Suggested itinerary selected: ${item.title}`, 'info')}
                    className="p-3 bg-surface border border-white/5 rounded-2xl relative overflow-hidden flex flex-col gap-1 cursor-pointer active:scale-99 transition-all hover:border-primary-action/30"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] bg-white/5 text-primary-action border border-primary-action/10 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        {item.tag}
                      </span>
                      <span className="text-[9px] font-bold text-text-secondary font-mono">{item.duration}</span>
                    </div>
                    <h4 className="text-xs font-bold text-text-primary mt-1 leading-snug">{item.title}</h4>
                    <p className="text-[10px] text-text-secondary font-light leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Render Mobile Tab Experiences */}
        {mobileTab === 'experiences' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-background border-b border-white/5">
              <span className="text-sm font-black text-text-primary uppercase tracking-wider">Experiences</span>
              <button onClick={() => showToast('Opening experiences catalog...', 'info')} className="text-xs font-bold text-primary-action hover:underline">See all</button>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-1">
              {['For You', 'Trending', 'Nearby', 'New', 'Adventures'].map((chip, i) => (
                <span 
                  key={chip} 
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all shrink-0 ${i === 0 ? 'bg-primary-action text-background' : 'bg-surface text-text-secondary'}`}
                  onClick={() => showToast(`Filtering by ${chip}`, 'info')}
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Sunrise Hike Featured Card */}
            <div className="p-4">
              <div className="relative rounded-3xl overflow-hidden aspect-[16/9] border border-white/5 shadow-lg bg-surface">
                <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600" className="absolute inset-0 w-full h-full object-cover brightness-75" alt="Sunrise Hike" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <button onClick={() => showToast('Added to bookmarks!', 'success')} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-text-primary">
                  <Heart className="w-3.5 h-3.5 text-text-primary" />
                </button>
                <div className="absolute bottom-3 inset-x-4 flex justify-between items-end text-left">
                  <div>
                    <h4 className="text-sm font-black text-text-primary drop-shadow">Sunrise Hike</h4>
                    <p className="text-[9px] text-text-primary/80 drop-shadow">Sarangkot, Pokhara</p>
                    <div className="flex items-center gap-1 text-[9px] text-primary-action font-black mt-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>4.9</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-primary-action block drop-shadow">NPR 1,200</span>
                    <span className="text-[7px] text-text-primary/60 block leading-none">/ person</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of smaller experience cards */}
            <div className="px-4 grid grid-cols-2 gap-3.5">
              {[
                { title: 'Coffee & Conversations', loc: 'Lalitpur', price: 800, img: 'https://images.unsplash.com/photo-1544717305-2782549b5136' },
                { title: 'Food Tour', loc: 'Thamel', price: 1200, img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9' },
                { title: 'Photography Walk', loc: 'Phewa Lake', price: 900, img: 'https://images.unsplash.com/photo-1510425463958-dcced28da480' },
                { title: 'Cultural Walk', loc: 'Bhaktapur', price: 700, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e' },
              ].map((exp, i) => (
                <div key={i} className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col text-left cursor-pointer hover:border-primary-action/30 transition-all">
                  <div className="relative h-20">
                    <img src={exp.img} className="w-full h-full object-cover" alt={exp.title} />
                  </div>
                  <div className="p-2.5 space-y-1">
                    <h5 className="text-[10px] font-black text-text-primary truncate leading-tight">{exp.title}</h5>
                    <p className="text-[8px] text-text-secondary truncate">{exp.loc}</p>
                    <p className="text-[9px] font-bold text-primary-action">NPR {exp.price}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Community Moments vertical action block */}
            <div className="p-4 space-y-3.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">Community Moments</h3>
                <span className="text-[10px] font-black text-primary-action cursor-pointer" onClick={() => showToast('Moments feed fully synchronized', 'success')}>See all</span>
              </div>
              
              <div className="space-y-4">
                <div className="relative aspect-[4/4.5] rounded-3xl overflow-hidden border border-white/5 shadow-lg bg-surface">
                  <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=400" className="absolute inset-0 w-full h-full object-cover brightness-75" alt="hike" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div onClick={() => showToast('Playing moments audio...', 'success')} className="w-11 h-11 rounded-full bg-primary-action/90 text-background flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  
                  <div className="absolute right-4 bottom-14 flex flex-col items-center gap-3.5 z-20">
                    <div className="flex flex-col items-center cursor-pointer" onClick={(e) => { e.stopPropagation(); showToast('Liked Moment!', 'success'); }}>
                      <Heart className="w-5 h-5 text-text-primary fill-current hover:text-red-500" />
                      <span className="text-[9px] text-text-primary font-bold mt-1">234</span>
                    </div>
                    <div className="flex flex-col items-center cursor-pointer" onClick={(e) => { e.stopPropagation(); showToast('Opening comments...', 'info'); }}>
                      <span className="text-base">💬</span>
                      <span className="text-[9px] text-text-primary font-bold mt-0.5">28</span>
                    </div>
                    <div className="flex flex-col items-center cursor-pointer" onClick={(e) => { e.stopPropagation(); showToast('Link copied!', 'success'); }}>
                      <span className="text-base">➡️</span>
                      <span className="text-[9px] text-text-primary font-bold mt-0.5">12</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-16 text-left space-y-1.5 z-20">
                    <div className="flex items-center gap-2">
                      <img src="https://ui-avatars.com/api/?name=Raj&background=random" className="w-5 h-5 rounded-full border border-primary-action object-cover" alt="Raj" />
                      <span className="text-[10px] font-black text-text-primary">Raj <span className="font-light text-text-primary/85">2h ago • Pokhara</span></span>
                    </div>
                    <p className="text-[10px] text-text-primary/90 font-light leading-snug">Perfect morning for a hike #Sarangkot #Hiking</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Impact Section */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">Your Impact</h3>
                <span className="text-[8px] text-text-secondary">This month</span>
              </div>
              
              <div className="relative rounded-3xl overflow-hidden p-5 bg-surface border border-white/5">
                <img src="https://images.unsplash.com/photo-1510425463958-dcced28da480?q=80&w=400" className="absolute inset-0 w-full h-full object-cover opacity-20 brightness-50" alt="Impact background" />
                <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <span className="text-lg font-black text-text-primary block">12</span>
                    <span className="text-[8px] text-text-secondary block uppercase tracking-wider mt-0.5">Connections</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <span className="text-lg font-black text-primary-action block">5</span>
                    <span className="text-[8px] text-text-secondary block uppercase tracking-wider mt-0.5">Adventures</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <span className="text-lg font-black text-text-primary block">3</span>
                    <span className="text-[8px] text-text-secondary block uppercase tracking-wider mt-0.5">Friends</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Events card */}
            <div className="p-4 pb-8 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">Upcoming Events</h3>
                <span className="text-xs font-bold text-primary-action cursor-pointer" onClick={() => showToast('Events listed!', 'success')}>See all</span>
              </div>
              
              <div className="bg-surface border border-white/5 p-4 rounded-3xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="shrink-0 w-11 h-11 rounded-2xl bg-surface-elevated flex flex-col items-center justify-center border border-white/10">
                    <span className="text-primary-action text-[8px] font-black leading-none uppercase">MAY</span>
                    <span className="text-text-primary font-black text-xs leading-none mt-1">24</span>
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-black text-text-primary truncate">Weekend Hiking Adventure</h5>
                    <p className="text-[8px] text-text-secondary">Shivapuri National Park • 6:00 AM</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="flex -space-x-1.5">
                        {['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100'].map((avatar, id) => (
                          <img key={id} src={avatar} className="w-3.5 h-3.5 rounded-full border border-black object-cover" alt="attendee" />
                        ))}
                      </div>
                      <span className="text-[7px] text-text-secondary">+12 attending</span>
                    </div>
                  </div>
                </div>
                 <button 
                   onClick={() => {
                     if (!currentUser) { setAuthMode('login'); return; }
                     showToast('Explore events tab to join real events', 'info');
                   }}
                   className="px-3.5 py-1.5 bg-primary-action text-background text-[9px] font-black rounded-xl uppercase tracking-wider"
                 >
                   Join
                 </button>
              </div>
            </div>

          </div>
        )}

        {/* Render Mobile Tab Profile */}
        {mobileTab === 'profile' && (
          <div className="p-4 space-y-6 pb-20 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            {!currentUser ? (
              // ==================== GUEST USER ACCOUNT VIEW ====================
              <div className="space-y-6">
                {/* Guest Header Card */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-action/5 rounded-full blur-2xl" />
                  <div className="w-16 h-16 rounded-full border-2 border-primary-action/40 bg-surface-elevated flex items-center justify-center text-primary-action">
                    <UserCircle className="w-10 h-10" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-primary-action flex items-center gap-1.5">Guest User</h3>
                    <p className="text-[10px] text-text-secondary leading-relaxed mt-1">Sign in to unlock messaging, bookings, favorites, and companion features.</p>
                  </div>
                </div>

                {/* Main Action Button */}
                <button 
                  onClick={() => setAuthMode('login')}
                  className="w-full py-3.5 bg-primary-action hover:bg-primary-action-hover text-background font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-primary-action/10"
                >
                  Sign In / Register
                </button>

                {/* Dashboard Options (Disabled / Locked for Guest) */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-text-secondary text-left px-1">My Dashboard</h4>
                  
                  <div className="bg-surface border border-white/5 rounded-2xl divide-y divide-white/5">
                    {/* Personal Dashboard (Disabled) */}
                    <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs font-bold text-text-primary">Personal Dashboard</span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-text-secondary" />
                    </div>

                    {/* Partner Dashboard (Disabled) */}
                    <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs font-bold text-text-primary">Partner Dashboard</span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-text-secondary" />
                    </div>

                    {/* My Wallet (Disabled) */}
                    <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs font-bold text-text-primary">My Wallet (NPR)</span>
                      </div>
                      <span className="text-[10px] font-bold text-text-secondary">NPR 0.00</span>
                    </div>
                  </div>
                </div>

                {/* Active Join SATHI Guide Link for Guest */}
                <div className="bg-gradient-to-r from-[#C8A25E]/10 to-[#C8A25E]/5 border border-primary-action/20 rounded-2xl p-5 text-left space-y-3">
                  <div className="flex items-center gap-2 text-primary-action">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold">Earn in Nepal</span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary">Join SATHI as a Companion Guide</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed">Turn your local knowledge, storytelling, or hiking skills into high-paying earnings in NPR.</p>
                  <button 
                    onClick={() => setAuthMode('guide')}
                    className="mt-1 px-4 py-2 bg-primary-action text-background font-black text-[10px] rounded-lg hover:bg-primary-action-hover uppercase tracking-wider transition-all"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ) : (
              // ==================== LOGGED-IN USER PROFILE VIEW ====================
              <div className="space-y-6">
                {/* Logged-In User Header */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-action/5 rounded-full blur-2xl" />
                  <SafeImage 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    fallbackType="avatar"
                    textForInitials={currentUser.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary-action" 
                  />
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-1">
                      {currentUser.name}
                      <ShieldCheck className="w-4 h-4 text-primary-action" />
                    </h3>
                    <p className="text-[10px] text-text-secondary mt-0.5">{currentUser.email}</p>
                    <div className="flex gap-2 items-center mt-2.5">
                      <span className="inline-block px-2 py-0.5 bg-primary-action/10 border border-primary-action/30 text-primary-action text-[8px] font-extrabold rounded uppercase tracking-wider">
                        {currentUser.role === 'companion' ? 'SATHI Partner' : 'Premium Member'}
                      </span>
                      <button 
                        onClick={() => setShowProfileEditModal(true)}
                        className="text-[9px] font-black text-text-primary hover:text-primary-action border border-white/10 px-2.5 py-1 rounded transition-all bg-white/5 cursor-pointer"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>

                {/* SATHI Wallet Section */}
                <div className="bg-surface border border-white/5 rounded-2xl p-5 text-left">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary-action" />
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-text-secondary">SATHI Wallet</span>
                    </div>
                    <span className="text-xs font-bold text-text-primary">NPR Balance</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-black text-text-primary">NPR 4,500.00</span>
                      <p className="text-[9px] text-text-secondary mt-0.5">Nepal Local Market Rate currency</p>
                    </div>
                    <button 
                      onClick={() => setShowWalletModal(true)}
                      className="px-4 py-2 bg-primary-action text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider hover:bg-primary-action-hover transition-colors"
                    >
                      Deposit Fund
                    </button>
                  </div>
                </div>

                {/* My Companion Bookings Panel */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-text-secondary px-1">My Bookings</h4>
                  {bookings.filter(b => b.userId === currentUser.id).length > 0 ? (
                    <div className="space-y-3">
                      {bookings.filter(b => b.userId === currentUser.id).map((booking, idx) => {
                        const companion = companions.find(c => c.id === booking.companionId);
                        return (
                          <div key={`${booking.id || 'b'}-${idx}`} className="bg-surface border border-white/5 rounded-2xl p-4 space-y-3.5">
                            <div className="flex items-center gap-3">
                              {companion && (
                                <SafeImage src={companion.imageUrl} className="w-9 h-9 rounded-full object-cover border border-border-token" alt={companion.name} fallbackType="avatar" textForInitials={companion.name} />
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-xs text-text-primary truncate">Trip with {companion?.name || 'Companion'}</h5>
                                <p className="text-[9px] text-text-secondary mt-0.5">{booking.date} at {booking.time}</p>
                              </div>
                              <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${booking.status === 'confirmed' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
                                {booking.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] pt-2.5 border-t border-white/5">
                              <span className="font-black text-primary-action">NPR {booking.totalPrice}</span>
                              <span className="text-text-secondary">{booking.duration} hours • {booking.participants} persons</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-surface border border-white/5 p-5 rounded-2xl text-center space-y-2.5">
                      <p className="text-[10px] text-text-secondary">No scheduled companion bookings yet.</p>
                      <button onClick={() => setMobileTab('explore')} className="py-2 px-4 bg-primary-action text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                        Discover Companions
                      </button>
                    </div>
                  )}
                </div>

                {/* Saved Favorites Section */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-text-secondary px-1">Saved Companions</h4>
                  {fetchedCompanions.filter(c => favorites.includes(c.id)).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {fetchedCompanions.filter(c => favorites.includes(c.id)).map((comp, idx) => (
                        <CompanionCard
                          key={`${comp.id}-${idx}`}
                          companion={comp}
                          isFav={favorites.includes(comp.id)}
                          onToggleFavorite={toggleFavorite}
                          onViewCompanion={handleViewCompanion}
                          onShowToast={showToast}
                          layout="compact"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface border border-white/5 p-4 rounded-2xl text-center">
                      <p className="text-[10px] text-text-secondary">No saved SATHI guides yet.</p>
                    </div>
                  )}
                </div>

                {/* SATHI Partner Companion Section if Role matches */}
                {currentUser.role === 'companion' && (
                  <div className="bg-gradient-to-r from-[#C8A25E]/10 to-[#C8A25E]/5 border border-primary-action/20 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-center gap-2 text-primary-action">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider font-extrabold">Guide Console</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      <div className="bg-surface-elevated rounded-xl p-3 border border-white/5">
                        <span className="text-[9px] text-text-secondary uppercase tracking-wider">Earnings</span>
                        <p className="text-sm font-bold text-text-primary mt-1">NPR 1,250</p>
                      </div>
                      <div className="bg-surface-elevated rounded-xl p-3 border border-white/5">
                        <span className="text-[9px] text-text-secondary uppercase tracking-wider">Requests</span>
                        <p className="text-sm font-bold text-primary-action mt-1">3 Pending</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Responsive Settings block */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-text-secondary px-1">Settings & Preferences</h4>
                  <div className="bg-surface border border-white/5 rounded-2xl divide-y divide-white/5">
                    {/* Theme Switcher Toggle */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Sun className="w-4 h-4 text-primary-action" />
                        <span className="text-xs font-bold text-text-primary">Light Theme Mode</span>
                      </div>
                      <button 
                        onClick={() => {
                          const isCurrentlyLight = document.documentElement.classList.toggle('theme-light');
                          saveStoredPreferences({ theme: isCurrentlyLight ? 'light' : 'dark' });
                          showToast(isCurrentlyLight ? 'SATHI Premium Light Theme Active' : 'SATHI Cosmic Dark Theme Active', 'success');
                        }}
                        className="w-10 h-6 rounded-full bg-surface-elevated border border-white/10 p-0.5 flex items-center relative cursor-pointer"
                        aria-label="Toggle Light Theme Mode"
                      >
                        <div className="w-4 h-4 rounded-full bg-primary-action transition-all duration-300 absolute" style={{
                          left: typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light') ? '20px' : '2px'
                        }} />
                      </button>
                    </div>

                    {/* Notification settings toggle */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-primary-action" />
                        <span className="text-xs font-bold text-text-primary">Push Alerts</span>
                      </div>
                      <button 
                        onClick={() => showToast('Push notifications enabled!', 'success')}
                        className="px-2 py-1 bg-surface-elevated border border-white/10 text-[9px] uppercase tracking-wider font-extrabold rounded-md text-text-primary hover:border-primary-action"
                      >
                        Enabled
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={async () => {
                    await logout();
                    setMobileTab('home');
                    showToast("Logged out successfully from SATHI", "success");
                  }}
                  className="w-full py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/25 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Logout Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Render Mobile Tab Bookings */}
        {mobileTab === 'bookings' && (
          <div className="p-4 space-y-4 pb-20 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            <h2 className="text-xl font-extrabold text-text-primary text-left flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-action" /> My Bookings
            </h2>
            {bookings.filter(b => b.userId === currentUser?.id).length > 0 ? (
              <div className="space-y-3">
                {bookings.filter(b => b.userId === currentUser?.id).map((booking, idx) => {
                  const companion = fetchedCompanions.find(c => c.id === booking.companionId);
                  const isCancellable = booking.status === 'pending' || booking.status === 'confirmed';
                  return (
                    <div key={`${booking.id || 'b'}-${idx}`} className="bg-surface border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        {companion && (
                          <SafeImage src={companion.imageUrl} className="w-9 h-9 rounded-full object-cover border border-border-token" alt={companion.name} fallbackType="avatar" textForInitials={companion.name} />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-text-primary truncate">Trip with {companion?.name || 'Companion'}</h5>
                          <p className="text-[9px] text-text-secondary mt-0.5">{booking.date} at {booking.time}</p>
                        </div>
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${booking.status === 'confirmed' ? 'bg-green-500/10 border-green-500/30 text-green-500' : booking.status === 'cancelled' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
                          {booking.status}
                        </span>
                      </div>
                      {booking.meetingPoint && (
                        <p className="text-[10px] text-text-secondary">Meeting Point: {booking.meetingPoint}</p>
                      )}
                      <div className="flex justify-between items-center text-[10px] pt-2.5 border-t border-white/5">
                        <span className="font-black text-primary-action">NPR {booking.totalPrice}</span>
                        <span className="text-text-secondary">{booking.duration} hours • {booking.participants} persons</span>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        {isCancellable && (
                          <button onClick={() => { updateBookingStatus(booking.id, 'cancelled'); showToast('Booking cancelled', 'info'); }} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">Cancel</button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button onClick={() => { updateBookingStatus(booking.id, 'completed'); showToast('Booking marked as completed', 'success'); }} className="text-[10px] text-green-400 hover:text-green-300 transition-colors">Mark Complete</button>
                        )}
                        <button 
                          onClick={() => {
                            setActiveChatCompanionId(booking.companionId);
                            setActiveTab('messages');
                            setMobileTab('messages');
                          }} 
                          className="text-[10px] text-primary-action hover:text-primary-action-hover font-semibold transition-colors ml-2"
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-surface border border-white/5 p-5 rounded-2xl text-center space-y-2.5">
                <p className="text-[10px] text-text-secondary">No scheduled companion bookings yet.</p>
                <button onClick={() => setMobileTab('explore')} className="py-2 px-4 bg-primary-action text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                  Discover Companions
                </button>
              </div>
            )}
          </div>
        )}

        {/* Render Mobile Tab Messages */}
        {mobileTab === 'messages' && (
          <div className="fixed inset-x-0 top-0 bottom-16 bg-background z-40 flex flex-col overflow-hidden">
            <MessagesTab 
              onOpenAuth={setAuthMode} 
              initialCompanionId={activeChatCompanionId} 
              onBrowseCompanions={handleBrowseCompanions}
              onBrowseActivities={handleBrowseActivities}
            />
          </div>
        )}

        {/* Render Mobile Tab Search */}
        {mobileTab === 'search' && (
          <div className="p-4 space-y-6 pb-20 select-none">
            <h2 className="text-xl font-extrabold text-text-primary text-left">Universal Discovery</h2>
            
            {/* Compact Search Header with Filters button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-primary-action absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search companions, activities, and events..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-9 bg-surface-elevated/60 backdrop-blur-md rounded-xl border border-white/10 text-xs text-text-primary focus:outline-none focus:border-primary-action transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary hover:text-text-primary"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="h-11 px-3.5 bg-surface-elevated border border-border-token hover:border-primary-action rounded-xl flex items-center gap-1.5 text-xs font-bold text-text-primary transition-all shrink-0 relative"
              >
                <SlidersHorizontal className="w-4 h-4 text-primary-action" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary-action text-background text-[9px] font-extrabold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Unified Entity Category Selector Tabs */}
            <div className="flex gap-1 bg-surface p-1 rounded-xl border border-white/5">
              {[
                { id: 'all', label: 'All' },
                { id: 'companions', label: `Buddies (${filteredCompanions.length})` },
                { id: 'activities', label: `Activities (${filteredActivities.length})` },
                { id: 'events', label: `Events (${filteredEvents.length})` }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setDiscoveryTab(sub.id as any)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${discoveryTab === sub.id ? 'bg-primary-action text-background' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Combined Results Container */}
            <div className="space-y-6 pt-2 select-none">
              
              {/* 1. Companions Block */}
              {(discoveryTab === 'all' || discoveryTab === 'companions') && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      🤝 Local Companions ({filteredCompanions.length})
                    </span>
                    {favorites.length > 0 && (
                      <button 
                        onClick={() => { setShowSavedOnly(!showSavedOnly); }} 
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${showSavedOnly ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-transparent border-white/10 text-text-secondary'}`}
                      >
                        ❤️ Saved Only
                      </button>
                    )}
                  </div>

                  {filteredCompanions.length === 0 ? (
                    <div className="py-8 text-center text-text-secondary text-xs bg-surface rounded-2xl border border-white/5">
                      No matching buddies found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredCompanions.map((comp, idx) => (
                        <CompanionCard
                          key={`${comp.id}-${idx}`}
                          companion={comp}
                          isFav={favorites.includes(comp.id)}
                          onToggleFavorite={toggleFavorite}
                          onViewCompanion={handleViewCompanion}
                          onShowToast={showToast}
                          layout="compact"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Activities Block */}
              {(discoveryTab === 'all' || discoveryTab === 'activities') && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      🥾 Curated Experiences ({filteredActivities.length})
                    </span>
                  </div>

                  {filteredActivities.length === 0 ? (
                    <div className="py-8 text-center text-text-secondary text-xs bg-surface rounded-2xl border border-white/5">
                      No matching activities found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredActivities.map((act, actIdx) => (
                        <div 
                          key={`${act.id || 'act'}-${actIdx}`}
                          onClick={() => { setSelectedCategory(act.category || 'All'); showToast(`Filtered by ${act.title}`, 'success'); }}
                          className="bg-surface border border-white/5 rounded-2xl overflow-hidden flex items-center p-2 gap-3 cursor-pointer hover:border-primary-action/30 active:scale-98 transition-all text-left"
                        >
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-elevated shrink-0">
                            <SafeImage src={act.imageUrl || act.image} alt={act.title} className="w-full h-full object-cover" fallbackType="thumbnail" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[8px] bg-primary-action/10 text-primary-action px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                              {act.category || 'Activity'}
                            </span>
                            <h4 className="text-xs font-bold text-text-primary truncate mt-1 leading-snug">
                              {act.title}
                            </h4>
                            <p className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-1 truncate">
                              <Clock className="w-3 h-3 text-primary-action" /> {act.duration || 'Flexible'} • {act.location || 'Nepal'}
                            </p>
                          </div>
                          <div className="text-right shrink-0 pr-1">
                            <span className="text-[9px] font-bold text-primary-action block font-mono">
                              NPR {act.avgPrice || act.price}
                            </span>
                            <span className="text-[8px] text-text-secondary block font-light">average</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Events Block */}
              {(discoveryTab === 'all' || discoveryTab === 'events') && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      📅 Upcoming Events ({filteredEvents.length})
                    </span>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <div className="py-8 text-center text-text-secondary text-xs bg-surface rounded-2xl border border-white/5">
                      No matching events found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredEvents.map((evt, evtIdx) => (
                        <div 
                          key={`${evt.id || 'evt'}-${evtIdx}`}
                          onClick={() => showToast(`Event: ${evt.title} • spots left: ${evt.spots}`, 'info')}
                          className="bg-surface border border-white/5 rounded-2xl overflow-hidden flex flex-col p-3 gap-3 cursor-pointer hover:border-primary-action/30 active:scale-98 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-elevated shrink-0">
                              <SafeImage src={evt.imageUrl} alt={evt.title} className="w-full h-full object-cover" fallbackType="thumbnail" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <span className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                  {evt.spots ? `${evt.spots} Spots Left` : 'Public Event'}
                                </span>
                                <span className="text-[9px] font-mono text-text-secondary">{evt.date}</span>
                              </div>
                              <h4 className="text-xs font-bold text-text-primary truncate mt-1 leading-snug">
                                {evt.title}
                              </h4>
                              <p className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-1 truncate font-light">
                                <MapPin className="w-3 h-3 text-primary-action" /> {evt.location}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Render Mobile Tab Notifications */}
        {mobileTab === 'notifications' && (
          <div className="p-4 space-y-6 pb-20 select-none">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-text-primary">Notifications</h2>
              {unreadNotifCount > 0 && (
                <button 
                  onClick={() => {
                    notifications?.forEach(n => markNotificationRead(n.id));
                    showToast("All notifications marked as read", "success");
                  }}
                  className="text-xs font-bold text-primary-action hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="space-y-3 text-left">
              {notifications && notifications.length > 0 ? (
                notifications.map((n, idx) => (
                  <div 
                    key={`${n.id || 'notif'}-${idx}`} 
                    onClick={() => { markNotificationRead(n.id); }} 
                    className={`p-4 rounded-2xl border transition-colors cursor-pointer text-left ${!n.isRead ? 'bg-primary-action/5 border-primary-action/20' : 'bg-surface border-white/5'}`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className={`text-xs ${!n.isRead ? 'font-black text-text-primary' : 'font-semibold text-gray-300'}`}>{n.title}</h4>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary-action" />}
                    </div>
                    <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">{n.message}</p>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5">
                      <span className="text-[8px] text-text-muted">{new Date(n.timestamp).toLocaleDateString()} at {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="text-[9px] text-primary-action font-bold">Mark Read</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-text-secondary space-y-3 bg-surface rounded-3xl border border-white/5">
                  <Bell className="w-10 h-10 mx-auto text-primary-action/30 animate-bounce" />
                  <div>
                    <p className="text-xs font-bold text-text-primary">All caught up!</p>
                    <p className="text-[10px] text-text-secondary mt-1">We will alert you here about bookings, messages, and social updates.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </>
        )}

        {/* Fixed Bottom Tab Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-white/10 flex justify-between items-center px-6 z-50">
          {[
            { tab: 'home', path: '/', icon: <Home className="w-5 h-5" />, label: 'Home' },
            { tab: 'search', path: null, icon: <Search className="w-5 h-5" />, label: 'Discover' },
            { tab: 'explore', path: null, icon: <Compass className="w-5 h-5" />, label: 'Explore' },
            { tab: 'messages', path: '/messages', icon: <MessageSquare className="w-5 h-5" />, label: 'Messages' },
            { tab: 'notifications', path: null, icon: (
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-action text-background text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </div>
            ), label: 'Alerts' },
          ].map((item) => {
            const isActive = mobileTab === item.tab && activeTab !== 'dashboard' && activeTab !== 'partner' && activeTab !== 'settings' && activeTab !== 'about';
            return (
              <button 
                key={item.tab}
                onClick={() => { 
                  if (item.tab === 'messages') {
                    setActiveTab('messages');
                  } else if (item.tab === 'bookings') {
                    setActiveTab('bookings');
                  } else {
                    setActiveTab('explore');
                  }
                  if (item.path) {
                    navigate(item.path);
                  }
                  if (mobileTab === item.tab) {
                    // Double tap or active tab tap: smooth scroll to top part
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    setMobileTab(item.tab as any);
                  }
                }}
                className={`flex flex-col items-center justify-center transition-all ${isActive ? 'text-primary-action' : 'text-text-secondary'}`}
              >
                {item.icon}
                {item.label && <span className="text-[8px] font-black uppercase mt-1 tracking-wider">{item.label}</span>}
              </button>
            );
          })}
        </div>

      </div>

      {/* ==================== ACTIVE MODALS & DIALOG OVERLAYS ==================== */}

      {/* Story View Modal */}
      {viewingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setViewingStory(null)}>
          <div className="relative w-full max-w-sm aspect-[9/16] bg-surface rounded-3xl overflow-hidden border border-border-token/80" onClick={e => e.stopPropagation()}>
            <SafeImage src={viewingStory.imageUrl} className="w-full h-full object-cover" alt="SATHI Story" fallbackType="thumbnail" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85"></div>
            
            {/* Top Bar inside Story */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 text-left">
                <SafeImage src={viewingStory.userAvatar} className="w-9 h-9 rounded-full border border-primary-action object-cover" alt={viewingStory.userName} fallbackType="avatar" textForInitials={viewingStory.userName} />
                <div>
                  <span className="text-text-primary font-bold text-xs block leading-tight">{viewingStory.userName}</span>
                  <span className="text-text-secondary text-[9px]">with {viewingStory.companionName || 'SATHI'} • {viewingStory.timeAgo || 'Recently'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {currentUser && currentUser.id === viewingStory.userId && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await socialRepository.deleteStory(viewingStory.id);
                        showToast('Story deleted', 'success');
                        setViewingStory(null);
                      } catch (err) {
                        showToast('Failed to delete story', 'error');
                      }
                    }} 
                    className="text-text-primary/80 hover:text-red-500 bg-black/40 rounded-full w-7 h-7 flex items-center justify-center backdrop-blur-sm"
                    title="Delete Story"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setViewingStory(null)} className="text-text-primary bg-black/40 rounded-full w-7 h-7 flex items-center justify-center backdrop-blur-sm hover:bg-black/60">✕</button>
              </div>
            </div>

            {/* Nav click zones */}
            <div className="absolute inset-y-20 left-0 w-1/3 cursor-pointer" onClick={(e) => { e.stopPropagation(); const idx = fetchedStories.findIndex(s => s.id === viewingStory.id); if (idx > 0) setViewingStory(fetchedStories[idx - 1]); }}></div>
            <div className="absolute inset-y-20 right-0 w-1/3 cursor-pointer" onClick={(e) => { e.stopPropagation(); const idx = fetchedStories.findIndex(s => s.id === viewingStory.id); if (idx < fetchedStories.length - 1) setViewingStory(fetchedStories[idx + 1]); else setViewingStory(null); }}></div>

            {/* Bottom story details */}
            <div className="absolute bottom-6 inset-x-0 p-5 flex flex-col justify-end text-left space-y-3 z-10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-text-primary text-sm font-semibold drop-shadow flex-1">{viewingStory.caption}</p>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!currentUser) {
                      showToast('Please sign in to like stories', 'info');
                      openAuthModal();
                      return;
                    }
                    const isLiked = storyLiked[viewingStory.id];
                    setStoryLiked(prev => ({ ...prev, [viewingStory.id]: !isLiked }));
                    setStoryLikesCount(prev => ({
                      ...prev,
                      [viewingStory.id]: Math.max(0, (prev[viewingStory.id] || 0) + (isLiked ? -1 : 1))
                    }));
                    try {
                      if (isLiked) {
                        await socialRepository.unlikeStory(currentUser.id, viewingStory.id);
                      } else {
                        await socialRepository.likeStory(currentUser.id, viewingStory.id);
                      }
                    } catch (err) {
                      setStoryLiked(prev => ({ ...prev, [viewingStory.id]: isLiked }));
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-text-primary border border-white/20 hover:scale-105 transition-transform"
                >
                  <Heart className={`w-4 h-4 ${storyLiked[viewingStory.id] ? 'fill-red-500 text-red-500' : 'text-text-primary'}`} />
                  {(storyLikesCount[viewingStory.id] || 0) > 0 && (
                    <span className="text-xs font-bold">{storyLikesCount[viewingStory.id]}</span>
                  )}
                </button>
              </div>
              
              <div className="flex gap-1">
                {stories.map((s, idx) => {
                  const sIdx = stories.findIndex(x => x.id === s.id);
                  const activeIdx = stories.findIndex(x => x.id === viewingStory.id);
                  return (
                    <div key={`${s.id}-${idx}`} className="h-1 rounded-full flex-1 bg-white/20 overflow-hidden relative">
                      {s.id === viewingStory.id && (
                        <motion.div 
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 5, ease: 'linear' }}
                          className="absolute inset-y-0 left-0 bg-primary-action"
                          onAnimationComplete={() => {
                            if (activeIdx < stories.length - 1) {
                              setViewingStory(stories[activeIdx + 1]);
                            } else {
                              setViewingStory(null);
                            }
                          }}
                        />
                      )}
                      {sIdx < activeIdx && (
                        <div className="absolute inset-0 bg-primary-action" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Active Balance Overlay Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWalletModal(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface border border-border-token/70 rounded-3xl p-6 shadow-2xl z-50 text-left space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border-token/40 pb-3">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2"><Wallet className="w-5 h-5 text-primary-action" /> SATHI Wallet Balance</h3>
                <button onClick={() => setShowWalletModal(false)} className="text-text-secondary hover:text-text-primary rounded-full p-1.5 hover:bg-surface-elevated">✕</button>
              </div>

              {/* NPR wallet metrics */}
              <div className="bg-surface-elevated/50 border border-border-token/40 rounded-2xl p-5 text-center space-y-2 relative overflow-hidden">
                <span className="text-[10px] uppercase text-text-secondary tracking-wider block font-medium">Available Escrow Balance</span>
                <span className="text-3xl font-black text-primary-action block">NPR 12,500.00</span>
                <span className="text-[9px] text-text-secondary block font-light">Escrow protection active for all current bookings</span>
              </div>

              <div className="space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Recent Escrow Ledger</h4>
                
                <div className="space-y-2 max-h-36 overflow-y-auto divide-y divide-border-token-light">
                  <div className="py-2.5 flex justify-between text-xs">
                    <div>
                      <span className="text-text-primary font-bold block">Top-up via Khalti</span>
                      <span className="text-[10px] text-text-secondary">Jul 14, 2026</span>
                    </div>
                    <span className="text-green-500 font-bold">+NPR 5,000.00</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs">
                    <div>
                      <span className="text-text-primary font-bold block">Booking paid (Aarav Thapa)</span>
                      <span className="text-[10px] text-text-secondary">Jul 10, 2026</span>
                    </div>
                    <span className="text-red-400 font-bold">-NPR 1,500.00</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs">
                    <div>
                      <span className="text-text-primary font-bold block">Booking paid (Priya Gurung)</span>
                      <span className="text-[10px] text-text-secondary">Jul 06, 2026</span>
                    </div>
                    <span className="text-red-400 font-bold">-NPR 1,800.00</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3.5 pt-3">
                <button 
                  onClick={handleWalletTopUp}
                  className="py-2.5 bg-primary-action hover:bg-primary-action-hover text-background rounded-xl text-xs font-bold transition-all text-center"
                >
                  Top Up with Khalti
                </button>
                <button 
                  onClick={() => { showToast("eSewa gateway is ready", "success"); }}
                  className="py-2.5 bg-surface-elevated hover:bg-border-token text-text-primary border border-border-token/60 rounded-xl text-xs font-semibold transition-all text-center"
                >
                  Top Up with eSewa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal overlay registration portal */}
      {authMode && (
        <AuthModal 
          initialMode={authMode} 
          onClose={() => setAuthMode(null)} 
          onSuccess={(mode) => {
            if (mode === 'guide') {
              setIsGuide(true);
              setShowGuideSetup(true);
            }
          }}
        />
      )}

      {/* Safety SOS Panel widget */}
      <AnimatePresence>
        {showSOS && (
          <SafetyWidget isVisible={showSOS} onClose={() => setShowSOS(false)} />
        )}
      </AnimatePresence>

      {/* Profile Edit Modal */}
      {showProfileEditModal && (
        <ProfileEditModal 
          isOpen={showProfileEditModal}
          onClose={() => setShowProfileEditModal(false)}
        />
      )}

      {/* Document Modal */}
      {activeDocType && (
        <DocumentModal 
          documentType={activeDocType}
          onClose={() => setActiveDocType(null)}
        />
      )}
      
      {/* Companion Profile Multi-Step booking details panel */}
      {selectedCompanion && (
        <CompanionProfileModal 
          companion={selectedCompanion} 
          onClose={() => setSelectedCompanion(null)} 
          onOpenAuth={setAuthMode}
          onMessage={() => {
            if (selectedCompanion) {
              setActiveChatCompanionId(selectedCompanion.id);
            }
            setSelectedCompanion(null);
            setActiveTab('messages');
            setMobileTab('messages');
          }}
          onComplete={() => {
            setSelectedCompanion(null);
            navigate('/bookings');
          }}
        />
      )}

      {/* ==================== FILTER DRAWER / BOTTOM SHEET ==================== */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90vh] md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[420px] md:max-h-full bg-surface border-t md:border-t-0 md:border-l border-border-token rounded-t-3xl md:rounded-t-none md:rounded-l-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-border-token/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary-action/10 border border-primary-action/20 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4 text-primary-action" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">Filter & Refine</h3>
                    <p className="text-[10px] text-text-secondary">Tailor local companion matches</p>
                  </div>
                  {activeFilterCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary-action text-background">
                      {activeFilterCount} active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-2 text-text-secondary hover:text-text-primary rounded-full bg-surface-elevated hover:bg-border-token transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body - Scrollable */}
              <div className="p-5 space-y-6 overflow-y-auto flex-1 divide-y divide-border-token-light text-left">
                
                {/* 1. City Filter */}
                <div className="space-y-3 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-action block">Location / City</label>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Kathmandu', 'Pokhara', 'Patan', 'Bhaktapur', 'Chitwan', 'Nagarkot'].map(city => (
                      <button
                        key={city}
                        onClick={() => setSelectedCity(city)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedCity === city ? 'bg-primary-action text-background border-primary-action font-bold' : 'bg-surface-elevated text-text-secondary border-border-token hover:border-white/20'}`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Spoken Language */}
                <div className="space-y-3 pt-5">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-action block">Spoken Language</label>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'English', 'Nepali', 'Hindi', 'Japanese', 'French'].map(lang => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${selectedLanguage === lang ? 'bg-primary-action text-background border-primary-action font-bold' : 'bg-surface-elevated text-text-secondary border-border-token hover:border-white/20'}`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Max Hourly Rate */}
                <div className="space-y-3 pt-5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-primary-action">Max Hourly Rate</label>
                    <span className="text-xs font-extrabold text-text-primary">NPR {maxHourlyRate.toLocaleString()}/hr</span>
                  </div>
                  <input
                    type="range"
                    min={800}
                    max={3000}
                    step={100}
                    value={maxHourlyRate}
                    onChange={(e) => setMaxHourlyRate(Number(e.target.value))}
                    className="w-full accent-primary-action cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>NPR 800/hr</span>
                    <span>NPR 3,000/hr</span>
                  </div>
                </div>

                {/* 5. Minimum Rating */}
                <div className="space-y-3 pt-5">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-action block">Minimum Rating</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'All', value: 0 },
                      { label: '★ 4.0+', value: 4.0 },
                      { label: '★ 4.5+', value: 4.5 },
                      { label: '★ 4.8+', value: 4.8 }
                    ].map(r => (
                      <button
                        key={r.label}
                        onClick={() => setMinRatingFilter(r.value)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${minRatingFilter === r.value ? 'bg-primary-action text-background border-primary-action font-bold' : 'bg-surface-elevated text-text-secondary border-border-token hover:border-white/20'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Sort By */}
                <div className="space-y-3 pt-5">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary-action block">Sort Matches By</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Recommended', value: 'recommended' },
                      { label: 'Top Rated', value: 'rating' },
                      { label: 'Price: Low to High', value: 'priceAsc' },
                      { label: 'Price: High to Low', value: 'priceDesc' }
                    ].map(s => (
                      <button
                        key={s.value}
                        onClick={() => setSortBy(s.value as any)}
                        className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${sortBy === s.value ? 'bg-primary-action/10 border-primary-action text-primary-action font-bold' : 'bg-surface-elevated text-text-secondary border-border-token hover:border-white/20'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-surface-elevated border-t border-border-token flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setSelectedCity('All');
                    setSelectedCategory('All');
                    setSelectedLanguage('All');
                    setMaxHourlyRate(3000);
                    setMinRatingFilter(0);
                    setSortBy('recommended');
                    showToast('Filters reset', 'info');
                  }}
                  className="flex-1 py-3 bg-transparent border border-border-token hover:border-white/20 text-text-primary rounded-xl text-xs font-bold transition-all"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-1 py-3 bg-primary-action hover:bg-primary-action-hover text-background rounded-xl text-xs font-extrabold transition-all shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile sliding bottom drawer (Account Hub) */}
      <AnimatePresence>
        {showProfileDropdown && (
          <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end animate-fade-in" onClick={() => setShowProfileDropdown(false)}>
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[85vh] bg-background border-t border-border-token/80 rounded-t-[2.5rem] flex flex-col overflow-hidden text-left shadow-2xl"
            >
              {/* Drag indicator/handle */}
              <div className="w-full flex justify-center py-3">
                <div className="w-12 h-1 bg-white/20 rounded-full cursor-pointer" onClick={() => setShowProfileDropdown(false)} />
              </div>

              {/* Title / User profile card */}
              <div className="px-6 py-4 border-b border-border-token/50 flex items-center gap-4">
                <SafeImage 
                  src={currentUser?.avatar} 
                  alt={currentUser?.name || "Guest User"} 
                  fallbackType="avatar"
                  textForInitials={currentUser?.name || "Guest User"}
                  className="w-12 h-12 rounded-full object-cover border border-primary-action"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-black text-text-primary block truncate">{currentUser?.name || "Guest User"}</span>
                  <span className="text-[10px] text-text-secondary block truncate leading-relaxed">{currentUser?.email || "Explore Nepali companions"}</span>
                </div>
                <button 
                  onClick={() => setShowProfileDropdown(false)} 
                  className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable List of 16 options */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 px-6 select-none hide-scrollbar">
                
                {/* Group 1: Personal Space */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-secondary block px-1">Personal Space</span>
                  <button onClick={() => { setActiveTab('dashboard'); setMobileTab('home'); navigate('/dashboard'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <UserCircle className="w-4.5 h-4.5 text-primary-action" /> My Profile / Dashboard
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { setActiveTab('bookings'); setMobileTab('home'); navigate('/bookings'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Calendar className="w-4.5 h-4.5 text-primary-action" /> My Bookings
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { setMobileTab('messages'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <MessageSquare className="w-4.5 h-4.5 text-primary-action" /> Messages
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { setShowSavedOnly(true); setMobileTab('search'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Heart className="w-4.5 h-4.5 text-red-500 fill-current" /> Favorites
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  {(currentUser?.role === 'companion' || currentUser?.role === 'admin') && (
                    <button onClick={() => { setActiveTab('partner'); setMobileTab('home'); navigate('/partner'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                      <span className="flex items-center gap-3 font-semibold">
                        <Briefcase className="w-4.5 h-4.5 text-primary-action" /> Companion Dashboard
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </button>
                  )}
                </div>

                {/* Group 2: Settings & Customization */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-secondary block px-1">Preferences</span>
                  <button onClick={() => { setShowWalletModal(true); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Wallet className="w-4.5 h-4.5 text-primary-action" /> Wallet (NPR)
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { setActiveTab('settings'); setMobileTab('home'); navigate('/settings'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Settings className="w-4.5 h-4.5 text-primary-action" /> Settings
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { setActiveTab('settings'); navigate('/settings'); setIsMobileSidebarOpen(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Languages className="w-4.5 h-4.5 text-primary-action" /> Language (EN/NE)
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => {
                    const isCurrentlyLight = document.documentElement.classList.toggle('theme-light');
                    showToast(isCurrentlyLight ? 'SATHI Premium Light Theme Active' : 'SATHI Cosmic Dark Theme Active', 'success');
                    setShowProfileDropdown(false);
                  }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Sun className="w-4.5 h-4.5 text-primary-action" /> Appearance (Theme)
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { showToast("Privacy protection active. SATHI uses end-to-end escrow security.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <ShieldCheck className="w-4.5 h-4.5 text-primary-action" /> Privacy & Security
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                </div>

                {/* Group 3: Help & Policies */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-text-secondary block px-1">Support & Legal</span>
                  <button onClick={() => { setActiveDocType('terms'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <BookOpen className="w-4.5 h-4.5 text-text-secondary" /> Terms of Service
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { setActiveDocType('privacy'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Lock className="w-4.5 h-4.5 text-text-secondary" /> Privacy Policy
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { setActiveDocType('help'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <HelpCircle className="w-4.5 h-4.5 text-text-secondary" /> Help & Support
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => { showToast("Emergency Contact: +977-9801234567. Location: Thamel, Kathmandu.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3 font-semibold">
                      <Smile className="w-4.5 h-4.5 text-text-secondary" /> Contact Us
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>
                </div>

                {/* Action Bar */}
                <div className="pt-4 border-t border-border-token/40 flex gap-3">
                  {currentUser ? (
                    <button 
                      onClick={async () => { await logout(); navigate('/'); setShowProfileDropdown(false); showToast("Logged out successfully", "success"); }}
                      className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-black flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Log Out
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setAuthMode('login'); setShowProfileDropdown(false); }}
                      className="flex-1 py-3 bg-primary-action text-background rounded-xl text-xs font-black flex items-center justify-center gap-2"
                    >
                      <UserCircle className="w-4 h-4" /> Sign In / Register
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showCreateStoryModal && (
        <CreateStoryModal onClose={() => setShowCreateStoryModal(false)} />
      )}

    </div>
  );
});
