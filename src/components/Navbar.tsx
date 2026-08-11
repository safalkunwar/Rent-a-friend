import React, { useState, useRef, useEffect } from 'react';
import { User, LogIn, UserCircle, Briefcase, Settings, LogOut, Menu, X, Sun, Moon, LayoutDashboard, Search, Bell, Shield } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { saveStoredPreferences } from '../services/preferences';

interface NavbarProps {
  activeTab: 'explore' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner';
  setActiveTab: (tab: 'explore' | 'bookings' | 'messages' | 'about' | 'admin' | 'dashboard' | 'partner') => void;
  onOpenAuth: (mode: 'login' | 'signup' | 'guide') => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onLogoClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth, searchQuery, setSearchQuery, onLogoClick }) => {
  const { currentUser, logout, notifications } = useAppContext();
  const { showToast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLight = document.documentElement.classList.contains('theme-light');
      setTheme(isLight ? 'light' : 'dark');
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    saveStoredPreferences({ theme: newTheme });
    if (newTheme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    showToast('Logged out successfully', 'success');
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-background border-b border-border-token shadow-sm" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo / Mobile Menu Toggle */}
          <div 
             className="flex items-center gap-2 md:gap-3 cursor-pointer select-none shrink-0" 
             onClick={() => {
               if (onLogoClick) onLogoClick();
             }}
             role="button"
             tabIndex={0}
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLogoClick?.(); } }}
             aria-label="SATHI home"
          >
              <div className="w-11 h-11 md:w-10 md:h-10 rounded-xl bg-primary-action flex items-center justify-center font-bold text-background text-xl" aria-hidden="true">
                 S
              </div>
             <span className="text-xl md:text-2xl font-semibold tracking-tight text-text-primary hidden sm:block">SATHI<span className="text-primary-action">.</span></span>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden flex-1 mx-3 relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 transform -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="Search people..." 
               aria-label="Search people"
               className="w-full bg-surface-elevated/50 backdrop-blur-md border border-border-token rounded-[24px] h-11 pl-10 pr-4 text-[15px] text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-action focus:bg-surface transition-all shadow-sm"
               value={searchQuery || ''}
               onChange={(e) => setSearchQuery?.(e.target.value)}
             />
          </div>
          
          {/* Desktop Search and Links */}
          <div className="hidden md:flex flex-1 items-center px-8">
            <div className="flex-1 max-w-xl mx-auto relative">
              <Search className="w-4 h-4 text-text-secondary absolute left-4 top-1/2 transform -translate-y-1/2" />
               <input 
                 type="text" 
                 placeholder="Find friends, activities, or locations..." 
                 aria-label="Search friends, activities, or locations"
                 className="w-full bg-surface-elevated/40 backdrop-blur-md border border-border-token rounded-full h-11 pl-11 pr-4 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-action focus:bg-surface transition-all shadow-sm"
                 value={searchQuery || ''}
                 onChange={(e) => setSearchQuery?.(e.target.value)}
               />
            </div>
            
              <div className="flex items-center space-x-7 text-[15px] font-medium ml-6">
                <button onClick={() => setActiveTab('explore')} className={`transition-colors ${activeTab === 'explore' ? 'text-text-primary' : 'text-text-secondary hover:text-primary-action'}`}>Discover</button>
                <button onClick={() => setActiveTab('about')} className={`transition-colors ${activeTab === 'about' ? 'text-text-primary' : 'text-text-secondary hover:text-primary-action'}`}>Experiences</button>
                {currentUser && (
                  <>
                    <button onClick={() => setActiveTab('bookings')} className={`transition-colors ${activeTab === 'bookings' ? 'text-text-primary' : 'text-text-secondary hover:text-primary-action'}`}>Bookings</button>
                    <button onClick={() => setActiveTab('messages')} className={`transition-colors ${activeTab === 'messages' ? 'text-text-primary' : 'text-text-secondary hover:text-primary-action'}`}>Messages</button>
                    <button onClick={() => setActiveTab('partner')} className={`transition-colors ${activeTab === 'partner' ? 'text-text-primary' : 'text-text-secondary hover:text-primary-action'}`}>Partners</button>
                    {currentUser.role === 'admin' && (
                      <button onClick={() => window.location.href = '/admin'} className="transition-colors text-primary-action hover:text-primary-action/80 font-medium flex items-center gap-1">
                        <Shield className="w-4 h-4" /> Admin
                      </button>
                    )}
                  </>
                )}
              </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-4 relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="hidden md:flex w-10 h-10 rounded-full bg-surface-elevated border border-border-token hover:border-primary-action transition-colors items-center justify-center text-text-secondary hover:text-primary-action relative focus:outline-none" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary-action rounded-full border-2 border-surface-elevated"></span>}
            </button>
            {showNotifications && (
              <div ref={notifRef} className="absolute right-0 top-12 mt-2 w-80 bg-surface border border-border-token rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border-token">
                  <p className="text-sm font-semibold text-text-primary">Notifications</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No notifications yet.</p>}
                  {notifications.slice(0, 5).map((n, idx) => (
                    <div key={`${n.id || 'notif'}-${idx}`} className={`p-3 hover:bg-surface-elevated transition-colors ${!n.isRead ? 'bg-primary-action/5' : ''}`}>
                      <p className={`text-sm ${!n.isRead ? 'font-bold text-text-primary' : 'font-medium text-gray-300'}`}>{n.title}</p>
                      <p className="text-xs text-gray-400">{n.message}</p>
                      <p className="text-[10px] text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="h-6 w-[1px] bg-border-token hidden md:block"></div>
            
            <div ref={dropdownRef} className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-expanded={isDropdownOpen}
                aria-controls="user-dropdown"
                aria-label="User menu"
                className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-surface-elevated overflow-hidden border border-border-token hover:border-primary-action transition-colors focus:outline-none flex items-center justify-center"
              >
                 {currentUser ? (
                   <img src={currentUser.avatar} alt="User profile" className="w-full h-full object-cover" />
                 ) : (
                   <User className="w-5 h-5 text-text-secondary" />
                 )}
              </button>

              {isDropdownOpen && (
                <div id="user-dropdown" className="absolute right-0 top-12 mt-2 w-56 bg-surface border border-border-token rounded-xl shadow-2xl py-2 z-50 overflow-hidden" role="menu">
                   {currentUser ? (
                     <>
                       <div className="px-4 py-3 border-b border-border-token">
                          <p className="text-sm font-semibold text-text-primary">{currentUser.name}</p>
                          <p className="text-xs text-text-secondary truncate">{currentUser.email}</p>
                       </div>
                       
                        <div className="py-1 border-b border-border-token" role="group">
                          <button onClick={() => { setActiveTab('dashboard'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2" role="menuitem">
                             <UserCircle className="w-4 h-4" /> Dashboard
                          </button>
                        </div>
                     </>
                   ) : (
                     <div className="py-1 border-b border-border-token">
                       <button onClick={() => { onOpenAuth('login'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2">
                          <LogIn className="w-4 h-4" /> Login / Sign Up
                       </button>
                     </div>
                   )}

                   {!currentUser || currentUser.role !== 'companion' ? (
                     <div className="py-1 border-b border-border-token">
                       <button onClick={() => { onOpenAuth('guide'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-primary-action hover:bg-surface-elevated flex items-center gap-2 font-medium">
                          <Briefcase className="w-4 h-4" /> Join as Guide
                       </button>
                     </div>
                   ) : null}

                     <div className="py-1">
                       <button onClick={toggleTheme} className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2">
                          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                       </button>
                       <button onClick={() => { showToast('Settings will be available soon.', 'info'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary flex items-center gap-2">
                          <Settings className="w-4 h-4" /> Settings
                       </button>
                       {currentUser && (
                         <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-900/20 flex items-center gap-2">
                            <LogOut className="w-4 h-4" /> Log Out
                         </button>
                       )}
                     </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border-token space-y-4">
             <button onClick={() => { setActiveTab('explore'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm font-medium ${activeTab === 'explore' ? 'text-primary-action bg-surface-elevated rounded-lg' : 'text-text-secondary'}`}>Discover</button>
             {currentUser && (
               <>
                 <button onClick={() => { setActiveTab('bookings'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm font-medium ${activeTab === 'bookings' ? 'text-primary-action bg-surface-elevated rounded-lg' : 'text-text-secondary'}`}>Bookings</button>
                 <button onClick={() => { setActiveTab('messages'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm font-medium ${activeTab === 'messages' ? 'text-primary-action bg-surface-elevated rounded-lg' : 'text-text-secondary'}`}>Messages</button>
                 <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm font-medium ${activeTab === 'dashboard' ? 'text-primary-action bg-surface-elevated rounded-lg' : 'text-text-secondary'}`}>Dashboard</button>
                 {currentUser.role === 'admin' && (
                   <button onClick={() => { window.location.href = '/admin'; setIsMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm font-medium text-primary-action bg-surface-elevated rounded-lg">Admin Panel</button>
                 )}
               </>
             )}
             <button onClick={() => { setActiveTab('about'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm font-medium ${activeTab === 'about' ? 'text-primary-action bg-surface-elevated rounded-lg' : 'text-text-secondary'}`}>About SATHI</button>
          </div>
        )}
      </div>
    </nav>
  );
};
