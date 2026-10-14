/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { CompanionProfileModal } from './components/modals/CompanionProfileModal';
import { AuthModal } from './components/AuthModal';
import { MessagesTab } from './components/messages/MessagesTab';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { PartnerDashboard } from './components/dashboard/PartnerDashboard';
import { SettingsTab } from './components/settings/SettingsTab';
import { SafetyWidget } from './components/SafetyWidget';
import { CommunityFeed } from './components/social/CommunityFeed';
import { StoryLikeSurface } from './components/social/StoryLikeSurface';
import { DiscoveryWelcome } from './components/discovery/DiscoveryWelcome';
import { ExplorePage, type ExploreCategory } from './components/discovery/ExplorePage';
import { PeopleDirectory, type PeopleView } from './components/discovery/PeopleDirectory';
import { HomePage } from './components/home/HomePage';
import { DiscoveryPageControl } from './components/discovery/DiscoveryPageControl';
import { filterCompanions, homeSourceError, searchText, searchStrings } from './services/discoverySearch';
import { CompanionCard } from './components/companions/CompanionCard';
import { CustomerBookingActions } from './components/bookings/CustomerBookingActions';
import { CategoryHeader } from './components/discovery/CategoryHeader';
import { PageContainer, SectionHeader } from './components/layout';
import { ProfileEditModal } from './components/modals/ProfileEditModal';
import { ProfilePhotoUpload } from './components/modals/ProfilePhotoUpload';
import { DocumentModal } from './components/modals/DocumentModal';
import { Companion, ExperienceStory, Activity, Event as SathiEvent } from './types';
import { socialRepository } from './repositories/SocialRepository';
import { visibleStory } from './services/mediaContract';
import { groupStories } from './services/storyGroups';
import { CreateEventModal } from './components/modals/CreateEventModal';
import { notificationTarget } from './services/notificationTarget';
import { ownerStoriesQuery } from './services/mediaQueries';
import { getDocsFromServer, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db as mediaDb } from './firebase';
import { CreateStoryModal } from './components/modals/CreateStoryModal';
import { Modal } from './components/ui/Modal';
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
import { useFeedReaction } from './hooks/useFeedReaction';
import { useAuthModalTrigger } from './hooks/useAuthModalTrigger';
import { SafeImage } from './components/ui/SafeImage';
import { AnimatePresence } from 'motion/react';
import { saveStoredPreferences } from './services/preferences';
import { eventParticipantsService } from './services/eventParticipants';
import { eventCapacity } from './services/eventParticipationCore';
import { firestore } from './services/firestore';
import { CoinWalletPanel } from './components/wallet/CoinWalletPanel';

interface ClientAppProps {
  initialTab?: 'home' | 'explore' | 'events' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner' | 'settings';
}

const formatStoryTimeAgo = (value?: string | Timestamp | null, now = Date.now()): string => {
  if (!value) return 'Now';
  const date = value instanceof Timestamp ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Now';
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return 'Now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${Math.floor(hours / 24)}d`;
};

