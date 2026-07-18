/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import React from 'react';
import { CompanionProfileModal } from './components/modals/CompanionProfileModal';
import { AuthModal } from './components/AuthModal';
import { MessagesTab } from './components/messages/MessagesTab';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { PartnerDashboard } from './components/dashboard/PartnerDashboard';
import { SafetyWidget } from './components/SafetyWidget';
import { Companion, ExperienceStory } from './types';
import { 
  MapPin, Star, ShieldCheck, Languages, Search, Play, Clock, 
  Home, Compass, Users, Calendar, MessageSquare, BookOpen, Heart, 
  Wallet, Smile, ArrowRight, CheckCircle, Info, Menu, X, Bell, 
  ChevronDown, Award, Sparkles, AlertTriangle, Coins, Briefcase, ChevronRight, HelpCircle, UserCircle, SlidersHorizontal,
  Lock, Settings, LogOut, Sun, Moon
} from 'lucide-react';
import * as motion from 'motion/react-client';
import { useAppContext } from './context/AppContext';
import { useToast } from './components/ui/Toast';
import { useCompanions, useStories, useActivities, useEvents, usePartners, useCommunityPosts } from './hooks/useFirestoreData';
import { AnimatePresence } from 'motion/react';

interface ClientAppProps {
  initialTab?: 'explore' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner';
}