export const ClientApp = React.memo(({ initialTab }: ClientAppProps = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookings, currentUser, updateBookingStatus, favorites, toggleFavorite, notifications, markNotificationRead, markAllNotificationsRead, logout, openAuthModal } = useAppContext();
  const { showToast } = useToast();
  const handleToggleFavorite = useCallback((id: string): Promise<void> => {
    if (!currentUser || currentUser.role === 'guest') {
      openAuthModal();
      return Promise.resolve();
    }
    return toggleFavorite(id);
  }, [currentUser?.id, currentUser?.role, openAuthModal, toggleFavorite]);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [peopleMode, setPeopleMode] = useState<PeopleView>('types');
  const [peopleCategoryStep, setPeopleCategoryStep] = useState(0);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Sync state with URL path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/bookings') {
      setActiveTab('bookings');
      setMobileTab('bookings');
    } else if (path === '/companions') {
      setActiveTab('explore');
      setMobileTab('search');
      setDiscoveryTab('companions');
    } else if (path === '/events') {
      setActiveTab('events');
      setMobileTab('events');
    } else if (path === '/explore') {
      setActiveTab('explore');
      setMobileTab('explore');
      setDiscoveryTab(location.hash === '#activities-section' ? 'activities' : location.hash === '#events' ? 'events' : location.hash === '#places' ? 'places' : 'all');
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
  }, [location.pathname, location.hash]);

  const homePreview = location.pathname === '/';
  const { companions: fetchedCompanions, loading: companionsLoading, hasMore: companionsHasMore, loadingMore: companionsLoadingMore, loadMore: loadMoreCompanions, error: companionsError, retry: retryCompanions } = useCompanions(60);
  const { stories: fetchedStories, prependStory, removeStory, error: storiesError, retry: retryStories } = useStories();
  const { activities, loading: activitiesLoading, hasMore: activitiesHasMore, loadingMore: activitiesLoadingMore, loadMore: loadMoreActivities, error: activitiesError, retry: retryActivities } = useActivities(homePreview ? 4 : 10);
  const { events, loading: eventsLoading, hasMore: eventsHasMore, loadingMore: eventsLoadingMore, loadMore: loadMoreEvents, error: eventsError, retry: retryEvents } = useEvents(homePreview ? 4 : 10);
  const { partners, loading: partnersLoading, hasMore: partnersHasMore, loadingMore: partnersLoadingMore, loadMore: loadMorePartners, error: partnersError, retry: retryPartners } = usePartners(homePreview ? 4 : 10);
  const { posts, error: postsError, retry: retryCommunityPosts } = useCommunityPosts(homePreview ? 2 : 10);

  const homeFeedError = homeSourceError({ companions: companionsError, Stories: storiesError, activities: activitiesError, events: eventsError, 'Community posts': postsError });
  const retryHome = async () => {
    await Promise.all([
      companionsError && retryCompanions(), storiesError && retryStories(),
      activitiesError && retryActivities(), eventsError && retryEvents(), postsError && retryCommunityPosts(),
    ]);
  };


  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'events' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner' | 'settings'>(initialTab || 'home');
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingStory, setViewingStory] = useState<ExperienceStory | null>(null);
  const storyGroups = useMemo(() => groupStories(fetchedStories), [fetchedStories]);
  const [ownerStories, setOwnerStories] = useState<ExperienceStory[]>([]);
  const ownerPage = useRef<{ uid?: string; cursor?: QueryDocumentSnapshot; more: boolean }>({ more: false });
  const storyRequest = useRef(0);
  const openVisibleStory = useCallback(async (story: ExperienceStory | null) => {
    const request = ++storyRequest.current;
    if (!story) {
      setViewingStory(null);
      ownerPage.current = { more: false }; setOwnerStories([]);
      return;
    }
    try {
      const current = await socialRepository.getVisibleStory(story.id);
      if (request === storyRequest.current) {
        if (current) {
          if (current.userId && ownerPage.current.uid !== current.userId && mediaDb) {
            const page = await getDocsFromServer(ownerStoriesQuery(mediaDb, current.userId, Date.now()));
            if (request !== storyRequest.current) return;
            const items = page.docs.map(document => ({ ...document.data(), id: document.id } as ExperienceStory)).filter(item => visibleStory(item));
            ownerPage.current = { uid: current.userId, cursor: page.docs.at(-1), more: page.size === 20 };
            setOwnerStories(items); setViewingStory(items[0] ?? null);
          } else setViewingStory(current);
        }
        else showToast('This Story is no longer available.','info');
      }
    } catch { if (request === storyRequest.current) showToast('Story unavailable. Refresh or try again online.','error'); }
  },[showToast]);
  useEffect(() => {
    if (!viewingStory) return;
    if (!visibleStory(viewingStory)) { void openVisibleStory(null); return; }
    const expiry = typeof viewingStory.expiresAt === 'string' ? Date.parse(viewingStory.expiresAt) : viewingStory.expiresAt?.toMillis() ?? 0;
    const timer = window.setTimeout(() => { void openVisibleStory(null); }, Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  },[viewingStory,openVisibleStory]);
  const nextOwnerStory = async () => {
    if (!viewingStory) return;
    const index = ownerStories.findIndex(item => item.id === viewingStory.id);
    if (index < ownerStories.length - 1) { await openVisibleStory(ownerStories[index + 1]); return; }
    const pageState = ownerPage.current;
    if (!pageState.more || !pageState.uid || !mediaDb) { await openVisibleStory(null); return; }
    const request = ++storyRequest.current;
    try {
      const page = await getDocsFromServer(ownerStoriesQuery(mediaDb, pageState.uid, Date.now(), pageState.cursor));
      if (request !== storyRequest.current) return;
      const items = page.docs.map(document => ({ ...document.data(), id: document.id } as ExperienceStory)).filter(item => visibleStory(item));
      ownerPage.current = { uid: pageState.uid, cursor: page.docs.at(-1), more: page.size === 20 };
      setOwnerStories(items); setViewingStory(items[0] ?? null);
    } catch { showToast('Could not load the next Stories. Tap next to retry.', 'error'); }
  };
  const [joinedEvents, setJoinedEvents] = useState<Record<string, boolean>>({});
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showDeleteStoryConfirm, setShowDeleteStoryConfirm] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const storyReaction = useFeedReaction('story', viewingStory?.id ?? '', viewingStory?.likesCount ?? viewingStory?.likes ?? 0);
  const [storyNow, setStoryNow] = useState(Date.now());
  useEffect(() => {
    if (!viewingStory) return;
    setStoryNow(Date.now());
    const id = window.setInterval(() => setStoryNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [viewingStory]);

  useEffect(() => {
    if (!currentUser) {
      setJoinedEvents({});
      return;
    }
    let cancelled = false;
    firestore.getDocuments<{ eventId: string }>('event_participants', {
      where: [
        { field: 'userId', operator: '==', value: currentUser.id },
        { field: 'status', operator: '==', value: 'joined' },
      ],
      limitCount: 50,
    })
      .then(registrations => {
        if (cancelled) return;
        const joined: Record<string, boolean> = {};
        for (const reg of registrations) {
          if (reg?.eventId) joined[reg.eventId] = true;
        }
        setJoinedEvents(joined);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser]);

  const handleJoinEvent = async (eventId: string) => {
    if (!currentUser) {
      setAuthMode('login');
      return;
    }
    try {
      await eventParticipantsService.joinEvent(eventId);
      setJoinedEvents(prev => ({ ...prev, [eventId]: true }));
      void retryEvents();
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
      void retryEvents();
      showToast('Left event', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to leave event', 'error');
    }
  };

  const eventSpotsLabel = (event: any) => {
    const capacity = eventCapacity(event);
    return capacity.valid ? `${capacity.count} / ${event.spots} joined · ${capacity.remaining} spots left` : 'Capacity awaiting verification';
  };

  const getEventButtonState = (event: any) => {
    const capacity = eventCapacity(event);
    const isJoined = joinedEvents[event.id];
    if (isJoined) return { text: 'Joined', disabled: false, action: 'leave' };
    if (!capacity.valid) return { text: 'Registration unavailable', disabled: true, action: 'none' };
    if (capacity.remaining === 0) return { text: 'Event Full', disabled: true, action: 'none' };
    return { text: 'Join', disabled: false, action: 'join' };
  };

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'guide' | null>(null);
  useAuthModalTrigger(setAuthMode);
  const [isGuide, setIsGuide] = useState(false);
  const [showGuideSetup, setShowGuideSetup] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'priceAsc' | 'priceDesc' | 'rating'>('recommended');
  const [showSOS, setShowSOS] = useState(false);

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
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'search' | 'explore' | 'events' | 'experiences' | 'bookings' | 'messages' | 'profile' | 'notifications'>('home');

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
    // Desktop route/hash navigation must not be overwritten by mobile tab restoration.
    if (window.matchMedia('(min-width: 1024px)').matches) {
      previousMobileTabRef.current = nextTab;
      isRestoringScrollRef.current = false;
      return;
    }
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
  const [discoveryTab, setDiscoveryTab] = useState<ExploreCategory | 'companions'>('all');
  useEffect(() => {
    if (activeTab !== 'explore' || location.pathname !== '/explore' || location.hash !== '#activities-section') return;
    const frame = requestAnimationFrame(() => document.getElementById('activities-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [activeTab, location.pathname, location.hash, location.key]);
  const openCompanionSearch = () => {
    setActiveTab('explore');
    setMobileTab('search');
    setDiscoveryTab('companions');
    navigate('/companions');
  };
  const [activeChatCompanionId, setActiveChatCompanionId] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<'terms' | 'privacy' | 'help' | null>(null);

  // Earnings Calculator States
  const [calcHourlyRate, setCalcHourlyRate] = useState<number>(1200); // NPR per hour
  const [calcWeeklyHours, setCalcWeeklyHours] = useState<number>(15); // Hours per week



  const handleBrowseCompanions = () => navigate('/companions');
  const handleBrowseActivities = () => navigate('/explore#activities-section');
  const exploreSection = (section?: string) => {
    setShowSavedOnly(false);
    setSearchQuery('');
    setSelectedCategory('All');
    if (section === 'companions') navigate('/companions');
    else if (section === 'events') navigate('/events');
    else navigate(section === 'activities' ? '/explore#activities-section' : section === 'community' ? '/explore#community' : section === 'places' ? '/explore#places' : '/explore');
  };

  const companions = fetchedCompanions;
  const stories = fetchedStories;
  const unreadNotifCount = notifications ? notifications.filter(n => !n.isRead).length : 0;

  const handleViewCompanion = (companion: Companion) => {
    setSelectedCompanion(companion);
  };


  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    showToast(`Filtering experiences in ${city}`, 'info');
  };

  const activeFilterCount = (selectedCity !== 'All' ? 1 : 0) +
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedLanguage !== 'All' ? 1 : 0) +
    (maxHourlyRate < 3000 ? 1 : 0) +
    (minRatingFilter > 0 ? 1 : 0) +
    (sortBy !== 'recommended' ? 1 : 0);

  const filteredCompanions = filterCompanions(companions, {
    query: searchQuery, category: selectedCategory, city: selectedCity,
    language: selectedLanguage, maxRate: maxHourlyRate === 3000 ? Infinity : maxHourlyRate, minRating: minRatingFilter,
    savedOnly: showSavedOnly, favorites: favorites || [], sort: sortBy,
  }).filter(c => {
    if (peopleMode === 'free_friend') return c.hourlyRate === 0;
    if (peopleMode === 'guide') return c.verificationBadge === 'Verified Guide';
    if (peopleMode === 'local_host') return c.verificationBadge === 'Local Host';
    return true;
  });

  const availableInterests = useMemo(() => [...new Set(fetchedCompanions.flatMap(companion => searchStrings(companion.interests)))].sort(), [fetchedCompanions]);

  const filteredActivities = (activities || []).filter(act => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      searchText(act.title).includes(q) ||
      searchText(act.description).includes(q) ||
      searchText(act.location).includes(q);

    const matchesCity =
      selectedCity === 'All' ||
      searchText(act.location).includes(selectedCity.toLowerCase());

    return matchesSearch && matchesCity;
  });

  const filteredEvents = (events || []).filter(evt => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      searchText(evt.title).includes(q) ||
      searchText(evt.description).includes(q) ||
      searchText(evt.location).includes(q);

    const matchesCity =
      selectedCity === 'All' ||
      searchText(evt.location).includes(selectedCity.toLowerCase());

    return matchesSearch && matchesCity;
  });

  // Dynamic calculations for guide earnings
  const estWeeklyEarnings = calcHourlyRate * calcWeeklyHours;
  const estMonthlyEarnings = Math.round(estWeeklyEarnings * 4.33);

  const renderEventListing = () => (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="desktop-event-list space-y-6">
                 <div className="flex items-center justify-between">
                   <h2 className="text-xl md:text-2xl font-extrabold text-text-primary">Upcoming Group Events</h2>
                   <button onClick={() => setShowCreateEventModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-action text-background font-bold text-xs rounded-xl hover:bg-primary-action-hover">
                     <span className="text-sm leading-none">+</span> Create Event
                   </button>
                 </div>

                 <div className="space-y-3.5">
                   {eventsLoading ? (
                     <div className="space-y-2 animate-pulse">
                       <div className="h-16 bg-surface rounded-xl"></div>
                       <div className="h-16 bg-surface rounded-xl"></div>
                     </div>
                   ) : events.length === 0 ? (
                     <div className="text-center py-16 bg-surface border border-border-token/50 rounded-3xl space-y-4">
                       <p className="text-sm font-bold text-text-secondary">No events yet</p>
                       <p className="text-xs text-text-secondary">Be the first to create one!</p>
                     </div>
                   ) : (
                     events.map((event, idx) => {
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
                             <h5 className="font-bold text-text-primary text-xs truncate group-hover:text-primary-action transition-colors"><button onClick={() => navigate(`/event/${event.id}`)}>{event.title}</button></h5>
                             <p className="text-[10px] text-text-secondary flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-primary-action" /> {event.location}</p>
                             <p className="text-[10px] text-text-secondary flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</p>

                             <div className="flex items-center justify-between pt-2">
                               <span className="text-[9px] text-text-secondary">{eventSpotsLabel(event)}</span>
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

                 <DiscoveryPageControl source="events" loaded={events.length} matches={filteredEvents.length}
                   loading={eventsLoading} loadingMore={eventsLoadingMore} hasMore={eventsHasMore}
                   error={eventsError} onLoadMore={loadMoreEvents} onRetry={retryEvents} />
               </motion.div>
  );

  const renderPeople = () => <PeopleDirectory companions={filteredCompanions} mode={peopleMode} onMode={setPeopleMode}
    categoryStep={peopleCategoryStep} onCategoryStep={setPeopleCategoryStep}
    search={searchQuery} onSearch={setSearchQuery} category={selectedCategory}
    categories={availableInterests} onCategory={setSelectedCategory}
    onFilters={() => setIsFilterDrawerOpen(true)} activeFilters={activeFilterCount}
    savedOnly={showSavedOnly} onSavedOnly={setShowSavedOnly} favorites={favorites}
    onToggleFavorite={handleToggleFavorite} onShowToast={showToast}
    onViewCompanion={handleViewCompanion} loading={companionsLoading}
    onReset={() => {
      setSearchQuery(''); setSelectedCategory('All'); setSelectedCity('All'); setSelectedLanguage('All');
      setMaxHourlyRate(3000); setMinRatingFilter(0); setSortBy('recommended'); setShowSavedOnly(false);
    }}
    pagination={<DiscoveryPageControl source="companions" loaded={companions.length} matches={filteredCompanions.length}
      loading={companionsLoading} loadingMore={companionsLoadingMore} hasMore={companionsHasMore}
      error={companionsError} onLoadMore={loadMoreCompanions} onRetry={retryCompanions} />} />;

  const renderHomeFeed = () => (<HomePage
    user={currentUser}
    companions={fetchedCompanions}
    activities={activities}
    events={events}
    partners={partners}
    stories={stories}
    posts={posts}
    bookings={bookings}
    favorites={favorites}
    peopleLoading={companionsLoading}
    error={homeFeedError}
    onRetry={() => { void retryHome(); }}
    onToggleFavorite={handleToggleFavorite} onShowToast={showToast}
    onViewCompanion={handleViewCompanion}
    onViewStory={story => { void openVisibleStory(story); }}
    onCreateStory={() => setShowCreateStoryModal(true)}
    onExplore={exploreSection}
    onOpenEvent={id => navigate(`/event/${id}`)}
    onOpenPost={id => navigate(`/post/${id}`)}
    onOpenBookings={() => navigate('/bookings')}
  />);

  const renderExplore = () => {
    const markers = [
      ...filteredCompanions.map(item => ({ item, type: 'companion' as const })),
      ...filteredActivities.map(item => ({ item, type: 'activity' as const })),
      ...filteredEvents.map(item => ({ item, type: 'event' as const })),
    ].flatMap(({ item, type }) => {
      const coordinates = item.coordinates as { latitude?: number; longitude?: number; lat?: number; lng?: number } | undefined;
      const lat = coordinates?.latitude ?? coordinates?.lat;
      const lng = coordinates?.longitude ?? coordinates?.lng;
      return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
        ? [{ id: `${type}:${item.id}`, position: { lat, lng }, title: 'name' in item ? item.name : item.title, type }]
        : [];
    });
    return <div className="space-y-6">
      {location.hash === '#community' ? <section id="community" className="space-y-4">
        <div className="flex items-center justify-between gap-4"><h1 className="text-xl font-bold">From the community</h1><button className="discovery-secondary" onClick={() => navigate('/explore')}>Back to exploring</button></div>
        <CommunityFeed />
      </section> : <ExplorePage
        category={discoveryTab === 'companions' ? 'all' : discoveryTab} onCategory={setDiscoveryTab}
        search={searchQuery} onSearch={setSearchQuery} city={selectedCity} onCity={handleCitySelect}
        activities={filteredActivities} allActivities={activities} events={filteredEvents} allEvents={events} partners={partners}
        activityPage={{ loading: activitiesLoading, loadingMore: activitiesLoadingMore, hasMore: activitiesHasMore, error: activitiesError, onLoadMore: loadMoreActivities, onRetry: retryActivities }}
        eventPage={{ loading: eventsLoading, loadingMore: eventsLoadingMore, hasMore: eventsHasMore, error: eventsError, onLoadMore: loadMoreEvents, onRetry: retryEvents }}
        partnerPage={{ loading: partnersLoading, loadingMore: partnersLoadingMore, hasMore: partnersHasMore, error: partnersError, onLoadMore: loadMorePartners, onRetry: retryPartners }}
        markers={markers} onMarkerClick={key => {
          const separator = key.indexOf(':');
          const type = key.slice(0, separator), id = key.slice(separator + 1);
          if (type === 'companion') { const companion = companions.find(item => item.id === id); if (companion) handleViewCompanion(companion); }
          else if (type === 'event') navigate(`/event/${id}`);
          else { setSearchQuery(activities.find(item => item.id === id)?.title ?? ''); setDiscoveryTab('activities'); }
        }}
        onAllActivities={() => { setDiscoveryTab('activities'); navigate('/explore#activities-section'); }}
        onAllEvents={() => navigate('/events')} onOpenEvent={id => navigate(`/event/${id}`)}
        onCommunity={() => navigate('/explore#community')}
      />}
      <div className="flex flex-wrap gap-2"><button className="discovery-secondary" onClick={() => setActiveDocType('help')}>Help & support</button><button className="discovery-secondary" onClick={() => setActiveDocType('privacy')}>Privacy</button><button className="discovery-secondary" onClick={() => setActiveDocType('terms')}>Terms</button></div>
    </div>;
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text-primary flex flex-col lg:flex-row relative overflow-x-hidden selection:bg-primary-action/30 selection:text-primary-action">

      {/* ==================== LEFT SIDEBAR (DESKTOP) ==================== */}
      <aside className="sathi-navigation hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bottom-0 bg-background border-r border-border-token/40 p-5 select-none z-40 shrink-0 justify-between overflow-y-auto hide-scrollbar">
        <div className="space-y-5">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-surface-elevated/30 transition-all"
            onClick={() => {
              navigate('/');
              setSelectedCategory('All');
              setSelectedCity('All');
              setShowSavedOnly(false);
            }}
          >
            <img src="/sathi-logo.jpeg" alt="SATHI" className="w-9 h-9 rounded-full object-cover ring-1 ring-primary-action/30 shadow-md shadow-primary-action/20" />
            <div>
              <span className="text-xl font-bold tracking-tight text-text-primary block">SATHI<span className="text-primary-action">.</span></span>
              <span className="text-[9px] uppercase tracking-wider text-text-secondary block font-light -mt-1">Trusted Experiences</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Sidebar navigation">
            <button
              onClick={() => { setActiveTab('home'); setMobileTab('home'); navigate('/'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/' && !showSavedOnly ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Home className="w-4 h-4" /> For you
            </button>
            <button
              onClick={() => { navigate('/explore'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/explore' ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Compass className="w-4 h-4" /> Explore
            </button>
            <button
              onClick={() => { navigate('/companions'); setPeopleMode('types'); setSelectedCategory('All'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/companions' && !showSavedOnly ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <span className="flex items-center gap-3"><Users className="w-4 h-4" /> People</span>

            </button>
            <button
              onClick={() => { navigate('/explore#activities-section'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <BookOpen className="w-4 h-4" /> Activities
            </button>
            <button
              onClick={() => { navigate('/events'); setIsMobileSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <Calendar className="w-4 h-4" /> Events
            </button>
            <button
              onClick={() => { navigate('/messages'); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/messages' ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <span className="flex items-center gap-3"><MessageSquare className="w-4 h-4" /> Messages</span>

            </button>
            <button
              onClick={() => { navigate('/bookings'); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/bookings' ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Calendar className="w-4 h-4" /> Bookings
            </button>
            <button
              onClick={() => { navigate('/companions'); setPeopleMode('all'); setShowSavedOnly(true); setIsMobileSidebarOpen(false); showToast("Viewing Saved Companions", "success"); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none ${location.pathname === '/companions' && showSavedOnly ? 'bg-primary-action/10 text-primary-action border-l-4 border-primary-action' : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40'}`}
            >
              <Heart className="w-4 h-4" /> Saved
            </button>

            <button
              onClick={() => setShowWalletModal(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-text-secondary hover:text-text-primary hover:bg-surface-elevated/40 focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background focus:outline-none"
            >
              <Wallet className="w-4 h-4" /> Wallet
            </button>
            <button
              onClick={() => navigate('/explore#community')}
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

        <div className="mt-auto pt-6 border-t border-border-token">
          <p className="text-sm font-semibold">A little help goes a long way.</p>
          <button className="discovery-secondary mt-3 w-full" onClick={() => setActiveDocType('help')}><HelpCircle size={16} /> Help & support</button>
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
                  <button onClick={() => { navigate('/explore'); setActiveTab('explore'); setDiscoveryTab('companions'); setSelectedCategory('All'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/explore' && !showSavedOnly ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Users className="w-4 h-4" /> People
                  </button>
                  <button onClick={() => { navigate('/messages'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/messages' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <MessageSquare className="w-4 h-4" /> Messages
                  </button>
                  <button onClick={() => { navigate('/bookings'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/bookings' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
                    <Calendar className="w-4 h-4" /> Bookings
                  </button>
                  <button onClick={() => { navigate('/explore'); setShowSavedOnly(true); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${location.pathname === '/explore' && showSavedOnly ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary'}`}>
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
                <p className="text-xs text-text-secondary">Referral rewards are coming soon.</p>
                <button disabled className="w-full py-2 bg-surface text-text-muted rounded-xl text-xs font-bold cursor-not-allowed">Coming Soon</button>
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
          <div className={`${activeTab === 'explore' ? 'hidden' : 'hidden sm:flex'} items-center gap-2 flex-1 max-w-xl`}>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-secondary absolute left-4 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search companions, skills, or locations..."
                className="w-full bg-surface-elevated/50 border border-border-token/40 rounded-full h-10 pl-11 pr-16 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-action focus:bg-surface transition-all shadow-inner focus-visible:ring-2 focus-visible:ring-primary-action focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') openCompanionSearch(); }}
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
            {activeTab !== 'home' && <button
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
            </button>}
          </div>

          {/* Right section: location selector, notifications, user profile badge */}
          <div className="flex items-center gap-3 md:gap-5">

            {/* Custom Location Selector Dropdown */}
            {activeTab !== 'home' && location.pathname !== '/explore' && <div className="relative">
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
            </div>}

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
                        <span className="text-[10px] text-primary-action cursor-pointer hover:underline" onClick={() => { markAllNotificationsRead(); showToast("All notifications marked as read", "success"); }}>Mark all read</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-border-token-light">
                        {notifications && notifications.length > 0 ? (
                          notifications.slice(0, 5).map(n => (
                            <div key={n.id} onClick={() => { markNotificationRead(n.id); setShowNotificationsDropdown(false); const target = notificationTarget(n); if (target) navigate(target); }} className={`p-3 text-left hover:bg-surface-elevated transition-colors cursor-pointer ${!n.isRead ? 'bg-primary-action/5' : ''}`}>
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
                        <button onClick={() => { setShowSavedOnly(true); setActiveTab('explore'); navigate('/explore'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                          <Heart className="w-4 h-4 text-red-500 fill-current" /> Favorites
                        </button>
                        {(currentUser?.role === 'companion' || currentUser?.role === 'admin') && (
                          <button onClick={() => { setActiveTab('partner'); navigate('/partner'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
                            <Briefcase className="w-4 h-4 text-primary-action" /> Companion Dashboard
                          </button>
                        )}
                        {currentUser?.role === 'admin' && (
                          <button onClick={() => { navigate('/admin/applications'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
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
                        <button onClick={() => { showToast("Privacy controls are limited; SATHI does not provide escrow or end-to-end encrypted messaging.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
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
                        <button onClick={() => { showToast("SATHI has no verified emergency helpline. Contact local emergency services directly for urgent help.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2.5 transition-colors">
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
        <div className="desktop-content-layout grid grid-cols-12 w-full flex-1" data-people={location.pathname === '/companions'} data-home={location.pathname === '/'} data-explore={location.pathname === '/explore'}>

          {/* ==================== CENTRAL FEED / ACTIVE TAB CONTAINER ==================== */}
          <main className="desktop-main-content col-span-12 xl:col-span-9 p-4 md:p-8 space-y-12 min-w-0">

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
            {activeTab === 'home' && isDesktop && <><DiscoveryWelcome key={currentUser?.id ?? 'guest'} availableInterests={availableInterests} onExplore={exploreSection} />{renderHomeFeed()}</>}

            {location.pathname === '/companions' && isDesktop && renderPeople()}
            {activeTab === 'explore' && location.pathname !== '/companions' && isDesktop && renderExplore()}

            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <DashboardTab onMessageCompanion={(companionId) => {
                  setActiveChatCompanionId(companionId);
                  setActiveTab('messages');
                  setMobileTab('messages');
                }} />
              </motion.div>
            )}

             {activeTab === 'events' && renderEventListing()}

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
                              <CustomerBookingActions booking={booking} onCancel={id => updateBookingStatus(id, 'cancelled')} onShowToast={showToast} />
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
                    SATHI is Nepal's elite social marketplace connecting travelers with local companions for non-dating cultural exchange, outdoor hiking, and Lake Pokhara adventure.
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
                  <button onClick={() => navigate('/explore')} className="text-[10px] text-primary-action font-bold hover:underline">View All</button>
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
                              <span className="text-[9px] text-text-secondary">{eventSpotsLabel(event)}</span>
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
                      { title: "Application Review", desc: "Approval records an application review, not a background check." },
                      { title: "Payment Status", desc: "Online payments and escrow are unavailable. Requests are unpaid." },
                      { title: "Safety Alerts", desc: "Single-location records only; no monitored emergency response." },
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

              </div>
            </div>

          </main>

          {/* ==================== RIGHT SIDEBAR (DASHBOARD WIDGETS) ==================== */}
          {location.pathname !== '/companions' && location.pathname !== '/' && location.pathname !== '/explore' && <aside className="desktop-utility-rail hidden xl:block col-span-3 p-6 border-l border-border-token/40 space-y-6 bg-background h-max sticky top-[72px]">

            {/* 1. UPCOMING EVENTS (MEETUP INSPIRED) */}
            <div id="events-section" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Upcoming Group Events</h4>
                <button onClick={() => navigate('/explore')} className="text-[10px] text-primary-action font-bold hover:underline">View All</button>
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
                             <span className="text-[9px] text-text-secondary">{eventSpotsLabel(event)}</span>
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

            <div className="rounded-2xl border border-border-token bg-surface p-5">
              <Heart size={20} className="text-primary-action mb-3" />
              <h3 className="text-base font-semibold">Keep your favourites close.</h3>
              <p className="text-sm text-text-secondary leading-relaxed mt-2">Save people you'd like to connect with and find them here later.</p>
              <button className="discovery-secondary mt-4 w-full" onClick={() => { setPeopleMode('all'); setShowSavedOnly(true); navigate('/companions'); }}>View saved people</button>
            </div>
            <details className="discovery-extra">
              <summary>Before you make a plan</summary>
              <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
                <p>Application approval is not a background check.</p>
                <p>Online payments and escrow are unavailable. Requests are unpaid.</p>
                <p>Safety alerts are single-location records, not a monitored emergency response.</p>
                <button className="discovery-secondary" onClick={() => setActiveDocType('help')}>Read safety guidance</button>
              </div>
            </details>
          </aside>}

        </div>

      </div>

      {/* ==================== MOBILE VIEWPORT (lg:hidden) ==================== */}
      <div className="lg:hidden flex flex-col flex-1 min-h-screen relative bg-background pb-24 text-left">

        {/* Render Mobile Active Tab Overrides */}
        {activeTab === 'events' ? <div className="p-4 pb-20">{renderEventListing()}</div> : activeTab === 'dashboard' ? (
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
                SATHI is Nepal's elite social marketplace connecting travelers with local companions for non-dating cultural exchange, outdoor hiking, and Lake Pokhara adventure.
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
                {/* Mobile Home Header: SATHI logo + search + filters + profile */}
                <div className="flex items-center justify-between gap-3 p-4 bg-background border-b border-white/5 h-[62px]">
                  <img
                    src="/sathi-logo.jpeg"
                    alt="SATHI"
                    className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-primary-action/30 shadow-md shadow-primary-action/20"
                  />

                  <div className="flex-1 relative flex items-center min-w-0">
                    <Search className="w-4 h-4 text-primary-action absolute left-3" />
                    <input
                      type="text"
                      placeholder="Search companions or locations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') openCompanionSearch(); }}
                      className="w-full h-10 pl-9 pr-10 bg-surface-elevated/60 backdrop-blur-md rounded-full border border-white/10 text-xs text-text-primary focus:outline-none focus:border-primary-action transition-all"
                    />
                  </div>

                  <button type="button" onClick={() => setShowProfileDropdown(true)} aria-label="Open profile menu" className="shrink-0 rounded-full">
                    <SafeImage
                      src={currentUser?.avatar}
                      className="w-9 h-9 rounded-full object-cover border-2 border-primary-action"
                      alt="Profile"
                      fallbackType="avatar"
                      textForInitials={currentUser?.name || 'Guest User'}
                    />
                  </button>
                </div>

            <div className="px-4"><DiscoveryWelcome key={currentUser?.id ?? 'guest'} availableInterests={availableInterests} onExplore={exploreSection} /></div>
            {!isDesktop && <div className="px-4">{renderHomeFeed()}</div>}

          </div>
        )}

        {/* Render Mobile Tab Explore */}
        {mobileTab === 'explore' && !isDesktop && <div className="px-4 pb-24">{renderExplore()}</div>}

        {/* Render Mobile Tab Experiences */}
        {mobileTab === 'experiences' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-background border-b border-white/5">
              <span className="text-sm font-black text-text-primary uppercase tracking-wider">Experiences</span>
              <button onClick={() => showToast('Opening experiences catalog', 'info')} className="text-xs font-bold text-primary-action hover:underline">See all</button>
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
                <span className="text-[10px] font-black text-primary-action cursor-pointer hover:underline" onClick={() => showToast('Opening moments feed', 'info')}>See all</span>
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
                <span className="text-xs font-bold text-primary-action cursor-pointer" onClick={() => showToast('Showing all upcoming events', 'info')}>See all</span>
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
                  <button type="button" aria-label="Change profile photo" onClick={() => setShowProfilePhoto(true)} className="relative shrink-0 rounded-full">
                  <SafeImage
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    fallbackType="avatar"
                    textForInitials={currentUser.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary-action"
                  />
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-primary-action text-background px-1.5 py-0.5 text-[10px] font-bold">Edit</span>
                  </button>
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
                      <span className="text-2xl font-black text-text-primary">Unavailable</span>
                      <p className="text-[9px] text-text-secondary mt-0.5">No wallet or escrow ledger is implemented.</p>
                    </div>
                    <button
                      onClick={() => setShowWalletModal(true)}
                      className="px-4 py-2 bg-primary-action text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider hover:bg-primary-action-hover transition-colors"
                    >
                      Wallet Status
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
                          onToggleFavorite={handleToggleFavorite}
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
                        <CustomerBookingActions booking={booking} onCancel={id => updateBookingStatus(id, 'cancelled')} onShowToast={showToast} />
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
        {mobileTab === 'search' && !isDesktop && <div className="px-4 pb-24">{renderPeople()}</div>}

        {/* Render Mobile Tab Notifications */}
        {mobileTab === 'notifications' && (
          <div className="p-4 space-y-6 pb-20 select-none">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-text-primary">Notifications</h2>
              {unreadNotifCount > 0 && (
                 <button
                   onClick={() => {
                     markAllNotificationsRead();
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
                    onClick={() => { markNotificationRead(n.id); const target = notificationTarget(n); if (target) navigate(target); }}
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
        <div className="sathi-bottom-navigation fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-white/10 flex justify-between items-center px-6 z-50">
          {[
            { tab: 'home', path: '/', icon: <Home className="w-5 h-5" />, label: 'For you' },
            { tab: 'search', path: '/companions', icon: <Search className="w-5 h-5" />, label: 'People' },
            { tab: 'explore', path: '/explore', icon: <Compass className="w-5 h-5" />, label: 'Explore' },
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
                  } else if (item.tab === 'home') {
                    setActiveTab('home');
                  } else if (item.tab === 'events') {
                    setActiveTab('events');
                  } else {
                    setActiveTab('explore');
                  }
                  if (item.path) {
                    if (item.path === '/companions') { setPeopleMode('types'); setShowSavedOnly(false); }
                    navigate(item.path);
                  }
                  if (mobileTab === item.tab) {
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
      {showCreateEventModal && <CreateEventModal onClose={() => setShowCreateEventModal(false)} onSaved={id => { void retryEvents(); navigate(`/event/${id}`); }} />}
      {activeTab === 'events' && <button className="fixed bottom-24 right-4 z-40 bg-primary-action text-background rounded-xl px-4 py-2 shadow-lg" onClick={() => setShowCreateEventModal(true)}>Create Event</button>}
      {viewingStory && viewingStory.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setViewingStory(null)}>
          <div className="relative w-full max-w-sm aspect-[9/16] bg-surface rounded-3xl overflow-hidden border border-border-token/80" onClick={e => e.stopPropagation()}>
            <SafeImage src={viewingStory.imageUrl} className="w-full h-full object-cover" alt="SATHI Story" fallbackType="thumbnail" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85"></div>

            {/* Top Bar inside Story */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 text-left">
                <SafeImage src={viewingStory.userId === currentUser?.id ? currentUser.avatar : viewingStory.userAvatar} className="w-9 h-9 rounded-full border border-primary-action object-cover" alt={viewingStory.userName} fallbackType="avatar" textForInitials={viewingStory.userName} />
                <div>
                  <span className="text-text-primary font-bold text-xs block leading-tight">{viewingStory.userName}</span>
                  <span className="text-text-secondary text-[9px]">with {viewingStory.companionName || 'SATHI'} • {formatStoryTimeAgo(viewingStory.createdAt, storyNow)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 {currentUser && currentUser.id === viewingStory.userId && (
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setShowDeleteStoryConfirm(true);
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

            <div className="absolute inset-y-20 inset-x-0"><StoryLikeSurface key={viewingStory.id} className="h-full w-full" onLike={() => storyReaction.setLiked(true)} /></div>
            <button aria-label="Previous Story" className="absolute left-2 top-1/2 z-30 p-2 rounded-full bg-black/40 text-white" onClick={() => { const idx = ownerStories.findIndex(s => s.id === viewingStory.id); if (idx > 0) void openVisibleStory(ownerStories[idx - 1]); }}>‹</button>
            <button aria-label="Next Story" className="absolute right-2 top-1/2 z-30 p-2 rounded-full bg-black/40 text-white" onClick={() => { void nextOwnerStory(); }}>›</button>

            {/* Bottom story details */}
            <div className="absolute bottom-6 inset-x-0 p-5 flex flex-col justify-end text-left space-y-3 z-10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-text-primary text-sm font-semibold drop-shadow flex-1">{viewingStory.caption}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); void storyReaction.setLiked(!storyReaction.liked); }}
                  disabled={storyReaction.busy || !!storyReaction.error}
                  aria-label={storyReaction.liked ? 'Unlike Story' : 'Like Story'}
                  aria-pressed={storyReaction.liked}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-text-primary border border-white/20 hover:scale-105 transition-transform"
                >
                  <Heart className={`w-4 h-4 ${storyReaction.liked ? 'fill-red-500 text-red-500' : 'text-text-primary'}`} />
                  {storyReaction.count > 0 && (
                    <span className="text-xs font-bold">{storyReaction.count}</span>
                  )}
                </button>
              </div>
              {storyReaction.error && <p role="alert" className="text-xs text-text-secondary">{storyReaction.error} <button onClick={() => { void storyReaction.refresh(); }} className="text-primary-action">Refresh likes</button></p>}
              <p className="text-xs text-text-secondary">Double tap the photo to like</p>

              <div className="flex gap-1">
                {ownerStories.map((s, idx) => {
                  const sIdx = idx;
                  const activeIdx = ownerStories.findIndex(x => x.id === viewingStory.id);
                  return (
                    <div key={`${s.id}-${idx}`} className="h-1 rounded-full flex-1 bg-white/20 overflow-hidden relative">
                      {s.id === viewingStory.id && (
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 5, ease: 'linear' }}
                          className="absolute inset-y-0 left-0 bg-primary-action"
                          onAnimationComplete={() => {
                            void nextOwnerStory();
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

      {/* Delete Story Confirmation */}
      <Modal isOpen={showDeleteStoryConfirm} onClose={() => !isDeletingStory && setShowDeleteStoryConfirm(false)} title="Delete Story?">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Are you sure you want to delete this story? This action cannot be undone.</p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteStoryConfirm(false)}
              disabled={isDeletingStory}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-elevated border border-border-token text-text-primary hover:bg-surface disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!viewingStory || isDeletingStory) return;
                setIsDeletingStory(true);
                try {
                  await socialRepository.deleteStory(viewingStory.id);
                  removeStory(viewingStory.id);
                  showToast('Story deleted', 'success');
                  setViewingStory(null);
                  setShowDeleteStoryConfirm(false);
                } catch (err) {
                  showToast('Failed to delete story', 'error');
                } finally {
                  setIsDeletingStory(false);
                }
              }}
              disabled={isDeletingStory}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
            >
              {isDeletingStory ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

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
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2"><Wallet className="w-5 h-5 text-primary-action" /> SATHI Coins Wallet</h3>
                <button onClick={() => setShowWalletModal(false)} className="text-text-secondary hover:text-text-primary rounded-full p-1.5 hover:bg-surface-elevated">✕</button>
              </div>

              <CoinWalletPanel />
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
      {showProfilePhoto && currentUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Change profile photo">
          <div className="w-full max-w-sm rounded-2xl border border-border-token bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between"><h2 className="font-bold text-text-primary">Change profile photo</h2><button type="button" aria-label="Close photo editor" onClick={() => setShowProfilePhoto(false)}>×</button></div>
            <ProfilePhotoUpload />
          </div>
        </div>
      )}
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
                    <span className="text-xs font-extrabold text-text-primary">{maxHourlyRate === 3000 ? 'Any price' : `NPR ${maxHourlyRate.toLocaleString()}/hr`}</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Maximum hourly rate (3000 means any price)"
                    min={0}
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
                  onClick={() => { setIsFilterDrawerOpen(false); openCompanionSearch(); }}
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
                  <button onClick={() => { setPeopleMode('all'); setShowSavedOnly(true); setMobileTab('search'); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
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
                      <Wallet className="w-4.5 h-4.5 text-primary-action" /> SATHI Coins
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
                  <button onClick={() => { showToast("Privacy controls are limited; SATHI does not provide escrow or end-to-end encrypted messaging.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
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
                  <button onClick={() => { showToast("SATHI has no verified emergency helpline. Contact local emergency services directly for urgent help.", "info"); setShowProfileDropdown(false); }} className="w-full text-left px-3.5 py-3 text-xs text-text-primary bg-surface/50 rounded-xl hover:bg-surface-elevated flex items-center justify-between transition-colors">
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
        <CreateStoryModal onClose={() => setShowCreateStoryModal(false)} onSuccess={(s) => prependStory(s)} />
      )}

    </div>
  );
});