export const ClientApp = React.memo(({ initialTab }: ClientAppProps = {}) => {
  const { bookings, currentUser, updateBookingStatus, favorites, toggleFavorite, notifications, markNotificationRead, logout } = useAppContext();
  const { showToast } = useToast();
  
  const { companions: fetchedCompanions, loading: companionsLoading } = useCompanions();
  const { stories: fetchedStories, loading: storiesLoading } = useStories();
  const { activities, loading: activitiesLoading } = useActivities();
  const { events, loading: eventsLoading } = useEvents();
  const { partners, loading: partnersLoading } = usePartners();
  const { posts, loading: postsLoading } = useCommunityPosts();
  
  const [activeTab, setActiveTab] = useState<'explore' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner'>(initialTab || 'explore');
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingStory, setViewingStory] = useState<ExperienceStory | null>(null);
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'explore' | 'experiences' | 'bookings' | 'messages' | 'profile'>('home');
  const [activeChatCompanionId, setActiveChatCompanionId] = useState<string | null>(null);
  
  // Earnings Calculator States
  const [calcHourlyRate, setCalcHourlyRate] = useState<number>(1200); // NPR per hour
  const [calcWeeklyHours, setCalcWeeklyHours] = useState<number>(15); // Hours per week
  
  // Interactive social reaction counts
  const [momentLikes, setMomentLikes] = useState<Record<number, number>>({ 0: 24, 1: 42, 2: 18 });
  const [momentLiked, setMomentLiked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSOS) {
      timer = setTimeout(() => {
        setShowSOS(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [showSOS]);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveHeroSlide(prev => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, []);
  
  const companions = fetchedCompanions;
  const stories = fetchedStories;
  const unreadNotifCount = notifications ? notifications.filter(n => !n.isRead).length : 0;

  const handleViewCompanion = (companion: Companion) => {
    setSelectedCompanion(companion);
  };

  const handleToggleLikeMoment = (id: string | number) => {
    setMomentLiked(prev => {
      const liked = !prev[id];
      setMomentLikes(likes => ({
        ...likes,
        [id]: liked ? (likes[id] || 0) + 1 : Math.max(0, (likes[id] || 0) - 1)
      }));
      showToast(liked ? "Liked community adventure!" : "Removed like", "success");
      return { ...prev, [id]: liked };
    });
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    showToast(`Filtering experiences in ${city}`, 'info');
  };

  const handleTriggerInvite = () => {
    navigator.clipboard.writeText("https://sathi.com/invite?ref=safal_kunwar");
    showToast("Invite link copied to clipboard! Share with friends to earn NPR 5,000.", "success");
  };

  const handleWalletTopUp = () => {
    showToast("Redirecting to secure Khalti Gateway for wallet top up...", "info");
  };

  const filteredCompanions = companions.filter(c => {
    const matchesSearch = 
      c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.interests.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      c.interests.includes(selectedCategory) || 
      c.bio.includes(selectedCategory);
    
    const matchesCity = 
      selectedCity === 'All' || 
      c.location.toLowerCase() === selectedCity.toLowerCase();
    
    const matchesSaved = 
      !showSavedOnly || 
      (favorites && favorites.includes(c.id));
    
    return matchesSearch && matchesCategory && matchesCity && matchesSaved;
  }).sort((a, b) => {
    if (sortBy === 'priceAsc') return a.hourlyRate - b.hourlyRate;
    if (sortBy === 'priceDesc') return b.hourlyRate - a.hourlyRate;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // recommended
  });

  // Dynamic calculations for guide earnings
  const estWeeklyEarnings = calcHourlyRate * calcWeeklyHours;
  const estMonthlyEarnings = Math.round(estWeeklyEarnings * 4.33);

  return (
    <div className="min-h-screen bg-[#0F1113] font-sans text-[#E0E0E0] flex flex-col lg:flex-row relative overflow-x-hidden selection:bg-[#C8A25E]/30 selection:text-[#C8A25E]">
      
      {/* ==================== LEFT SIDEBAR (DESKTOP) ==================== */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bottom-0 bg-[#0F1113] border-r border-[#2A2D31]/40 p-5 select-none z-40 shrink-0 justify-between overflow-y-auto hide-scrollbar">
        <div className="space-y-5">
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-[#1E2124]/30 transition-all"
            onClick={() => {
              setActiveTab('explore');
              setSelectedCategory('All');
              setSelectedCity('All');
              setShowSavedOnly(false);
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-[#C8A25E] flex items-center justify-center font-bold text-[#0F1113] text-lg shadow-md shadow-[#C8A25E]/20">
              S
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">SATHI<span className="text-[#C8A25E]">.</span></span>
              <span className="text-[9px] uppercase tracking-wider text-[#8E9299] block font-light -mt-1">Trusted Experiences</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Sidebar navigation">
            <button 
              onClick={() => { setActiveTab('explore'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none ${activeTab === 'explore' && !showSavedOnly ? 'bg-[#C8A25E]/10 text-[#C8A25E] border-l-4 border-[#C8A25E]' : 'text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40'}`}
            >
              <Home className="w-4 h-4" /> Home
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none ${activeTab === 'explore' && selectedCategory === 'All' && !showSavedOnly ? 'bg-[#1E2124]/50 text-white' : 'text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40'}`}
            >
              <Compass className="w-4 h-4" /> Explore
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); setSelectedCategory('All'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} 
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
            >
              <span className="flex items-center gap-3"><Users className="w-4 h-4" /> Companions</span>
              <span className="text-[10px] bg-[#C8A25E]/20 text-[#C8A25E] px-1.5 py-0.5 rounded font-bold">Active</span>
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); const actSection = document.getElementById('activities-section'); if (actSection) actSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
            >
              <BookOpen className="w-4 h-4" /> Activities
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); const evSection = document.getElementById('events-section'); if (evSection) evSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
            >
              <Calendar className="w-4 h-4" /> Events
            </button>
            <button 
              onClick={() => { setActiveTab('messages'); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none ${activeTab === 'messages' ? 'bg-[#C8A25E]/10 text-[#C8A25E] border-l-4 border-[#C8A25E]' : 'text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40'}`}
            >
              <span className="flex items-center gap-3"><MessageSquare className="w-4 h-4" /> Messages</span>
              <span className="w-2.5 h-2.5 bg-[#C8A25E] rounded-full animate-pulse"></span>
            </button>
            <button 
              onClick={() => { setActiveTab('bookings'); setIsMobileSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none ${activeTab === 'bookings' ? 'bg-[#C8A25E]/10 text-[#C8A25E] border-l-4 border-[#C8A25E]' : 'text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40'}`}
            >
              <Calendar className="w-4 h-4" /> Bookings
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); setShowSavedOnly(true); setIsMobileSidebarOpen(false); showToast("Viewing Saved Companions", "success"); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none ${showSavedOnly ? 'bg-[#C8A25E]/10 text-[#C8A25E] border-l-4 border-[#C8A25E]' : 'text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40'}`}
            >
              <Heart className="w-4 h-4" /> Saved
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); const testSection = document.getElementById('testimonials-section'); if (testSection) testSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
            >
              <Smile className="w-4 h-4" /> Reviews
            </button>
            <button 
              onClick={() => setShowWalletModal(true)} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
            >
              <Wallet className="w-4 h-4" /> Wallet
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); const feedSection = document.getElementById('moments-section'); if (feedSection) feedSection.scrollIntoView({ behavior: 'smooth' }); }} 
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E9299] hover:text-white hover:bg-[#1E2124]/40 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
            >
              <Users className="w-4 h-4" /> Community
            </button>
          </nav>
        </div>

        {/* Sidebar Footer - Compact Height-Safe Invite Card */}
        <div className="bg-[#1E2124]/50 border border-[#2A2D31]/40 rounded-2xl p-3 relative overflow-hidden mt-auto">
          <div className="absolute -right-5 -bottom-5 w-16 h-16 bg-[#C8A25E]/5 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-[#C8A25E] text-[10px] font-black uppercase tracking-wider">
              <Coins className="w-3.5 h-3.5 animate-pulse text-[#C8A25E]" /> Invite & Earn
            </div>
            <span className="text-[9px] text-[#C8A25E] font-mono bg-[#C8A25E]/15 px-1.5 py-0.5 rounded-md font-bold">NPR 5K</span>
          </div>
          <p className="text-[9px] text-[#8E9299] leading-relaxed mt-1.5">Earn referral bonus for signups.</p>
          <button 
            onClick={handleTriggerInvite}
            className="w-full mt-2 py-1.5 bg-[#C8A25E] hover:bg-[#B69150] active:scale-95 text-[#0F1113] rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all shadow-md"
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
              className="relative w-72 bg-[#0F1113] h-full p-6 flex flex-col justify-between border-r border-[#2A2D31]/50 shadow-2xl z-50"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#C8A25E] flex items-center justify-center font-bold text-[#0F1113] text-base">S</div>
                    <span className="text-lg font-bold text-white">SATHI<span className="text-[#C8A25E]">.</span></span>
                  </div>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-[#8E9299] hover:text-white rounded-full bg-[#1E2124]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-2">
                  <button onClick={() => { setActiveTab('explore'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${activeTab === 'explore' && !showSavedOnly ? 'bg-[#C8A25E]/10 text-[#C8A25E]' : 'text-[#8E9299]'}`}>
                    <Home className="w-4 h-4" /> Home
                  </button>
                  <button onClick={() => { setActiveTab('explore'); setShowSavedOnly(false); setIsMobileSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#8E9299]">
                    <Compass className="w-4 h-4" /> Explore
                  </button>
                  <button onClick={() => { setActiveTab('messages'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${activeTab === 'messages' ? 'bg-[#C8A25E]/10 text-[#C8A25E]' : 'text-[#8E9299]'}`}>
                    <MessageSquare className="w-4 h-4" /> Messages
                  </button>
                  <button onClick={() => { setActiveTab('bookings'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${activeTab === 'bookings' ? 'bg-[#C8A25E]/10 text-[#C8A25E]' : 'text-[#8E9299]'}`}>
                    <Calendar className="w-4 h-4" /> Bookings
                  </button>
                  <button onClick={() => { setActiveTab('explore'); setShowSavedOnly(true); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${showSavedOnly ? 'bg-[#C8A25E]/10 text-[#C8A25E]' : 'text-[#8E9299]'}`}>
                    <Heart className="w-4 h-4" /> Saved Companions
                  </button>
                  <button onClick={() => { setShowWalletModal(true); setIsMobileSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#8E9299]">
                    <Wallet className="w-4 h-4" /> My Wallet
                  </button>
                  <button onClick={() => { setActiveTab('partner'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${activeTab === 'partner' ? 'bg-[#C8A25E]/10 text-[#C8A25E]' : 'text-[#8E9299]'}`}>
                    <Briefcase className="w-4 h-4" /> Partners
                  </button>
                  <button onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${activeTab === 'dashboard' ? 'bg-[#C8A25E]/10 text-[#C8A25E]' : 'text-[#8E9299]'}`}>
                    <UserCircle className="w-4 h-4" /> My Profile
                  </button>
                </nav>
              </div>

              <div className="bg-[#1E2124] rounded-2xl p-4 text-center space-y-2">
                <p className="text-xs text-[#8E9299]">Share & Earn NPR 5,000</p>
                <button onClick={handleTriggerInvite} className="w-full py-2 bg-[#C8A25E] text-[#0F1113] rounded-xl text-xs font-bold">Invite Contacts</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== MAIN WORKSPACE CONTAINER (DESKTOP ONLY) ==================== */}
      <div className="flex-1 hidden lg:flex flex-col min-w-0 bg-[#0F1113] lg:pl-64">
        
        {/* ==================== STICKY TOP HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-[#0F1113]/90 backdrop-blur-md border-b border-[#2A2D31]/40 py-3 px-4 md:px-8 flex justify-between items-center gap-4">
          
          {/* Left section: mobile hamburger & brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-[#8E9299] hover:text-white rounded-xl bg-[#1E2124]/50 border border-[#2A2D31]/30 transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex lg:hidden items-center gap-2 cursor-pointer" onClick={() => setActiveTab('explore')}>
              <div className="w-8 h-8 rounded-lg bg-[#C8A25E] flex items-center justify-center font-bold text-[#0F1113] text-base">S</div>
              <span className="text-base font-bold text-white tracking-tight">SATHI<span className="text-[#C8A25E]">.</span></span>
            </div>
          </div>

          {/* Search bar inside header (Responsive) */}
          <div className="hidden sm:block flex-1 max-w-xl relative">
            <Search className="w-4 h-4 text-[#8E9299] absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search companions, local skills, activities, or chiya spots..." 
              className="w-full bg-[#1E2124]/50 border border-[#2A2D31]/40 rounded-full h-10 pl-11 pr-10 text-xs text-white placeholder-[#8E9299] focus:outline-none focus:border-[#C8A25E] focus:bg-[#17191C] transition-all shadow-inner focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
                showToast("Filters reset", "info");
              }}
              className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[10px] uppercase font-bold text-[#C8A25E] hover:underline"
              title="Clear search"
            >
              Reset
            </button>
          </div>

          {/* Right section: location selector, notifications, user profile badge */}
          <div className="flex items-center gap-3 md:gap-5">
            
            {/* Custom Location Selector Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-[#1E2124]/60 border border-[#2A2D31]/40 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer hover:border-[#C8A25E] hover:bg-[#17191C] transition-all">
                <MapPin className="w-3.5 h-3.5 text-[#C8A25E]" />
                <span className="max-w-[80px] md:max-w-none truncate">{selectedCity === 'All' ? 'Nepal' : selectedCity}</span>
                <ChevronDown className="w-3 h-3 text-[#8E9299]" />
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
                className="relative w-9 h-9 rounded-full bg-[#1E2124]/60 border border-[#2A2D31]/40 hover:border-[#C8A25E] hover:bg-[#17191C] transition-all flex items-center justify-center text-white focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border-2 border-[#1E2124] animate-pulse">
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
                      className="absolute right-0 top-11 mt-2 w-80 bg-[#17191C] border border-[#2A2D31] rounded-2xl shadow-2xl py-3 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-[#2A2D31]/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Notifications</span>
                        <span className="text-[10px] text-[#C8A25E] cursor-pointer hover:underline" onClick={() => showToast("All marked as read!", "success")}>Mark all read</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-[#2A2D31]/40">
                        {notifications && notifications.length > 0 ? (
                          notifications.slice(0, 5).map(n => (
                            <div key={n.id} onClick={() => { markNotificationRead(n.id); setShowNotificationsDropdown(false); }} className={`p-3 text-left hover:bg-[#1E2124] transition-colors cursor-pointer ${!n.isRead ? 'bg-[#C8A25E]/5' : ''}`}>
                              <p className={`text-xs ${!n.isRead ? 'font-bold text-white' : 'text-gray-300'}`}>{n.title}</p>
                              <p className="text-[10px] text-[#8E9299] mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[8px] text-[#5A5E66] block mt-1">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-[#8E9299] space-y-2">
                            <Sparkles className="w-8 h-8 mx-auto text-[#C8A25E]/40" />
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
                className="flex items-center gap-2 p-1 md:pr-3 bg-[#1E2124]/60 border border-[#2A2D31]/40 rounded-full cursor-pointer hover:border-[#C8A25E] transition-all"
              >
                <img 
                  src={currentUser?.avatar || "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?q=80&w=300&auto=format&fit=crop"} 
                  alt={currentUser?.name || "Guest User"} 
                  className="w-7 h-7 rounded-full object-cover border border-[#2A2D31]"
                />
                <div className="hidden md:block text-left select-none">
                  <span className="text-[11px] font-bold text-white block -mb-0.5 leading-tight">{currentUser?.name || "Guest User"}</span>
                  <span className="text-[9px] font-semibold text-[#C8A25E] block leading-none">{currentUser ? "Premium" : "Guest Mode"}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-[#8E9299] hidden md:block" />
              </div>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-11 mt-2 w-52 bg-[#17191C] border border-[#2A2D31] rounded-2xl shadow-2xl py-2 z-50 overflow-hidden text-left"
                    >
                      <div className="px-4 py-2.5 border-b border-[#2A2D31]/60">
                        <span className="text-xs font-bold text-white block truncate">{currentUser?.name || "Guest User"}</span>
                        <span className="text-[10px] text-[#8E9299] block whitespace-normal leading-normal">{currentUser?.email || "Sign in to unlock messaging, bookings, favorites, and companion features."}</span>
                      </div>
                      
                      <div className="py-1">
                        <button onClick={() => { setActiveTab('dashboard'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-[#8E9299] hover:bg-[#1E2124] hover:text-white flex items-center gap-2">
                          <Compass className="w-4 h-4" /> Personal Dashboard
                        </button>
                        <button onClick={() => { setActiveTab('partner'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-[#8E9299] hover:bg-[#1E2124] hover:text-white flex items-center gap-2">
                          <Briefcase className="w-4 h-4" /> Partner Dashboard
                        </button>
                        <button onClick={() => { setAuthMode('guide'); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-[#C8A25E] hover:bg-[#1E2124] flex items-center gap-2 font-semibold">
                          <Sparkles className="w-4 h-4" /> Join as SATHI Guide
                        </button>
                        <button onClick={() => { setShowWalletModal(true); setShowProfileDropdown(false); }} className="w-full text-left px-4 py-2 text-xs text-[#8E9299] hover:bg-[#1E2124] hover:text-white flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> My Wallet (NPR)
                        </button>
                      </div>

                      <div className="py-1 border-t border-[#2A2D31]/60">
                        {currentUser ? (
                          <button 
                            onClick={async () => { await logout(); setShowProfileDropdown(false); showToast("Logged out successfully", "success"); }}
                            className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            Log Out
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setAuthMode('login'); setShowProfileDropdown(false); }}
                            className="w-full text-left px-4 py-2 text-xs text-[#C8A25E] hover:bg-[#1E2124] flex items-center gap-2 font-bold"
                          >
                            Sign In / Register
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
              <div className="p-6 bg-[#1A1814] border border-[#C8A25E]/30 rounded-3xl relative overflow-hidden">
                <button onClick={() => setShowGuideSetup(false)} className="absolute top-4 right-4 text-[#8E9299] hover:text-white">✕</button>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Star className="w-5 h-5 text-[#C8A25E]" /> Complete Your SATHI Profile</h2>
                <p className="text-sm text-[#8E9299] mb-6">Complete your profile to unlock bookings from thousands of travelers visiting Nepal.</p>
                <button onClick={() => { showToast('Profile saved successfully!', 'success'); setShowGuideSetup(false); }} className="px-5 py-2 bg-[#C8A25E] text-[#0F1113] font-bold text-xs rounded-xl hover:bg-[#B69150]">Save Profile Data</button>
              </div>
            )}

            {/* Render dynamically based on Tab */}
            {activeTab === 'explore' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                
                {/* Mobile-only Search Bar */}
                <div className="block sm:hidden relative mt-1">
                  <Search className="w-4 h-4 text-[#8E9299] absolute left-4 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search companions, local skills, activities..." 
                    className="w-full bg-[#1E2124]/90 border border-[#2A2D31]/50 rounded-full h-11 pl-11 pr-10 text-xs text-white placeholder-[#8E9299] focus:outline-none focus:border-[#C8A25E] focus:bg-[#17191C] transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[10px] uppercase font-bold text-[#C8A25E] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* 1. COMMUNITY STORIES SECTION (Horizontal Scroll - Classic Circular Bubbles) */}
                <section aria-label="Recent Adventures Feed">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#C8A25E] rounded-full animate-pulse"></span>
                      <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">Stories from the Community</h2>
                    </div>
                    <button onClick={() => showToast('Stories feed synchronized!', 'success')} className="text-xs font-semibold text-[#C8A25E] hover:underline">See all</button>
                  </div>
                  
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory">
                    {/* Share story card */}
                    <div 
                      onClick={() => showToast('Moment upload coming soon!', 'info')} 
                      className="shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer group snap-start"
                    >
                      <div className="w-16 h-16 rounded-full p-[2.5px] bg-[#1E2124] border border-[#2A2D31]/60 relative hover:scale-105 transition-all">
                        <img 
                          src={currentUser?.avatar || "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?q=80&w=300&auto=format&fit=crop"} 
                          alt="Your Story" 
                          className="w-full h-full rounded-full border-2 border-[#1E2124] object-cover" 
                        />
                        <div className="absolute bottom-0 right-0 bg-[#C8A25E] text-[#0F1113] w-5 h-5 rounded-full flex items-center justify-center font-bold text-base leading-none border border-[#1E2124] hover:bg-[#B69150]">+</div>
                      </div>
                      <span className="text-[10px] font-bold text-[#8E9299] truncate w-full text-center">Your Story</span>
                    </div>

                    {/* Stories map */}
                    {storiesLoading ? (
                      <div className="flex gap-4 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="w-16 h-16 rounded-full bg-[#1E2124]" />
                        ))}
                      </div>
                    ) : (
                      stories.map((story) => {
                        const getEmoji = (caption: string) => {
                          if (caption.toLowerCase().includes('momo') || caption.toLowerCase().includes('food')) return '🍜';
                          if (caption.toLowerCase().includes('sunset') || caption.toLowerCase().includes('swayambhu')) return '🌅';
                          if (caption.toLowerCase().includes('patan') || caption.toLowerCase().includes('durbar') || caption.toLowerCase().includes('history')) return '🏛️';
                          return '☕';
                        };
                        return (
                          <div 
                            key={story.id} 
                            onClick={() => setViewingStory(story)}
                            className="shrink-0 w-20 flex flex-col items-center gap-2 cursor-pointer group snap-start"
                          >
                            <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-[#C8A25E] via-red-500 to-purple-600 relative hover:scale-105 transition-all">
                              <img 
                                src={story.imageUrl} 
                                alt={story.userName} 
                                className="w-full h-full rounded-full border-2 border-[#17191C] object-cover" 
                              />
                              {(story.id === 's1' || story.id === 's2') && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-widest border border-red-600 shadow-md">
                                  Live
                                </span>
                              )}
                              <span className="absolute -top-1 -right-1 bg-black/80 backdrop-blur-md w-5 h-5 rounded-full flex items-center justify-center text-xs border border-white/10 shadow-sm">
                                {getEmoji(story.caption)}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-[#8E9299] truncate w-full text-center">
                              {story.userName}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>


                {/* 3. COMPANION CATEGORY / FILTER SELECTION */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-[#8E9299]">Browse Experience Categories</h3>
                      <p className="text-sm text-white font-medium mt-0.5">Match interests with trusted specialized companions</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    {['All', 'Coffee Buddy', 'Travel Companion', 'Language Exchange', 'Food Explorer', 'Museum Guide', 'Hiking Partner', 'Shopping Buddy', 'Study Partner', 'Nightlife', 'Photography Walk'].map((cat) => {
                      const emojis: Record<string, string> = {
                        'All': '✨',
                        'Coffee Buddy': '☕',
                        'Travel Companion': '✈️',
                        'Language Exchange': '🗣️',
                        'Food Explorer': '🍜',
                        'Museum Guide': '🏛️',
                        'Hiking Partner': '🥾',
                        'Shopping Buddy': '🛍️',
                        'Study Partner': '📚',
                        'Nightlife': '🌙',
                        'Photography Walk': '📷'
                      };
                      return (
                        <button 
                          key={cat} 
                          onClick={() => {
                            setSelectedCategory(cat);
                            setShowSavedOnly(false);
                            showToast(`Filtered by ${cat}`, 'success');
                          }}
                          className={`shrink-0 px-4 py-2.5 rounded-full text-xs font-bold transition-all border shadow-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1113] focus:outline-none ${selectedCategory === cat ? 'bg-[#C8A25E] text-[#0F1113] border-[#C8A25E] scale-105' : 'bg-[#1E2124]/80 text-[#8E9299] border-[#2A2D31]/50 hover:border-[#C8A25E] hover:text-white'}`}
                        >
                          <span className="text-xs">{emojis[cat] || '✨'}</span>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 4. COMPANION MARKETPLACE FEED (VISUAL CENTERPIECE) */}
                <section id="marketplace-section" className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2A2D31]/40 pb-4">
                    <div>
                      <h2 className="text-xl md:text-3xl font-extrabold text-white flex items-center gap-2">
                        Top Companions for You <span className="text-xs text-[#C8A25E] bg-[#C8A25E]/10 border border-[#C8A25E]/20 px-2.5 py-0.5 rounded-full">KYC Verified</span>
                      </h2>
                      <p className="text-xs text-[#8E9299] mt-1">Book safely. Hourly rates listed in NPR. Zero commission or matching fee.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Search Sorting selector */}
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-[#1E2124] border border-[#2A2D31]/60 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-[#C8A25E] transition-all cursor-pointer"
                        aria-label="Sort companions list"
                      >
                        <option value="recommended">Recommended</option>
                        <option value="rating">Highest Rated</option>
                        <option value="priceAsc">Price: Low to High</option>
                        <option value="priceDesc">Price: High to Low</option>
                      </select>

                      <button 
                        onClick={() => {
                          setSelectedCategory('All');
                          setSelectedCity('All');
                          setShowSavedOnly(false);
                          setSearchQuery('');
                        }} 
                        className="text-xs font-bold text-[#C8A25E] hover:underline"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>

                  {companionsLoading ? (
                    <div className="text-center py-20 text-[#8E9299] flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full border-2 border-t-[#C8A25E] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                      <span>Syncing companion profiles...</span>
                    </div>
                  ) : filteredCompanions.length === 0 ? (
                    <div className="text-center py-16 bg-[#17191C] border border-[#2A2D31]/50 rounded-3xl space-y-4">
                      <Search className="w-12 h-12 text-[#8E9299] mx-auto mb-2" />
                      <h3 className="text-lg font-bold text-white">No companions match your criteria</h3>
                      <p className="text-xs text-[#8E9299] max-w-sm mx-auto">Try resetting filters, selecting a different city, or checking your Saved list.</p>
                      <button 
                        onClick={() => { setSelectedCategory('All'); setSelectedCity('All'); setShowSavedOnly(false); setSearchQuery(''); }}
                        className="px-5 py-2.5 bg-[#C8A25E] text-[#0F1113] font-bold text-xs rounded-xl hover:bg-[#B69150]"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    /* High-fidelity Companion grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredCompanions.map((comp) => {
                        const isFav = favorites && favorites.includes(comp.id);
                        return (
                          <div 
                            key={comp.id}
                            onClick={() => handleViewCompanion(comp)}
                            className="group relative aspect-[3/4.2] rounded-[32px] overflow-hidden border border-[#2A2D31]/40 bg-[#17191C] hover:border-[#C8A25E]/40 hover:shadow-2xl hover:shadow-[#C8A25E]/5 transition-all duration-500 cursor-pointer snap-start focus-visible:ring-2 focus-visible:ring-[#C8A25E]"
                          >
                            {/* Card Image */}
                            <img 
                              src={comp.imageUrl} 
                              alt={comp.name} 
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-700" 
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/10 group-hover:via-black/35 transition-all duration-300 z-10" />
                            
                            {/* Top left category tag & Top right save button */}
                            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                              <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-[#C8A25E] border border-white/10 uppercase tracking-widest">
                                {comp.interests[0] || 'Local Companion'}
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(comp.id); }}
                                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10 text-white hover:text-red-500 hover:scale-110 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E]"
                                aria-label="Save companion"
                              >
                                <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                              </button>
                            </div>

                            {/* Bottom absolute details overlay */}
                            <div className="absolute bottom-5 left-5 right-5 z-20 space-y-3 text-left">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-white font-black text-xl drop-shadow-md">
                                  {comp.name}, {comp.age}
                                  {comp.isVerified && <ShieldCheck className="w-5 h-5 text-[#C8A25E]" />}
                                </div>
                                <p className="text-[#8E9299] text-xs flex items-center gap-1 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-[#C8A25E]" /> {comp.location}, Nepal
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-[#C8A25E] text-xs font-bold">
                                    <Star className="w-3.5 h-3.5 fill-current" /> {comp.rating}
                                    <span className="text-white/50 font-light text-[10px]">({comp.reviewsCount || 120})</span>
                                  </div>
                                  <span className="text-[10px] text-white/60 block">From <span className="font-bold text-[#C8A25E]">NPR {comp.hourlyRate}</span>/hr</span>
                                </div>

                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleViewCompanion(comp); }}
                                  className="px-4 py-2 bg-[#C8A25E] hover:bg-[#B69150] text-[#0F1113] rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
                                >
                                  Book
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* 2. IMMERSIVE HERO SECTION WITH INTEGRATED MINIMAL SEARCH */}
                <section className="relative rounded-[32px] overflow-hidden min-h-[340px] md:min-h-[460px] border border-[#2A2D31]/40 bg-[#17191C] group shadow-2xl">
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
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1113] via-[#0F1113]/40 to-transparent" />
                    </motion.div>
                  </AnimatePresence>
 
                  {/* Top-right Navigation Arrows */}
                  <div className="absolute top-6 right-6 flex gap-2 z-20">
                    <button 
                      onClick={() => setActiveHeroSlide(prev => (prev === 0 ? 2 : prev - 1))}
                      className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[#C8A25E]"
                      aria-label="Previous slide"
                    >
                      ←
                    </button>
                    <button 
                      onClick={() => setActiveHeroSlide(prev => (prev + 1) % 3)}
                      className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 flex items-center justify-center text-sm font-semibold transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-[#C8A25E]"
                      aria-label="Next slide"
                    >
                      →
                    </button>
                  </div>
 
                  {/* Left Content Column (Maximum visual priority) */}
                  <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent text-left">
                    <div className="max-w-2xl space-y-4">
                      {/* 10K+ beautiful indicator */}
                      <div className="flex items-center gap-2 text-[#C8A25E] text-xs font-bold uppercase tracking-wider drop-shadow-md">
                        <Sparkles className="w-4 h-4 animate-spin-slow" />
                        <span>10K+ amazing connections are waiting</span>
                      </div>

                      <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight drop-shadow-lg">
                        Explore Nepal <br/>
                        Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8A25E] via-[#E4D1AC] to-[#B69150]">Real People</span>
                      </h1>

                      {/* Integrated cinematic Search Bar */}
                      <div className="relative max-w-md shadow-2xl pt-2">
                        <Search className="w-5 h-5 text-[#C8A25E] absolute left-5 top-1/2 transform -translate-y-1/2 mt-1" />
                        <input 
                          type="text" 
                          placeholder="Where are you going?" 
                          className="w-full bg-black/55 backdrop-blur-md border border-white/10 hover:border-[#C8A25E]/40 focus:border-[#C8A25E] rounded-full h-12 pl-12 pr-10 text-xs text-white placeholder-white/60 focus:outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[10px] uppercase font-bold text-[#C8A25E] hover:underline mt-1"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
 
                  {/* Indicator slider dots */}
                  <div className="absolute bottom-5 right-8 flex gap-1.5 z-20">
                    {[0, 1, 2].map(idx => (
                      <button 
                        key={idx}
                        onClick={() => setActiveHeroSlide(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#C8A25E] focus-visible:ring-offset-2 focus-visible:ring-offset-black focus:outline-none ${activeHeroSlide === idx ? 'bg-[#C8A25E] w-4' : 'bg-white/30 hover:bg-white/50'}`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </section>

                {/* 5. EXPLORE CURATED NEPAL EXPERIENCES */}
                <section id="activities-section" className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#2A2D31]/40 pb-4">
                    <div>
                      <h2 className="text-xl md:text-3xl font-extrabold text-white flex items-center gap-2">
                        📍 Explore Nepal Experiences
                      </h2>
                      <p className="text-xs text-[#8E9299] mt-1">Book direct curated local adventures guided by trusted hosts.</p>
                    </div>
                    <button 
                      onClick={() => showToast('Activities directory synced!', 'success')}
                      className="text-xs font-bold text-[#C8A25E] hover:underline"
                    >
                      Explore All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {activitiesLoading ? (
                      [1, 2, 3].map(i => (
                        <div key={i} className="aspect-[4/3] bg-[#17191C] border border-[#2A2D31]/40 rounded-3xl animate-pulse"></div>
                      ))
                    ) : (
                      activities.map((act, index) => {
                        const tags = ["TRENDING", "POPULAR", "TOP RATED", "NEW"];
                        const tag = tags[index % tags.length];
                        return (
                          <div 
                            key={act.id} 
                            onClick={() => { setSelectedCategory((act as any).category || 'All'); showToast(`Filtered by ${act.title}`, 'success'); }} 
                            className="group relative aspect-[4/3] rounded-[32px] overflow-hidden border border-[#2A2D31]/40 bg-[#17191C] hover:border-[#C8A25E]/40 hover:shadow-2xl hover:shadow-[#C8A25E]/5 transition-all duration-500 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#C8A25E]"
                          >
                            <img 
                              src={act.imageUrl || act.image} 
                              alt={act.title} 
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-700" 
                              loading="lazy" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent z-10" />
                            
                            {/* Top tag */}
                            <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black tracking-widest text-[#C8A25E] border border-white/10 uppercase z-20">
                              {tag}
                            </span>

                            {/* Overlaid Bottom Details */}
                            <div className="absolute bottom-5 left-5 right-5 z-20 space-y-2 text-left">
                              <h4 className="text-lg font-extrabold text-white leading-tight group-hover:text-[#C8A25E] transition-colors drop-shadow-md">
                                {act.title}
                              </h4>
                              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] text-white/70">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#C8A25E]" /> {act.duration}
                                </span>
                                <span className="font-bold text-[#C8A25E]">
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
                <section className="bg-gradient-to-br from-[#1A1814] to-[#17191C] border border-[#C8A25E]/20 rounded-[32px] p-8 md:p-10 text-left relative overflow-hidden my-12">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8A25E]/5 rounded-full blur-3xl"></div>
                  <div className="max-w-xl space-y-4">
                    <span className="text-[10px] uppercase tracking-widest font-black text-[#C8A25E] flex items-center gap-2"><Coins className="w-4 h-4" /> Earn Income as a SATHI Companion</span>
                    <h3 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">How much can you earn guiding with us?</h3>
                    <p className="text-xs text-[#8E9299] leading-relaxed font-light max-w-lg">Set your own rates, host on your calendar, share Nepal's local flavor with global digital nomads, and earn. Calculate your potential earnings below!</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10">
                    {/* Input Sliders */}
                    <div className="space-y-8 self-center">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8E9299] font-medium">Your Hourly Rate</span>
                          <span className="text-white font-bold font-mono text-sm">NPR {calcHourlyRate}/hr</span>
                        </div>
                        <input 
                          type="range" 
                          min="500" 
                          max="3000" 
                          step="100"
                          value={calcHourlyRate}
                          onChange={(e) => setCalcHourlyRate(Number(e.target.value))}
                          className="w-full accent-[#C8A25E] h-1.5 bg-[#2A2D31] rounded-lg cursor-pointer"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#8E9299] font-medium">Weekly Hours Committed</span>
                          <span className="text-white font-bold font-mono text-sm">{calcWeeklyHours} hrs/week</span>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="40" 
                          step="1"
                          value={calcWeeklyHours}
                          onChange={(e) => setCalcWeeklyHours(Number(e.target.value))}
                          className="w-full accent-[#C8A25E] h-1.5 bg-[#2A2D31] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Calculated Earnings display */}
                    <div className="bg-black/45 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-center text-center md:text-left space-y-6 relative shadow-inner">
                      <div className="grid grid-cols-2 gap-6 divide-x divide-white/10">
                        <div className="text-center">
                          <span className="text-[10px] uppercase text-[#8E9299] tracking-wider block font-bold">Est. Weekly</span>
                          <span className="text-xl md:text-2xl font-black text-white font-mono mt-1 block">NPR {estWeeklyEarnings.toLocaleString()}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] uppercase text-[#C8A25E] tracking-wider block font-black">Est. Monthly</span>
                          <span className="text-2xl md:text-3xl font-black text-[#C8A25E] font-mono mt-1 block">NPR {estMonthlyEarnings.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => { setAuthMode('guide'); showToast("Initiating companion registration portal!", "success"); }}
                        className="w-full py-3 bg-[#C8A25E] hover:bg-[#B69150] text-[#0F1113] rounded-2xl text-xs font-black uppercase tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-[#C8A25E]"
                      >
                        Apply to Become a SATHI Guide
                      </button>
                    </div>
                  </div>
                </section>

                {/* 7. INSTAGRAM-STYLE COMMUNITY FEED */}
                <section id="moments-section" className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#2A2D31]/40 pb-4">
                    <div>
                      <h2 className="text-xl md:text-3xl font-extrabold text-white">📸 Community Moments Feed</h2>
                      <p className="text-xs text-[#8E9299] mt-1">Live adventures shared by travelers and companion guides in Kathmandu valley.</p>
                    </div>
                    <button onClick={() => showToast('Social Moments feed fully connected!', 'success')} className="text-xs font-bold text-[#C8A25E] hover:underline">View All Feed</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 0, user: 'Sarah', companion: 'Safal', text: 'Stunning hike up the Sarangkot ridge at dawn. Safal knew the exact photography angles!', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop', userAvatar: 'https://ui-avatars.com/api/?name=Sarah&background=random', location: 'Pokhara' },
                      { id: 1, user: 'Marcus', companion: 'Priya', text: 'Amazing food crawl through Patan back alleys. Priya helped us discover authentic Newari culinary!', image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800&auto=format&fit=crop', userAvatar: 'https://ui-avatars.com/api/?name=Marcus&background=random', location: 'Patan Durbar' },
                      { id: 2, user: 'Elena', companion: 'Sita', text: 'Sita guided us through traditional clay molding workshops at Bhaktapur square. Learned so much!', image: 'https://images.unsplash.com/photo-1529156069898-49953eb1b5ce?q=80&w=800&auto=format&fit=crop', userAvatar: 'https://ui-avatars.com/api/?name=Elena&background=random', location: 'Bhaktapur' }
                    ].map((post) => (
                      <div 
                        key={post.id} 
                        className="group relative aspect-[4/5] rounded-[32px] overflow-hidden border border-[#2A2D31]/40 bg-[#17191C] hover:border-[#C8A25E]/40 hover:shadow-2xl transition-all duration-500"
                      >
                        {/* Background Post Image */}
                        <img 
                          src={post.image} 
                          alt="Adventure Moment" 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-103 transition-transform duration-700" 
                          loading="lazy" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

                        {/* Top Location Pin Badge */}
                        <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] text-white flex items-center gap-1 border border-white/10 z-20">
                          <MapPin className="w-3 h-3 text-[#C8A25E]" /> {post.location}
                        </span>

                        {/* Bottom Info Overlay */}
                        <div className="absolute bottom-5 left-5 right-5 z-20 space-y-3 text-left">
                          <div className="flex items-center gap-2">
                            <img src={post.userAvatar} alt={post.user} className="w-7 h-7 rounded-full border-2 border-[#C8A25E]" />
                            <span className="text-xs font-black text-white drop-shadow-md">
                              {post.user} <span className="font-light text-white/70">with {post.companion}</span>
                            </span>
                          </div>

                          <p className="text-[11px] text-white/80 leading-relaxed font-light line-clamp-2 drop-shadow-sm">
                            "{post.text}"
                          </p>

                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                            <button 
                              onClick={() => handleToggleLikeMoment(post.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 ${momentLiked[post.id] ? 'text-red-500' : 'text-white'}`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${momentLiked[post.id] ? 'fill-current' : ''}`} /> {momentLikes[post.id]}
                            </button>
                            <span className="text-white/50">Shared 1d ago</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 8. COMMISSION-SUPPORTING PARTNERS ROW */}
                <section className="space-y-6">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#C8A25E]">SATHI Co-Experiences</span>
                    <h3 className="text-xl md:text-2xl font-extrabold text-white">Our Local Experience Partners</h3>
                    <p className="text-xs text-[#8E9299]">Book companion activities and enjoy exclusive discounts & commissions at these fine spots.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {partners.slice(0, 8).map((partner, i) => (
                      <div key={partner.id || i} className="bg-[#1E2124]/40 border border-[#2A2D31]/50 p-4 rounded-xl text-center space-y-1.5 hover:border-[#C8A25E]/30 transition-all">
                        <div className="w-10 h-10 bg-[#C8A25E]/15 rounded-full flex items-center justify-center mx-auto text-[#C8A25E] font-bold">
                          {partner.name.substring(0, 2)}
                        </div>
                        <h4 className="text-xs font-bold text-white block truncate">{partner.name}</h4>
                        <span className="text-[9px] text-[#C8A25E] bg-[#C8A25E]/10 px-2 py-0.5 rounded-full font-bold block w-max mx-auto">{partner.disc}</span>
                        <span className="text-[9px] text-[#8E9299] block">{partner.loc}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 9. PREMIUM SINGLE TRUST & SAFETY STATEMENT */}
                <section className="bg-gradient-to-br from-[#17191C] to-[#0F1113] border border-[#2A2D31]/40 rounded-[32px] p-8 md:p-12 text-center md:text-left shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#C8A25E]/5 rounded-full blur-3xl"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-3 max-w-xl text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#C8A25E]/10 rounded-full flex items-center justify-center text-[#C8A25E]">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">SATHI Shield Protection</h3>
                      </div>
                      <p className="text-xs text-[#8E9299] leading-relaxed font-light">
                        Every companion buddy is fully ID-verified, background screened, and managed under strict Nepal Tourism safety guidelines. Your funds are protected in escrow and disbursed only after your adventure completes.
                      </p>
                      <span className="text-lg font-black text-[#C8A25E] block tracking-tight pt-1">
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
                <footer className="pt-8 border-t border-[#2A2D31]/40 text-left space-y-8 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A25E]">Company</h4>
                      <ul className="space-y-1.5 text-xs text-[#8E9299]">
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('about'); }} className="hover:text-white transition-colors">About SATHI</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("Platform careers portal coming soon", "info"); }} className="hover:text-white transition-colors">Careers</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("SATHI Blog coming soon", "info"); }} className="hover:text-white transition-colors">Safety Blog</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('partner'); }} className="hover:text-white transition-colors">Partnership Hub</a></li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Community</h4>
                      <ul className="space-y-1.5 text-xs text-[#8E9299]">
                        <li><a href="#" onClick={(e) => { e.preventDefault(); const momentSec = document.getElementById('moments-section'); momentSec?.scrollIntoView({behavior:'smooth'}); }} className="hover:text-white transition-colors">Shared Adventures</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("Community guidelines directory loading...", "info"); }} className="hover:text-white transition-colors">Community Rules</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("Local events calendar loading...", "info"); }} className="hover:text-white transition-colors">Local Events</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('guide'); }} className="hover:text-white transition-colors">Become SATHI Companion</a></li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Security & Help</h4>
                      <ul className="space-y-1.5 text-xs text-[#8E9299]">
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("Opening Help Desk...", "info"); }} className="hover:text-white transition-colors">24/7 Support Desk</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("Identity Verification rules page loaded", "info"); }} className="hover:text-white transition-colors">Identity Verification</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); setShowSOS(true); }} className="hover:text-white transition-colors">Emergency Protocol</a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); showToast("Terms of service document", "info"); }} className="hover:text-white transition-colors">Terms of Service</a></li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A25E]">Location</h4>
                      <p className="text-xs text-[#8E9299] leading-relaxed font-light">SATHI Experiences Inc.<br/>Thamel High Street, Ward 26<br/>Kathmandu, Nepal</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-[#2A2D31]/30 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8E9299]">
                    <span>&copy; {new Date().getFullYear()} SATHI. Nepal Social Experiences Marketplace. All Rights Reserved.</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-[#C8A25E]" /> Managed under Nepal Tourism Guidelines</span>
                  </div>
                </footer>

              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <DashboardTab />
              </motion.div>
            )}

            {activeTab === 'partner' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <PartnerDashboard />
              </motion.div>
            )}

            {activeTab === 'bookings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left">
                <h2 className="text-2xl font-extrabold text-white mb-6 border-b border-[#2A2D31]/40 pb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[#C8A25E]" /> My Companion Bookings
                </h2>
                {bookings.filter(b => b.userId === currentUser?.id).length > 0 ? (
                  <div className="grid gap-4">
                    {bookings.filter(b => b.userId === currentUser?.id).map(booking => {
                      const companion = companions.find(c => c.id === booking.companionId);
                      const isCancellable = booking.status === 'pending' || booking.status === 'confirmed';
                      return (
                        <div key={booking.id} className="bg-[#17191C] border border-[#2A2D31]/40 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-white mb-1">Booking with {companion?.name || 'Companion'}</h3>
                            <p className="text-xs text-[#8E9299]">Scheduled: {booking.date} at {booking.time}</p>
                            <p className="text-xs text-[#8E9299] mt-0.5">Duration: {booking.duration} hours {booking.participants > 1 ? `x ${booking.participants} persons` : ''}</p>
                            {booking.meetingPoint && <p className="text-xs text-[#8E9299]">Meeting Point: {booking.meetingPoint}</p>}
                          </div>
                          <div className="text-right flex flex-col items-end gap-2 shrink-0">
                            <span className="block font-bold text-[#C8A25E]">NPR {booking.totalPrice.toFixed(2)}</span>
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
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#17191C] border border-[#2A2D31]/40 p-8 rounded-2xl flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#1E2124] border border-[#2A2D31] flex items-center justify-center">
                      <Star className="w-8 h-8 text-[#8E9299]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">No active bookings</h3>
                      <p className="text-xs text-[#8E9299] mt-1">You do not have any upcoming experiences scheduled with SATHI guides yet.</p>
                    </div>
                    <button onClick={() => setActiveTab('explore')} className="mt-4 px-6 py-2.5 bg-[#C8A25E] text-[#0F1113] rounded-xl font-bold hover:bg-[#B69150] transition-colors text-xs uppercase tracking-wider">
                      Discover Companions
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'messages' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <MessagesTab onOpenAuth={setAuthMode} initialCompanionId={activeChatCompanionId} />
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl mx-auto text-left">
                <h2 className="text-3xl font-light text-white mb-6 border-b border-[#2A2D31] pb-4">About <span className="font-bold">SATHI<span className="text-[#C8A25E]">.</span></span></h2>
                
                <div className="bg-[#17191C] border border-[#2A2D31] p-8 rounded-3xl space-y-6 text-[#8E9299] leading-relaxed">
                  <p className="text-lg text-white">
                    SATHI is Nepal's elite social marketplace connecting travelers with KYC-verified, trusted local guides for non-dating cultural exchange, outdoor hiking, and Lake Pokhara adventure.
                  </p>
                  <p className="font-light text-xs">
                    We ensure transparent hourly billing in NPR, zero hidden commission fees, complete safety backup checks, and localized experiences that make you feel at home in our glorious mountains.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ==================== RESPONSIVE BOTTOM SIDEBAR FOR TABLETS/MOBILE (xl:hidden) ==================== */}
            <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#2A2D31]/40 pt-10 mt-12">
              {/* Upcoming Events */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Upcoming Group Events</h4>
                  <button onClick={() => showToast('Events calendar loaded', 'info')} className="text-[10px] text-[#C8A25E] font-bold hover:underline">View All</button>
                </div>

                <div className="space-y-3.5">
                  {eventsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-16 bg-[#17191C] rounded-xl"></div>
                      <div className="h-16 bg-[#17191C] rounded-xl"></div>
                    </div>
                  ) : (
                    events.slice(0, 2).map((event) => {
                      const dateObj = new Date(event.date);
                      const month = dateObj.toLocaleString('en-US', { month: 'short' });
                      const day = dateObj.getDate();
                      return (
                        <div key={event.id} className="bg-[#17191C] border border-[#2A2D31]/40 p-4 rounded-2xl flex gap-3.5 hover:border-[#C8A25E]/40 transition-colors text-left relative group">
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-[#1E2124] border border-[#2A2D31]/60 flex flex-col items-center justify-center">
                            <span className="text-[#C8A25E] text-[9px] font-extrabold uppercase leading-none">{month}</span>
                            <span className="text-white font-black text-sm mt-0.5 leading-none">{day}</span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <h5 className="font-bold text-white text-xs truncate group-hover:text-[#C8A25E] transition-colors">{event.title}</h5>
                            <p className="text-[10px] text-[#8E9299] flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-[#C8A25E]" /> {event.location}</p>
                            <p className="text-[10px] text-[#8E9299] flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</p>
                            
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[9px] text-[#8E9299]"><span className="text-white font-semibold">{event.spots}</span> spots left</span>
                              <button 
                                onClick={() => {
                                  if (!currentUser) setAuthMode('login');
                                  else showToast(`Successfully reserved spot in ${event.title}!`, 'success');
                                }} 
                                className="px-2.5 py-1 bg-[#1E2124] text-white border border-[#2A2D31]/60 text-[9px] font-bold rounded-lg hover:bg-[#C8A25E] hover:text-[#0F1113] hover:border-[#C8A25E] transition-colors"
                              >
                                Join
                              </button>
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
                <div className="bg-[#17191C]/80 border border-[#2A2D31]/40 rounded-2xl p-4 text-left space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">Why Choose SATHI?</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: "KYC ID Verification", desc: "All companion identities strictly checked" },
                      { title: "Escrow Secure Payments", desc: "Funds held safely in NPR currency" },
                      { title: "Emergency Support Desk", desc: "SOS location checkins and helpline" },
                      { title: "No Matching Fees", desc: "Explore companion profiles entirely free" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-[#C8A25E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block text-[11px] leading-tight">{item.title}</span>
                          <span className="text-[9px] text-[#8E9299] block mt-0.5 font-light">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Impact widget */}
                <div className="bg-[#17191C]/80 border border-[#2A2D31]/40 rounded-2xl p-4 text-left space-y-3 relative overflow-hidden">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">Your Social Impact</h4>
                  <p className="text-[10px] text-[#8E9299] font-light">Connections and cultural adventures built by you this month in Nepal.</p>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1.5">
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-base font-black text-white block">12</span>
                      <span className="text-[8px] uppercase tracking-wider text-[#8E9299] block font-semibold">Matched</span>
                    </div>
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-base font-black text-[#C8A25E] block">5</span>
                      <span className="text-[8px] uppercase tracking-wider text-[#8E9299] block font-semibold">Trips</span>
                    </div>
                    <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-base font-black text-white block">3</span>
                      <span className="text-[8px] uppercase tracking-wider text-[#8E9299] block font-semibold">Friends</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>

          {/* ==================== RIGHT SIDEBAR (DASHBOARD WIDGETS) ==================== */}
          <aside className="hidden xl:block col-span-3 p-6 border-l border-[#2A2D31]/40 space-y-6 bg-[#0F1113] h-max sticky top-[72px]">
            
            {/* 1. UPCOMING EVENTS (MEETUP INSPIRED) */}
            <div id="events-section" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Upcoming Group Events</h4>
                <button onClick={() => showToast('Events calendar loaded', 'info')} className="text-[10px] text-[#C8A25E] font-bold hover:underline">View All</button>
              </div>

              <div className="space-y-3.5">
                {eventsLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-16 bg-[#17191C] rounded-xl"></div>
                    <div className="h-16 bg-[#17191C] rounded-xl"></div>
                  </div>
                ) : (
                  events.slice(0, 3).map((event) => {
                    const dateObj = new Date(event.date);
                    const month = dateObj.toLocaleString('en-US', { month: 'short' });
                    const day = dateObj.getDate();
                    return (
                      <div key={event.id} className="bg-[#17191C] border border-[#2A2D31]/40 p-4 rounded-2xl flex gap-3.5 hover:border-[#C8A25E]/40 transition-colors text-left relative group">
                        {/* Event Date badge */}
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-[#1E2124] border border-[#2A2D31]/60 flex flex-col items-center justify-center">
                          <span className="text-[#C8A25E] text-[9px] font-extrabold uppercase leading-none">{month}</span>
                          <span className="text-white font-black text-sm mt-0.5 leading-none">{day}</span>
                        </div>

                        {/* Event details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-bold text-white text-xs truncate group-hover:text-[#C8A25E] transition-colors">{event.title}</h5>
                          <p className="text-[10px] text-[#8E9299] flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-[#C8A25E]" /> {event.location}</p>
                          <p className="text-[10px] text-[#8E9299] flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</p>
                          
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[9px] text-[#8E9299]"><span className="text-white font-semibold">{event.spots}</span> spots left</span>
                            <button 
                              onClick={() => {
                                if (!currentUser) setAuthMode('login');
                                else showToast(`Successfully reserved spot in ${event.title}!`, 'success');
                              }} 
                              className="px-2.5 py-1 bg-[#1E2124] text-white border border-[#2A2D31]/60 text-[9px] font-bold rounded-lg hover:bg-[#C8A25E] hover:text-[#0F1113] hover:border-[#C8A25E] transition-colors"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. BECOME A COMPANION BANNER */}
            <div className="bg-[#1E2124]/40 border border-[#2A2D31]/50 rounded-2xl p-5 text-left relative overflow-hidden flex flex-col justify-between h-44">
              <div className="space-y-1.5 z-10">
                <span className="text-[9px] uppercase tracking-widest text-[#C8A25E] font-bold">Guiding Careers</span>
                <h4 className="text-sm font-bold text-white">Become a SATHI Companion Mating Host</h4>
                <p className="text-[10px] text-[#8E9299] leading-relaxed">Host experiences, meet world travelers, and earn secure NPR rates.</p>
              </div>
              <button 
                onClick={() => { setAuthMode('guide'); }}
                className="w-full py-2 bg-[#C8A25E] hover:bg-[#B69150] text-[#0F1113] rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md z-10"
              >
                Apply to Host
              </button>
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-[#C8A25E]/5 rounded-full blur-xl"></div>
            </div>

            {/* 3. WHY CHOOSE SATHI FEATURE PANEL */}
            <div className="bg-[#17191C]/80 border border-[#2A2D31]/40 rounded-2xl p-4 text-left space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">Why Choose SATHI?</h4>
              
              <div className="space-y-2.5">
                {[
                  { title: "KYC ID Verification", desc: "All companion identities strictly checked" },
                  { title: "Escrow Secure Payments", desc: "Funds held safely in NPR currency" },
                  { title: "Emergency Support Desk", desc: "SOS location checkins and helpline" },
                  { title: "No Matching Fees", desc: "Explore companion profiles entirely free" }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-[#C8A25E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block text-[11px] leading-tight">{item.title}</span>
                      <span className="text-[9px] text-[#8E9299] block mt-0.5 font-light">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. USER CONNECTIONS IMPACT WIDGET */}
            <div className="bg-gradient-to-tr from-[#1E2124] to-[#17191C] border border-[#2A2D31]/40 rounded-2xl p-4 text-left space-y-3 relative overflow-hidden">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Your Social Impact</h4>
              <p className="text-[10px] text-[#8E9299] font-light">Connections and cultural adventures built by you this month in Nepal.</p>
              
              <div className="grid grid-cols-3 gap-2 text-center pt-1.5">
                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-base font-black text-white block">12</span>
                  <span className="text-[8px] uppercase tracking-wider text-[#8E9299] block font-semibold">Matched</span>
                </div>
                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-base font-black text-[#C8A25E] block">5</span>
                  <span className="text-[8px] uppercase tracking-wider text-[#8E9299] block font-semibold">Trips</span>
                </div>
                <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-base font-black text-white block">3</span>
                  <span className="text-[8px] uppercase tracking-wider text-[#8E9299] block font-semibold">Friends</span>
                </div>
              </div>

              {/* Decorative Vector Path (Matches bottom ambient waves) */}
              <div className="h-6 w-full pt-2 opacity-30">
                <svg className="w-full h-full text-[#C8A25E]" viewBox="0 0 100 20" fill="none" preserveAspectRatio="none">
                  <path d="M0 10 C 25 15, 25 5, 50 10 C 75 15, 75 5, 100 10 L 100 20 L 0 20 Z" fill="currentColor"/>
                </svg>
              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* ==================== MOBILE VIEWPORT (lg:hidden) ==================== */}
      <div className="lg:hidden flex flex-col flex-1 min-h-screen relative bg-[#0F1113] pb-24 text-left">
        
        {/* Render Mobile Tab Home */}
        {mobileTab === 'home' && (
          <div className="space-y-6">
            {/* Header with Search Bar */}
            <div className="flex items-center justify-between gap-3 p-4 bg-[#0F1113] border-b border-white/5 h-[62px]">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[#C8A25E] flex items-center justify-center font-bold text-[#0F1113] text-base">S</div>
                <span className="text-lg font-black tracking-tight text-white hidden sm:inline">SATHI</span>
              </div>
              
              {/* Fully rounded Glassmorphism Search Bar */}
              <div className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 text-[#C8A25E] absolute left-3" />
                <input 
                  type="text" 
                  placeholder="Where are you going?" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-9 bg-[#1E2124]/60 backdrop-blur-md rounded-full border border-white/10 text-xs text-white focus:outline-none focus:border-[#C8A25E] transition-all"
                />
                <button 
                  onClick={() => showToast('Search filters coming soon!', 'info')}
                  className="absolute right-3 text-[#8E9299] hover:text-[#C8A25E] transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Bell notification */}
                <div onClick={() => showToast('3 unread alerts synchronizing...', 'info')} className="relative cursor-pointer w-9 h-9 rounded-full bg-[#1E2124] flex items-center justify-center border border-white/10">
                  <Bell className="w-4 h-4 text-white" />
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#C8A25E] text-[#0F1113] font-black text-[9px] rounded-full flex items-center justify-center">3</span>
                </div>
                {/* User profile with golden border */}
                <img 
                  src={currentUser?.avatar || "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?q=80&w=300&auto=format&fit=crop"} 
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#C8A25E] cursor-pointer" 
                  alt="Profile"
                  onClick={() => { setMobileTab('profile'); }}
                />
              </div>
            </div>

            {/* Instagram-style Stories */}
            <div className="px-4 py-1 bg-[#0F1113]">
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1 snap-x">
                {/* Your Story */}
                <div 
                  onClick={() => showToast('Uploading companion story...', 'info')} 
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 snap-start"
                >
                  <div className="relative w-[68px] h-[68px] rounded-full border-2 border-dashed border-[#C8A25E]/60 flex items-center justify-center bg-[#17191C]">
                    <span className="text-lg font-bold text-[#C8A25E]">+</span>
                  </div>
                  <span className="text-[10px] text-[#8E9299] font-bold">Your Story</span>
                </div>
                
                {/* Dynamic Stories based on companions */}
                {fetchedStories.map((st, i) => (
                  <div 
                    key={st.id || i} 
                    onClick={() => setViewingStory(st)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 snap-start"
                  >
                    <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#C8A25E] via-pink-600 to-purple-600">
                      <div className="p-[1.5px] rounded-full bg-[#0F1113]">
                        <img src={st.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150'} className="w-[60px] h-[60px] rounded-full object-cover" alt={st.userName} />
                      </div>
                      <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-[#0F1113] rounded-full" />
                    </div>
                    <span className="text-[10px] text-white font-bold truncate max-w-[65px]">{st.userName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Companions for You */}
            <div className="px-4 py-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#8E9299]">Top Companions for You</h3>
                <span className="text-xs font-bold text-[#C8A25E] cursor-pointer" onClick={() => setMobileTab('explore')}>See all</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1 snap-x">
                {companions.slice(0, 4).map((comp) => (
                  <div 
                    key={comp.id} 
                    onClick={() => handleViewCompanion(comp)}
                    className="shrink-0 w-44 bg-[#17191C] rounded-[24px] border border-white/5 overflow-hidden shadow-xl flex flex-col snap-start cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left"
                  >
                    <div className="relative h-44 bg-[#1E2124]">
                      <img src={comp.imageUrl} className="w-full h-full object-cover" alt={comp.name} />
                      <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] text-[#C8A25E] font-extrabold flex items-center gap-0.5 border border-[#C8A25E]/20">
                        VERIFIED
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(comp.id); showToast(favorites.includes(comp.id) ? "Removed from saved" : "Saved companion!", "success"); }}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${favorites.includes(comp.id) ? 'text-red-500 fill-current' : 'text-white'}`} />
                      </button>
                    </div>
                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-white truncate flex items-center gap-1">
                          {comp.name}
                          <span className="text-[#C8A25E] text-[12px]">✔</span>
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] text-[#8E9299]">
                          <MapPin className="w-3 h-3 text-[#C8A25E]" />
                          <span className="truncate">{comp.location}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#C8A25E] font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{comp.rating} (42)</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <div>
                          <p className="text-[8px] text-[#8E9299] uppercase font-bold leading-none">Rate</p>
                          <p className="text-xs font-black text-[#C8A25E] mt-0.5">NPR {comp.hourlyRate}/hr</p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#C8A25E] flex items-center justify-center text-[#0F1113] shadow-md">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Community Feed */}
            <div className="px-4 py-1 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#8E9299]">Community Feed</h3>
                <span className="text-xs font-bold text-[#C8A25E] cursor-pointer" onClick={() => showToast('All community feeds synchronized!', 'success')}>See all</span>
              </div>
              
              <div className="space-y-4">
                {fetchedStories.map((post, idx) => {
                  const isLiked = momentLiked[post.id];
                  const currentLikesCount = (momentLikes[post.id] || post.likes || 15) + (isLiked ? 1 : 0);
                  
                  return (
                    <div key={post.id || idx} className="bg-[#17191C] border border-white/5 rounded-3xl overflow-hidden shadow-lg flex flex-col text-left">
                      {/* Top profile header */}
                      <div className="p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <img src={post.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150'} className="w-8 h-8 rounded-full object-cover border border-[#C8A25E]" alt={post.userName} />
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">{post.userName}</span>
                            <span className="text-[9px] text-[#8E9299] flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-[#C8A25E]" /> with companion {post.companionName}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-[#C8A25E]/10 text-[#C8A25E] font-extrabold px-2 py-0.5 rounded-full border border-[#C8A25E]/20">
                          🌟 SATHI Co-Experience
                        </span>
                      </div>
                      
                      {/* Large Portrait Image */}
                      <div className="relative aspect-[4/4.5] w-full bg-[#1E2124]">
                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Adventure moment" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 flex flex-col justify-end">
                          <p className="text-xs text-white/95 leading-relaxed font-medium drop-shadow">{post.caption}</p>
                        </div>
                      </div>
                      
                      {/* Bottom action panel */}
                      <div className="p-3 flex justify-between items-center border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleToggleLikeMoment(post.id)}
                            className="flex items-center gap-1.5 text-white active:scale-90 transition-transform"
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-current' : 'text-white/80 hover:text-red-500'}`} />
                            <span className="text-[11px] font-bold">{currentLikesCount}</span>
                          </button>
                          <button 
                            onClick={() => showToast('Comments are synchronized in peer-to-peer chat!', 'info')}
                            className="flex items-center gap-1.5 text-white/80 hover:text-[#C8A25E] transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-[11px] font-bold">{post.comments || 5}</span>
                          </button>
                        </div>
                        <span className="text-[9px] text-[#5A5E66] font-bold">{post.timeAgo || '2h ago'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activities Section */}
            <div className="px-4 py-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#8E9299]">Explore by Activities</h3>
                <span className="text-xs font-bold text-[#C8A25E] cursor-pointer" onClick={() => setMobileTab('explore')}>See all</span>
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
                    className="flex items-center gap-2 bg-[#17191C] border border-white/5 hover:border-[#C8A25E]/40 px-3.5 py-2.5 rounded-xl cursor-pointer shrink-0 transition-all duration-200"
                  >
                    <span className="text-base">{act.icon}</span>
                    <span className="text-xs font-bold text-[#E0E0E0]">{act.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Experiences */}
            <div className="px-4 py-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#8E9299]">Popular Experiences</h3>
                <span className="text-xs font-bold text-[#C8A25E] cursor-pointer" onClick={() => showToast('Opening experience catalog...', 'info')}>See all</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-1 snap-x">
                {activities.slice(0, 6).map((exp, i) => (
                  <div 
                    key={exp.id || i} 
                    className="shrink-0 w-56 bg-[#17191C] border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col snap-start cursor-pointer hover:border-[#C8A25E]/30 transition-all"
                    onClick={() => showToast(`Opening ${exp.title} details...`, 'info')}
                  >
                    <div className="relative h-28 bg-[#1E2124]">
                      <img src={exp.imageUrl || exp.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600'} className="w-full h-full object-cover" alt={exp.title} />
                      <span className="absolute top-2 left-2 bg-[#C8A25E] text-[#0F1113] text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {i === 0 ? 'TRENDING' : i === 1 ? 'POPULAR' : 'TOP RATED'}
                      </span>
                    </div>
                    <div className="p-3 space-y-1.5 text-left">
                      <h4 className="text-xs font-bold text-white truncate">{exp.title}</h4>
                      <p className="text-[10px] text-[#8E9299] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#C8A25E]" />
                        {exp.duration} • {exp.companionCount || 10} buddies
                      </p>
                      <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                        <span className="text-xs font-black text-[#C8A25E]">NPR {exp.avgPrice}</span>
                        <div className="flex items-center gap-0.5 text-[10px] text-[#C8A25E] font-bold">
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
                <h3 className="text-xs font-black uppercase tracking-wider text-[#8E9299]">Upcoming Events</h3>
                <span className="text-xs font-bold text-[#C8A25E] cursor-pointer" onClick={() => showToast('All events loaded', 'success')}>See all</span>
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
                    <div key={ev.id || idx} className="bg-[#17191C] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="shrink-0 w-11 h-11 rounded-xl bg-[#1E2124] flex flex-col items-center justify-center border border-white/10">
                          <span className="text-[#C8A25E] text-[8px] font-black leading-none uppercase">{monthStr}</span>
                          <span className="text-white font-black text-sm leading-none mt-1">{dayStr}</span>
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-bold text-white truncate max-w-[160px]">{ev.title}</h5>
                          <p className="text-[9px] text-[#8E9299] truncate max-w-[160px]">{ev.location} • {ev.time || "10:00 AM"}</p>
                          <span className="text-[8px] text-[#C8A25E] font-bold">{attendeesCount} buddies attending</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => showToast(`Successfully joined "${ev.title}"!`, 'success')}
                        className="px-3 py-1.5 bg-[#C8A25E] hover:bg-[#B69150] text-[#0F1113] text-[9px] font-black rounded-lg uppercase tracking-wider transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Become a Companion */}
            <div className="px-4 py-1 pb-6">
              <div className="relative rounded-[24px] overflow-hidden min-h-[160px] border border-white/5 flex flex-col justify-end p-5 text-left bg-[#17191C]">
                <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover brightness-[0.4]" alt="Become a Companion" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
                <div className="relative z-10 space-y-2.5">
                  <h3 className="text-sm font-extrabold text-white leading-tight">Become a SATHI Companion</h3>
                  <p className="text-[10px] text-gray-300 leading-relaxed max-w-[240px]">Share your favorite local spots, guide travelers, and earn up to <span className="text-white font-bold">NPR 15,000/week</span> on your own schedule.</p>
                  <button 
                    onClick={() => { setAuthMode('guide'); setIsGuide(true); }}
                    className="w-max px-4 py-2 bg-[#C8A25E] hover:bg-[#B69150] active:scale-95 text-[#0F1113] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
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
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#0F1113] border-b border-white/5">
              <button onClick={() => setMobileTab('home')} className="p-2 text-[#8E9299] hover:text-white rounded-full bg-[#1E2124] text-xs font-black">
                ← Home
              </button>
              <span className="text-sm font-extrabold text-white tracking-wide uppercase">Companions</span>
              <button onClick={() => { setSelectedCategory('All'); showToast('Filters reset', 'success'); }} className="p-2 text-[#C8A25E] hover:underline text-xs font-bold">
                Reset
              </button>
            </div>

            {/* Categories scroll */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-1">
              {['All', 'Hiking', 'Coffee', 'Photography', 'Culture', 'Trekking', 'Food'].map((cat) => (
                <button 
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); showToast(`Viewing ${cat} buddies`, 'info'); }}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-black transition-all shrink-0 ${selectedCategory === cat ? 'bg-[#C8A25E] text-[#0F1113]' : 'bg-[#17191C] text-[#8E9299] border border-white/5'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Companions vertical cards feed */}
            <div className="px-4 space-y-6 pb-8">
              {filteredCompanions.length > 0 ? (
                filteredCompanions.map((comp) => (
                  <div 
                    key={comp.id} 
                    onClick={() => handleViewCompanion(comp)}
                    className="relative aspect-[4/4.5] rounded-[28px] overflow-hidden border border-white/5 shadow-2xl bg-[#17191C] cursor-pointer"
                  >
                    <img src={comp.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt={comp.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent"></div>
                    
                    <span className="absolute top-4 left-4 bg-[#C8A25E] text-[#0F1113] text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      VERIFIED
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(comp.id); }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(comp.id) ? 'text-red-500 fill-current' : 'text-white'}`} />
                    </button>

                    <div className="absolute bottom-4 inset-x-4 bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-left flex justify-between items-center">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-white flex items-center gap-1 leading-tight">
                          {comp.name} <span className="text-[#C8A25E]">✔</span>
                        </h4>
                        <p className="text-[9px] text-white/80">{comp.interests[0] || 'SATHI Companion'}</p>
                        <div className="flex items-center gap-1 text-[9px] text-[#C8A25E] font-black">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{comp.rating} (128)</span>
                        </div>
                        <p className="text-[9px] text-[#8E9299] font-light">{comp.location}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] text-[#8E9299] block uppercase">From</span>
                        <span className="text-xs font-black text-[#C8A25E] font-mono">NPR {comp.hourlyRate}</span>
                        <span className="text-[8px] text-[#8E9299] block">/hr</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-[#8E9299] space-y-2 bg-[#17191C] rounded-2xl border border-white/5">
                  <p className="text-xs">No matching companions found.</p>
                  <button onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }} className="text-xs text-[#C8A25E] font-bold hover:underline">Clear Filters</button>
                </div>
              )}
              <button onClick={() => showToast('All verified companions loaded!', 'success')} className="w-full py-3 border border-[#C8A25E]/40 hover:border-[#C8A25E] text-[#C8A25E] rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-transparent">
                View All Companions
              </button>
            </div>
          </div>
        )}

        {/* Render Mobile Tab Experiences */}
        {mobileTab === 'experiences' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#0F1113] border-b border-white/5">
              <span className="text-sm font-black text-white uppercase tracking-wider">Experiences</span>
              <button onClick={() => showToast('Opening experiences catalog...', 'info')} className="text-xs font-bold text-[#C8A25E] hover:underline">See all</button>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-1">
              {['For You', 'Trending', 'Nearby', 'New', 'Adventures'].map((chip, i) => (
                <span 
                  key={chip} 
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold cursor-pointer transition-all shrink-0 ${i === 0 ? 'bg-[#C8A25E] text-[#0F1113]' : 'bg-[#17191C] text-[#8E9299]'}`}
                  onClick={() => showToast(`Filtering by ${chip}`, 'info')}
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Sunrise Hike Featured Card */}
            <div className="p-4">
              <div className="relative rounded-3xl overflow-hidden aspect-[16/9] border border-white/5 shadow-lg bg-[#17191C]">
                <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600" className="absolute inset-0 w-full h-full object-cover brightness-75" alt="Sunrise Hike" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <button onClick={() => showToast('Added to bookmarks!', 'success')} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                  <Heart className="w-3.5 h-3.5 text-white" />
                </button>
                <div className="absolute bottom-3 inset-x-4 flex justify-between items-end text-left">
                  <div>
                    <h4 className="text-sm font-black text-white drop-shadow">Sunrise Hike</h4>
                    <p className="text-[9px] text-white/80 drop-shadow">Sarangkot, Pokhara</p>
                    <div className="flex items-center gap-1 text-[9px] text-[#C8A25E] font-black mt-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span>4.9</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-[#C8A25E] block drop-shadow">NPR 1,200</span>
                    <span className="text-[7px] text-white/60 block leading-none">/ person</span>
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
                <div key={i} className="bg-[#17191C] border border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col text-left cursor-pointer hover:border-[#C8A25E]/30 transition-all">
                  <div className="relative h-20">
                    <img src={exp.img} className="w-full h-full object-cover" alt={exp.title} />
                  </div>
                  <div className="p-2.5 space-y-1">
                    <h5 className="text-[10px] font-black text-white truncate leading-tight">{exp.title}</h5>
                    <p className="text-[8px] text-[#8E9299] truncate">{exp.loc}</p>
                    <p className="text-[9px] font-bold text-[#C8A25E]">NPR {exp.price}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Community Moments vertical action block */}
            <div className="p-4 space-y-3.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Community Moments</h3>
                <span className="text-[10px] font-black text-[#C8A25E] cursor-pointer" onClick={() => showToast('Moments feed fully synchronized', 'success')}>See all</span>
              </div>
              
              <div className="space-y-4">
                <div className="relative aspect-[4/4.5] rounded-3xl overflow-hidden border border-white/5 shadow-lg bg-[#17191C]">
                  <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=400" className="absolute inset-0 w-full h-full object-cover brightness-75" alt="hike" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div onClick={() => showToast('Playing moments audio...', 'success')} className="w-11 h-11 rounded-full bg-[#C8A25E]/90 text-[#0F1113] flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  
                  <div className="absolute right-4 bottom-14 flex flex-col items-center gap-3.5 z-20">
                    <div className="flex flex-col items-center cursor-pointer" onClick={(e) => { e.stopPropagation(); showToast('Liked Moment!', 'success'); }}>
                      <Heart className="w-5 h-5 text-white fill-current hover:text-red-500" />
                      <span className="text-[9px] text-white font-bold mt-1">234</span>
                    </div>
                    <div className="flex flex-col items-center cursor-pointer" onClick={(e) => { e.stopPropagation(); showToast('Opening comments...', 'info'); }}>
                      <span className="text-base">💬</span>
                      <span className="text-[9px] text-white font-bold mt-0.5">28</span>
                    </div>
                    <div className="flex flex-col items-center cursor-pointer" onClick={(e) => { e.stopPropagation(); showToast('Link copied!', 'success'); }}>
                      <span className="text-base">➡️</span>
                      <span className="text-[9px] text-white font-bold mt-0.5">12</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-16 text-left space-y-1.5 z-20">
                    <div className="flex items-center gap-2">
                      <img src="https://ui-avatars.com/api/?name=Raj&background=random" className="w-5 h-5 rounded-full border border-[#C8A25E] object-cover" alt="Raj" />
                      <span className="text-[10px] font-black text-white">Raj <span className="font-light text-white/85">2h ago • Pokhara</span></span>
                    </div>
                    <p className="text-[10px] text-white/90 font-light leading-snug">Perfect morning for a hike #Sarangkot #Hiking</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Impact Section */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Your Impact</h3>
                <span className="text-[8px] text-[#8E9299]">This month</span>
              </div>
              
              <div className="relative rounded-3xl overflow-hidden p-5 bg-[#17191C] border border-white/5">
                <img src="https://images.unsplash.com/photo-1510425463958-dcced28da480?q=80&w=400" className="absolute inset-0 w-full h-full object-cover opacity-20 brightness-50" alt="Impact background" />
                <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <span className="text-lg font-black text-white block">12</span>
                    <span className="text-[8px] text-[#8E9299] block uppercase tracking-wider mt-0.5">Connections</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <span className="text-lg font-black text-[#C8A25E] block">5</span>
                    <span className="text-[8px] text-[#8E9299] block uppercase tracking-wider mt-0.5">Adventures</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                    <span className="text-lg font-black text-white block">3</span>
                    <span className="text-[8px] text-[#8E9299] block uppercase tracking-wider mt-0.5">Friends</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Events card */}
            <div className="p-4 pb-8 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Upcoming Events</h3>
                <span className="text-xs font-bold text-[#C8A25E] cursor-pointer" onClick={() => showToast('Events listed!', 'success')}>See all</span>
              </div>
              
              <div className="bg-[#17191C] border border-white/5 p-4 rounded-3xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#1E2124] flex flex-col items-center justify-center border border-white/10">
                    <span className="text-[#C8A25E] text-[8px] font-black leading-none uppercase">MAY</span>
                    <span className="text-white font-black text-xs leading-none mt-1">24</span>
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-black text-white truncate">Weekend Hiking Adventure</h5>
                    <p className="text-[8px] text-[#8E9299]">Shivapuri National Park • 6:00 AM</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="flex -space-x-1.5">
                        {['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100'].map((avatar, id) => (
                          <img key={id} src={avatar} className="w-3.5 h-3.5 rounded-full border border-black object-cover" alt="attendee" />
                        ))}
                      </div>
                      <span className="text-[7px] text-[#8E9299]">+12 attending</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => showToast('Hiking Adventure spot reserved!', 'success')}
                  className="px-3.5 py-1.5 bg-[#C8A25E] text-[#0F1113] text-[9px] font-black rounded-xl uppercase tracking-wider"
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
                <div className="bg-[#17191C] border border-white/5 rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A25E]/5 rounded-full blur-2xl" />
                  <div className="w-16 h-16 rounded-full border-2 border-[#C8A25E]/40 bg-[#1E2124] flex items-center justify-center text-[#C8A25E]">
                    <UserCircle className="w-10 h-10" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold text-[#C8A25E] flex items-center gap-1.5">Guest User</h3>
                    <p className="text-[10px] text-[#8E9299] leading-relaxed mt-1">Sign in to unlock messaging, bookings, favorites, and companion features.</p>
                  </div>
                </div>

                {/* Main Action Button */}
                <button 
                  onClick={() => setAuthMode('login')}
                  className="w-full py-3.5 bg-[#C8A25E] hover:bg-[#B69150] text-[#0F1113] font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-[#C8A25E]/10"
                >
                  Sign In / Register
                </button>

                {/* Dashboard Options (Disabled / Locked for Guest) */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] text-left px-1">My Dashboard</h4>
                  
                  <div className="bg-[#17191C] border border-white/5 rounded-2xl divide-y divide-white/5">
                    {/* Personal Dashboard (Disabled) */}
                    <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-4 h-4 text-[#8E9299]" />
                        <span className="text-xs font-bold text-white">Personal Dashboard</span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-[#8E9299]" />
                    </div>

                    {/* Partner Dashboard (Disabled) */}
                    <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-4 h-4 text-[#8E9299]" />
                        <span className="text-xs font-bold text-white">Partner Dashboard</span>
                      </div>
                      <Lock className="w-3.5 h-3.5 text-[#8E9299]" />
                    </div>

                    {/* My Wallet (Disabled) */}
                    <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-[#8E9299]" />
                        <span className="text-xs font-bold text-white">My Wallet (NPR)</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#8E9299]">NPR 0.00</span>
                    </div>
                  </div>
                </div>

                {/* Active Join SATHI Guide Link for Guest */}
                <div className="bg-gradient-to-r from-[#C8A25E]/10 to-[#C8A25E]/5 border border-[#C8A25E]/20 rounded-2xl p-5 text-left space-y-3">
                  <div className="flex items-center gap-2 text-[#C8A25E]">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold">Earn in Nepal</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Join SATHI as a Companion Guide</h4>
                  <p className="text-[10px] text-[#8E9299] leading-relaxed">Turn your local knowledge, storytelling, or hiking skills into high-paying earnings in NPR.</p>
                  <button 
                    onClick={() => setAuthMode('guide')}
                    className="mt-1 px-4 py-2 bg-[#C8A25E] text-[#0F1113] font-black text-[10px] rounded-lg hover:bg-[#B69150] uppercase tracking-wider transition-all"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ) : (
              // ==================== LOGGED-IN USER PROFILE VIEW ====================
              <div className="space-y-6">
                {/* Logged-In User Header */}
                <div className="bg-[#17191C] border border-white/5 rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A25E]/5 rounded-full blur-2xl" />
                  <img 
                    src={currentUser.avatar || "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?q=80&w=300&auto=format&fit=crop"} 
                    alt={currentUser.name} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#C8A25E]" 
                  />
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-bold text-white flex items-center gap-1">
                      {currentUser.name}
                      <ShieldCheck className="w-4 h-4 text-[#C8A25E]" />
                    </h3>
                    <p className="text-[10px] text-[#8E9299] mt-0.5">{currentUser.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#C8A25E]/10 border border-[#C8A25E]/30 text-[#C8A25E] text-[8px] font-extrabold rounded uppercase tracking-wider">
                      {currentUser.role === 'companion' ? 'SATHI Partner' : 'Premium Member'}
                    </span>
                  </div>
                </div>

                {/* SATHI Wallet Section */}
                <div className="bg-[#17191C] border border-white/5 rounded-2xl p-5 text-left">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#C8A25E]" />
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299]">SATHI Wallet</span>
                    </div>
                    <span className="text-xs font-bold text-white">NPR Balance</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-2xl font-black text-white">NPR 4,500.00</span>
                      <p className="text-[9px] text-[#8E9299] mt-0.5">Nepal Local Market Rate currency</p>
                    </div>
                    <button 
                      onClick={() => setShowWalletModal(true)}
                      className="px-4 py-2 bg-[#C8A25E] text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider hover:bg-[#B69150] transition-colors"
                    >
                      Deposit Fund
                    </button>
                  </div>
                </div>

                {/* My Companion Bookings Panel */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] px-1">My Bookings</h4>
                  {bookings.filter(b => b.userId === currentUser.id).length > 0 ? (
                    <div className="space-y-3">
                      {bookings.filter(b => b.userId === currentUser.id).map(booking => {
                        const companion = companions.find(c => c.id === booking.companionId);
                        return (
                          <div key={booking.id} className="bg-[#17191C] border border-white/5 rounded-2xl p-4 space-y-3.5">
                            <div className="flex items-center gap-3">
                              {companion && (
                                <img src={companion.imageUrl} className="w-9 h-9 rounded-full object-cover border border-[#2A2D31]" alt={companion.name} />
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-xs text-white truncate">Trip with {companion?.name || 'Companion'}</h5>
                                <p className="text-[9px] text-[#8E9299] mt-0.5">{booking.date} at {booking.time}</p>
                              </div>
                              <span className={`text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${booking.status === 'confirmed' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
                                {booking.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] pt-2.5 border-t border-white/5">
                              <span className="font-black text-[#C8A25E]">NPR {booking.totalPrice}</span>
                              <span className="text-[#8E9299]">{booking.duration} hours • {booking.participants} persons</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-[#17191C] border border-white/5 p-5 rounded-2xl text-center space-y-2.5">
                      <p className="text-[10px] text-[#8E9299]">No scheduled companion bookings yet.</p>
                      <button onClick={() => setMobileTab('explore')} className="py-2 px-4 bg-[#C8A25E] text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                        Discover Companions
                      </button>
                    </div>
                  )}
                </div>

                {/* Saved Favorites Section */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] px-1">Saved Companions</h4>
                  {fetchedCompanions.filter(c => favorites.includes(c.id)).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {fetchedCompanions.filter(c => favorites.includes(c.id)).map(comp => (
                        <div key={comp.id} className="bg-[#17191C] border border-white/5 rounded-2xl overflow-hidden flex flex-col relative">
                          <img src={comp.imageUrl} className="w-full h-24 object-cover" alt={comp.name} />
                          <button 
                            onClick={() => toggleFavorite(comp.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10"
                          >
                            <Heart className="w-3 h-3 fill-[#C8A25E] text-[#C8A25E]" />
                          </button>
                          <div className="p-2.5 space-y-1">
                            <h5 className="font-bold text-xs text-white truncate">{comp.name}</h5>
                            <p className="text-[9px] text-[#8E9299] flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {comp.location}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#17191C] border border-white/5 p-4 rounded-2xl text-center">
                      <p className="text-[10px] text-[#8E9299]">No saved SATHI guides yet.</p>
                    </div>
                  )}
                </div>

                {/* SATHI Partner Companion Section if Role matches */}
                {currentUser.role === 'companion' && (
                  <div className="bg-gradient-to-r from-[#C8A25E]/10 to-[#C8A25E]/5 border border-[#C8A25E]/20 rounded-2xl p-5 text-left space-y-3">
                    <div className="flex items-center gap-2 text-[#C8A25E]">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider font-extrabold">Guide Console</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      <div className="bg-[#1E2124] rounded-xl p-3 border border-white/5">
                        <span className="text-[9px] text-[#8E9299] uppercase tracking-wider">Earnings</span>
                        <p className="text-sm font-bold text-white mt-1">NPR 1,250</p>
                      </div>
                      <div className="bg-[#1E2124] rounded-xl p-3 border border-white/5">
                        <span className="text-[9px] text-[#8E9299] uppercase tracking-wider">Requests</span>
                        <p className="text-sm font-bold text-[#C8A25E] mt-1">3 Pending</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Responsive Settings block */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] px-1">Settings & Preferences</h4>
                  <div className="bg-[#17191C] border border-white/5 rounded-2xl divide-y divide-white/5">
                    {/* Theme Switcher Toggle */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Sun className="w-4 h-4 text-[#C8A25E]" />
                        <span className="text-xs font-bold text-white">Light Theme Mode</span>
                      </div>
                      <button 
                        onClick={() => {
                          const isCurrentlyLight = document.documentElement.classList.toggle('theme-light');
                          showToast(isCurrentlyLight ? 'SATHI Premium Light Theme Active' : 'SATHI Cosmic Dark Theme Active', 'success');
                        }}
                        className="w-10 h-6 rounded-full bg-[#1E2124] border border-white/10 p-0.5 flex items-center relative cursor-pointer"
                        aria-label="Toggle Light Theme Mode"
                      >
                        <div className="w-4 h-4 rounded-full bg-[#C8A25E] transition-all duration-300 absolute" style={{
                          left: typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light') ? '20px' : '2px'
                        }} />
                      </button>
                    </div>

                    {/* Notification settings toggle */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-[#C8A25E]" />
                        <span className="text-xs font-bold text-white">Push Alerts</span>
                      </div>
                      <button 
                        onClick={() => showToast('Push notifications enabled!', 'success')}
                        className="px-2 py-1 bg-[#1E2124] border border-white/10 text-[9px] uppercase tracking-wider font-extrabold rounded-md text-white hover:border-[#C8A25E]"
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

        {/* Render Mobile Tab Messages */}
        {mobileTab === 'messages' && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-extrabold text-white">My Messages</h2>
            <div className="bg-[#17191C] border border-white/5 rounded-2xl p-2 min-h-[400px]">
              <MessagesTab onOpenAuth={setAuthMode} initialCompanionId={activeChatCompanionId} />
            </div>
          </div>
        )}

        {/* Fixed Bottom Tab Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F1113]/95 backdrop-blur-md border-t border-white/10 flex justify-between items-center px-6 z-50">
          {[
            { tab: 'home', icon: <Home className="w-5 h-5" />, label: 'Home' },
            { tab: 'explore', icon: <Search className="w-5 h-5" />, label: 'Explore' },
            { tab: 'experiences', icon: (
              <div className="w-12 h-12 rounded-full bg-[#C8A25E] text-[#0F1113] flex items-center justify-center font-black shadow-lg shadow-[#C8A25E]/20 transform -translate-y-2.5 active:scale-95 transition-all">
                <span className="text-xl font-extrabold leading-none">+</span>
              </div>
            ), label: '' },
            { tab: 'messages', icon: <MessageSquare className="w-5 h-5" />, label: 'Messages' },
            { tab: 'profile', icon: <UserCircle className="w-5 h-5" />, label: 'Profile' },
          ].map((item) => {
            const isActive = mobileTab === item.tab;
            return (
              <button 
                key={item.tab}
                onClick={() => { setMobileTab(item.tab as any); if (item.tab !== 'experiences') setActiveTab(item.tab as any); }}
                className={`flex flex-col items-center justify-center transition-all ${isActive ? 'text-[#C8A25E]' : 'text-[#8E9299]'}`}
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
          <div className="relative w-full max-w-sm aspect-[9/16] bg-[#17191C] rounded-3xl overflow-hidden border border-[#2A2D31]/80" onClick={e => e.stopPropagation()}>
            <img src={viewingStory.imageUrl} className="w-full h-full object-cover" alt="SATHI Story" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85"></div>
            
            {/* Top Bar inside Story */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3 text-left">
                <img src={viewingStory.userAvatar} className="w-9 h-9 rounded-full border border-[#C8A25E] object-cover" alt={viewingStory.userName} />
                <div>
                  <span className="text-white font-bold text-xs block leading-tight">{viewingStory.userName}</span>
                  <span className="text-[#8E9299] text-[9px]">with {viewingStory.companionName} • {viewingStory.timeAgo}</span>
                </div>
              </div>
              <button onClick={() => setViewingStory(null)} className="text-white bg-black/40 rounded-full w-7 h-7 flex items-center justify-center backdrop-blur-sm hover:bg-black/60">✕</button>
            </div>

            {/* Nav click zones */}
            <div className="absolute inset-y-20 left-0 w-1/3 cursor-pointer" onClick={(e) => { e.stopPropagation(); const idx = stories.findIndex(s => s.id === viewingStory.id); if (idx > 0) setViewingStory(stories[idx - 1]); }}></div>
            <div className="absolute inset-y-20 right-0 w-1/3 cursor-pointer" onClick={(e) => { e.stopPropagation(); const idx = stories.findIndex(s => s.id === viewingStory.id); if (idx < stories.length - 1) setViewingStory(stories[idx + 1]); else setViewingStory(null); }}></div>

            {/* Bottom story details */}
            <div className="absolute bottom-6 inset-x-0 p-5 flex flex-col justify-end text-left space-y-3 z-10">
              <p className="text-white text-base font-semibold drop-shadow">{viewingStory.caption}</p>
              
              <div className="flex gap-1">
                {stories.map((s) => (
                  <div key={s.id} className={`h-1 rounded-full flex-1 transition-all ${s.id === viewingStory.id ? 'bg-[#C8A25E] w-6' : 'bg-white/20'}`} />
                ))}
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
              className="relative w-full max-w-md bg-[#17191C] border border-[#2A2D31]/70 rounded-3xl p-6 shadow-2xl z-50 text-left space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#2A2D31]/40 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-[#C8A25E]" /> SATHI Wallet Balance</h3>
                <button onClick={() => setShowWalletModal(false)} className="text-[#8E9299] hover:text-white rounded-full p-1.5 hover:bg-[#1E2124]">✕</button>
              </div>

              {/* NPR wallet metrics */}
              <div className="bg-[#1E2124]/50 border border-[#2A2D31]/40 rounded-2xl p-5 text-center space-y-2 relative overflow-hidden">
                <span className="text-[10px] uppercase text-[#8E9299] tracking-wider block font-medium">Available Escrow Balance</span>
                <span className="text-3xl font-black text-[#C8A25E] block">NPR 12,500.00</span>
                <span className="text-[9px] text-[#8E9299] block font-light">Escrow protection active for all current bookings</span>
              </div>

              <div className="space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E9299]">Recent Escrow Ledger</h4>
                
                <div className="space-y-2 max-h-36 overflow-y-auto divide-y divide-[#2A2D31]/40">
                  <div className="py-2.5 flex justify-between text-xs">
                    <div>
                      <span className="text-white font-bold block">Top-up via Khalti</span>
                      <span className="text-[10px] text-[#8E9299]">Jul 14, 2026</span>
                    </div>
                    <span className="text-green-500 font-bold">+NPR 5,000.00</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs">
                    <div>
                      <span className="text-white font-bold block">Booking paid (Aarav Thapa)</span>
                      <span className="text-[10px] text-[#8E9299]">Jul 10, 2026</span>
                    </div>
                    <span className="text-red-400 font-bold">-NPR 1,500.00</span>
                  </div>
                  <div className="py-2.5 flex justify-between text-xs">
                    <div>
                      <span className="text-white font-bold block">Booking paid (Priya Gurung)</span>
                      <span className="text-[10px] text-[#8E9299]">Jul 06, 2026</span>
                    </div>
                    <span className="text-red-400 font-bold">-NPR 1,800.00</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3.5 pt-3">
                <button 
                  onClick={handleWalletTopUp}
                  className="py-2.5 bg-[#C8A25E] hover:bg-[#B69150] text-[#0F1113] rounded-xl text-xs font-bold transition-all text-center"
                >
                  Top Up with Khalti
                </button>
                <button 
                  onClick={() => { showToast("eSewa gateway is ready", "success"); }}
                  className="py-2.5 bg-[#1E2124] hover:bg-[#2A2D31] text-white border border-[#2A2D31]/60 rounded-xl text-xs font-semibold transition-all text-center"
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
        />
      )}

    </div>
  );
});
