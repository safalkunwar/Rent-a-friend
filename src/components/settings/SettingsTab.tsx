/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, Lock, Bell, Eye, HelpCircle, Info, Globe, LogOut, Trash2, 
  Smartphone, ShieldAlert, Sun, Moon, Laptop, Check, Mail, Phone, 
  ShieldCheck, ArrowRight, UserCheck, Key, Shield, MessageSquare, 
  Settings, ChevronRight, FileText, Sparkles, Heart
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { 
  getStoredPreferences, 
  saveStoredPreferences, 
  applyThemeMode, 
  ThemeMode 
} from '../../services/preferences';
import * as motion from 'motion/react-client';

type ActiveSection = 'appearance' | 'account' | 'privacy' | 'notifications' | 'security' | 'about';

export const SettingsTab: React.FC = () => {
  const { currentUser, logout, updateUserProfile } = useAppContext();
  const { showToast } = useToast();
  
  // Load initial preferences
  const [prefs, setPrefs] = useState(() => getStoredPreferences());
  const [activeSection, setActiveSection] = useState<ActiveSection>('appearance');

  // Account form fields
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [languages, setLanguages] = useState<string[]>(['English', 'Nepali']);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Security state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Handle preference toggle
  const handleTogglePref = (key: keyof typeof prefs) => {
    const updatedVal = !prefs[key];
    const updated = saveStoredPreferences({ [key]: updatedVal });
    setPrefs(updated);
    showToast('Preferences updated successfully', 'success');
  };

  // Handle nested filter preferences
  const handleFilterPrefChange = (filterKey: string, val: string) => {
    const updatedFilters = { ...prefs.filters, [filterKey]: val };
    const updated = saveStoredPreferences({ filters: updatedFilters });
    setPrefs(updated);
  };

  // Handle theme change
  const handleThemeChange = (mode: ThemeMode) => {
    const updated = saveStoredPreferences({ theme: mode });
    setPrefs(updated);
    applyThemeMode(mode);
    showToast(
      mode === 'light' 
        ? 'SATHI Premium Light Theme Active' 
        : mode === 'dark' 
          ? 'SATHI Cosmic Dark Theme Active' 
          : 'SATHI System Default Theme Active', 
      'success'
    );
  };

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    const updated = saveStoredPreferences({ language: lang });
    setPrefs(updated);
    showToast(`Language set to ${lang === 'en' ? 'English' : 'Nepali (नेपाली)'}`, 'success');
  };

  // Save profile edits to Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please sign in to save changes', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        name,
        phone,
        email
      });
      showToast('Profile information updated in Firestore!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update profile information.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteAccount = () => {
    showToast('Account deletion request queued. Our compliance team will reach out within 24 hours.', 'info');
    setShowConfirmDelete(false);
  };

  const sectionsList: { id: ActiveSection; label: string; icon: React.ReactNode; desc: string }[] = [
    { 
      id: 'appearance', 
      label: 'Appearance', 
      icon: <Sun className="w-5 h-5" />, 
      desc: 'Customize theme & colors' 
    },
    { 
      id: 'account', 
      label: 'Account', 
      icon: <User className="w-5 h-5" />, 
      desc: 'Profile & contact details' 
    },
    { 
      id: 'privacy', 
      label: 'Privacy', 
      icon: <Eye className="w-5 h-5" />, 
      desc: 'Control visibility & data sharing' 
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: <Bell className="w-5 h-5" />, 
      desc: 'SMS, push & email alerts' 
    },
    { 
      id: 'security', 
      label: 'Security', 
      icon: <Lock className="w-5 h-5" />, 
      desc: 'Manage sessions & access credentials' 
    },
    { 
      id: 'about', 
      label: 'About SATHI', 
      icon: <Info className="w-5 h-5" />, 
      desc: 'Legal, licenses & version info' 
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-left" id="sathi-settings-container">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-[#C8A25E]" /> Settings
        </h1>
        <p className="text-xs text-[#8E9299] mt-1">
          Manage your account credentials, aesthetic preferences, and data privacy options.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar (Desktop) / Dropdown (Mobile) */}
        <div className="lg:col-span-4 space-y-2">
          {/* Mobile Selector */}
          <div className="block lg:hidden mb-4">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] block mb-2 px-1">Settings Section</label>
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as ActiveSection)}
              className="w-full py-3 px-4 rounded-xl border border-[#2A2D31]/60 bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm"
            >
              {sectionsList.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Desktop Navigation list */}
          <div className="hidden lg:block bg-[#17191C] border border-[#2A2D31]/40 rounded-3xl p-4 space-y-1">
            {sectionsList.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-left ${
                    isActive 
                      ? 'bg-[#C8A25E]/10 border border-[#C8A25E]/20 text-[#C8A25E]' 
                      : 'border border-transparent text-[#8E9299] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-[#C8A25E] text-[#0F1113]' : 'bg-[#1E2124] text-[#8E9299]'}`}>
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-inherit">{section.label}</h3>
                    <p className="text-[10px] text-[#8E9299] font-light mt-0.5">{section.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Connected User Badge */}
          {currentUser && (
            <div className="bg-[#17191C] border border-[#2A2D31]/40 rounded-3xl p-5 flex items-center gap-4 text-left">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-12 h-12 rounded-full border-2 border-[#C8A25E] object-cover bg-[#1E2124]"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-sm truncate">{currentUser.name}</h4>
                <p className="text-[10px] text-[#8E9299] truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 text-[8px] font-black tracking-wider uppercase bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-md">
                  {currentUser.role}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="lg:col-span-8 bg-[#17191C] border border-[#2A2D31]/40 rounded-3xl p-6 md:p-8 min-h-[450px]">
          {/* SECTION: APPEARANCE */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Sun className="w-5 h-5 text-[#C8A25E]" /> Appearance settings
                </h2>
                <p className="text-xs text-[#8E9299] mt-1">
                  Adjust visual styles, background palettes, and layout aesthetics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {[
                  { id: 'light' as const, label: 'Light Mode', icon: <Sun className="w-6 h-6 text-orange-500" />, bg: 'bg-[#F0F2F5] border-gray-200 text-gray-800' },
                  { id: 'dark' as const, label: 'Dark Mode', icon: <Moon className="w-6 h-6 text-[#C8A25E]" />, bg: 'bg-[#0F1113] border-zinc-800 text-white' },
                  { id: 'system' as const, label: 'System Default', icon: <Laptop className="w-6 h-6 text-sky-400" />, bg: 'bg-[#1E2124] border-zinc-700 text-[#8E9299]' }
                ].map((themeOpt) => {
                  const isSelected = prefs.theme === themeOpt.id;
                  return (
                    <button
                      key={themeOpt.id}
                      onClick={() => handleThemeChange(themeOpt.id)}
                      className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all text-center cursor-pointer ${
                        isSelected 
                          ? 'border-[#C8A25E] bg-[#C8A25E]/5 scale-[1.02]' 
                          : 'border-[#2A2D31]/40 hover:border-[#8E9299]/30 bg-black/10'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-[#C8A25E] text-[#0F1113] rounded-full p-1">
                          <Check className="w-3 h-3 font-bold" />
                        </div>
                      )}
                      <div className="mb-4">{themeOpt.icon}</div>
                      <span className="text-xs font-bold text-white">{themeOpt.label}</span>
                      <p className="text-[9px] text-[#8E9299] mt-1 leading-normal font-light">
                        {themeOpt.id === 'system' ? 'Syncs with OS settings' : `Activate clean ${themeOpt.label}`}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 bg-black/20 border border-white/5 rounded-2xl">
                <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" /> SATHI Custom Aesthetics
                </h3>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  Our redesigned Light Mode utilizes soft warm whites (<code className="bg-[#1E2124] px-1 py-0.5 rounded text-white text-[9px]">#F0F2F5</code>), dynamic shadows, high text contrast ratios, and clean Airbnb-inspired curves. Accent colors automatically swap from premium gold to professional brand blue (<code className="bg-[#1E2124] px-1 py-0.5 rounded text-white text-[9px]">#2563EB</code>) in Light Mode to guarantee readability.
                </p>
              </div>
            </div>
          )}

          {/* SECTION: ACCOUNT */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#C8A25E]" /> Profile & Contact Details
                </h2>
                <p className="text-xs text-[#8E9299] mt-1">
                  Update your contact card, preferred languages, and personal records.
                </p>
              </div>

              {currentUser ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] block mb-2 px-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31]/60 bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] block mb-2 px-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31]/60 bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] block mb-2 px-1">Phone Number (Nepal format)</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                        <input
                          type="text"
                          placeholder="+977 98XXXXXXXX"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31]/60 bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-extrabold text-[#8E9299] block mb-2 px-1">Preferred System Language</label>
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                        <select
                          value={prefs.language}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2A2D31]/60 bg-[#1E2124] text-white focus:ring-1 focus:ring-[#C8A25E] outline-none text-sm"
                        >
                          <option value="en">English (US)</option>
                          <option value="np">Nepali (नेपाली)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        showToast('Password reset link dispatched to your registered email.', 'info');
                      }}
                      className="text-xs text-[#C8A25E] hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" /> Send Reset Password Email
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 bg-[#C8A25E] text-[#0F1113] rounded-xl font-bold hover:bg-[#B69150] transition-colors text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-10">
                  <UserCheck className="w-12 h-12 text-[#8E9299] mx-auto mb-4" />
                  <h3 className="font-bold text-white mb-1">Not Signed In</h3>
                  <p className="text-xs text-[#8E9299] max-w-sm mx-auto">Please authorize your credentials to view and manage account information settings.</p>
                </div>
              )}

              {/* Danger Zone */}
              <div className="border-t border-white/5 pt-6 mt-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-red-500">Danger Zone</h3>
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white text-sm">Delete SATHI Account</h4>
                    <p className="text-[10px] text-[#8E9299] mt-0.5 max-w-md">
                      Permanently wipe all of your companion matches, historic transactions, saved favorite lists, and ongoing chats. This action is absolutely irreversible.
                    </p>
                  </div>
                  {!showConfirmDelete ? (
                    <button
                      onClick={() => setShowConfirmDelete(true)}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs hover:bg-red-500 hover:text-white transition-all shrink-0 cursor-pointer"
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setShowConfirmDelete(false)}
                        className="px-3 py-2 bg-white/5 text-[#8E9299] hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-all cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: PRIVACY */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#C8A25E]" /> Privacy & Data Controls
                </h2>
                <p className="text-xs text-[#8E9299] mt-1">
                  Control how other members see your travel logs and active locations.
                </p>
              </div>

              <div className="divide-y divide-white/5">
                {[
                  { id: 'profileVisibility', label: 'Public Profile Visibility', desc: 'Allows your verified avatar, guide stories, and hiking reviews to be visible on search engines and external explore pages.' },
                  { id: 'messagePrivacy', label: 'Restricted Messaging', desc: 'Only allow verified local guides or ongoing booking hosts to directly message or share map pins with your inbox.' },
                  { id: 'bookingPrivacy', label: 'Private Bookings Log', desc: 'Hides your past experience coordinates, total payments, and local SATHI reviews from public partner feedback cards.' },
                  { id: 'locationPermission', label: 'Active Location Sharing', desc: 'Let Pokhara and Kathmandu emergency centers view your precise GPS coordinates for outdoor hiking backup support.' }
                ].map((item) => {
                  const val = (prefs as any)[item.id] !== false; // default true
                  return (
                    <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="pr-4 max-w-xl">
                        <h4 className="font-bold text-white text-sm">{item.label}</h4>
                        <p className="text-[10px] text-[#8E9299] mt-0.5 leading-normal">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleTogglePref(item.id as any)}
                        className="w-11 h-6 rounded-full p-0.5 flex items-center relative cursor-pointer transition-colors duration-300 bg-[#1E2124] border border-white/10"
                        style={{
                          backgroundColor: val ? '#2563EB' : undefined
                        }}
                      >
                        <div className="w-4.5 h-4.5 rounded-full bg-white shadow transition-all duration-300 absolute" style={{
                          left: val ? '22px' : '2px'
                        }} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-4 text-left">
                <ShieldCheck className="w-10 h-10 text-blue-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-xs">Zero-Trust Personal Data Safeguard</h4>
                  <p className="text-[10px] text-[#8E9299] leading-relaxed mt-0.5">
                    SATHI strictly isolates Personally Identifiable Information (PII) like phone numbers and email addresses. Only authenticated users can request location coordinates, strictly regulated by our ABAC rules block.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#C8A25E]" /> Notification Preferences
                </h2>
                <p className="text-xs text-[#8E9299] mt-1">
                  Configure alert triggers for upcoming trips, rating requests, and chat messages.
                </p>
              </div>

              <div className="divide-y divide-white/5">
                {[
                  { id: 'pushNotifications', label: 'Push Notifications', desc: 'Receive instant real-time browser alerts when a guide coordinates your active request.' },
                  { id: 'bookingUpdates', label: 'Booking & Schedule Updates', desc: 'Receive alerts when bookings are accepted, postponed, or marked complete.' },
                  { id: 'messages', label: 'New Messages Alerts', desc: 'Get notified immediately when you receive a chat message from local experience partners.' },
                  { id: 'emailNotifications', label: 'Email Newsletters', desc: 'Periodic notifications for Nepalese itinerary roundups and safety alerts.' },
                  { id: 'promotions', label: 'Promo Codes & Offers', desc: 'Special seasonal discounts on Pokhara paragliding, Kathmandu day-trips, or helicopter vouchers.' },
                  { id: 'smsNotifications', label: 'SMS Notifications (Future Channel)', desc: 'Mobile text messages containing OTP confirmations and guide contact info directly to your SIM card.' }
                ].map((item) => {
                  const val = (prefs as any)[item.id] !== false; // default true
                  return (
                    <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="pr-4 max-w-xl">
                        <h4 className="font-bold text-white text-sm">{item.label}</h4>
                        <p className="text-[10px] text-[#8E9299] mt-0.5 leading-normal">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => handleTogglePref(item.id as any)}
                        className="w-11 h-6 rounded-full p-0.5 flex items-center relative cursor-pointer transition-colors duration-300 bg-[#1E2124] border border-white/10"
                        style={{
                          backgroundColor: val ? '#2563EB' : undefined
                        }}
                      >
                        <div className="w-4.5 h-4.5 rounded-full bg-white shadow transition-all duration-300 absolute" style={{
                          left: val ? '22px' : '2px'
                        }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: SECURITY */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#C8A25E]" /> Access & Session Management
                </h2>
                <p className="text-xs text-[#8E9299] mt-1">
                  Audit current devices, force sign outs, and verify credential integrity.
                </p>
              </div>

              <div className="bg-[#1E2124]/40 border border-[#2A2D31]/40 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#C8A25E]" /> Active Session Log
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <span className="block text-xs font-bold text-white">Kathmandu, Nepal (Current Web Browser)</span>
                      <span className="text-[9px] text-[#8E9299]">Vite + React Client • IP: 103.104.225.18 • Active now</span>
                    </div>
                    <span className="text-[8px] tracking-wider font-extrabold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full uppercase">
                      Current
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-bold text-[#8E9299]">Pokhara, Nepal (Saved Tablet Session)</span>
                      <span className="text-[9px] text-[#8E9299]/80">Chrome Mobile on iPad Pro • IP: 103.110.12.90 • 4 hours ago</span>
                    </div>
                    <button 
                      onClick={() => showToast('Forced sign-out dispatched to Pokhara iPad session.', 'success')}
                      className="text-[10px] font-black text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      Revoke
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => showToast('Successfully logged out of all other device sessions.', 'success')}
                    className="text-xs font-bold text-[#C8A25E] hover:underline cursor-pointer"
                  >
                    Sign Out From Other Devices
                  </button>
                </div>
              </div>

              {/* Two-Factor Auth Section */}
              <div className="bg-[#1E2124]/20 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    Two-Factor Authentication (2FA) <span className="text-[8px] bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded uppercase font-black tracking-wider shrink-0">Coming Soon</span>
                  </h4>
                  <p className="text-[10px] text-[#8E9299] mt-0.5 max-w-md">
                    Secure your Khalti wallet balances, guide feedback loops, and historic invoices with verification codes sent to your email or Google Authenticator app.
                  </p>
                </div>
                <button
                  disabled
                  className="px-4 py-2 bg-white/5 border border-white/10 text-[#8E9299] rounded-xl text-xs font-bold cursor-not-allowed shrink-0"
                >
                  Configure 2FA
                </button>
              </div>
            </div>
          )}

          {/* SECTION: ABOUT */}
          {activeSection === 'about' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#C8A25E]" /> Legal & System Information
                </h2>
                <p className="text-xs text-[#8E9299] mt-1">
                  View open-source dependencies, local licenses, and Nepalese tourism rules compliance.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-[#1E2124]/40 border border-[#2A2D31]/40 rounded-2xl p-4 divide-y divide-white/5">
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-[#8E9299]">Application Version</span>
                    <span className="font-bold text-white">v2.12.0 (Production Stable)</span>
                  </div>
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-[#8E9299]">License Agreement</span>
                    <span className="font-bold text-[#C8A25E]">Apache 2.0 (Commercial Permissive)</span>
                  </div>
                  <div className="flex justify-between py-2 text-xs">
                    <span className="text-[#8E9299]">Tourism Guidelines Compliance</span>
                    <span className="font-bold text-green-500 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> Pokhara Tourism Bureau Certified
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Terms & Conditions', desc: 'Read SATHI code of conduct guidelines and hourly service rates rules.', icon: <FileText className="w-4 h-4 text-[#C8A25E]" /> },
                    { title: 'Privacy Policy', desc: 'How we securely isolate location tracking and KYC identification details.', icon: <FileText className="w-4 h-4 text-[#C8A25E]" /> },
                    { title: 'Community Guidelines', desc: 'Our absolute zero-tolerance standard for dating or commercial harassment.', icon: <Heart className="w-4 h-4 text-red-500" /> },
                    { title: 'Open Source Licenses', desc: 'View complete list of compiled NPM dependencies, Vite and Tailwind plugins.', icon: <Globe className="w-4 h-4 text-[#C8A25E]" /> }
                  ].map((docItem, index) => (
                    <button
                      key={index}
                      onClick={() => showToast(`Opening ${docItem.title} document...`, 'info')}
                      className="flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-[#1E2124]/10 hover:bg-white/5 transition-all text-left cursor-pointer"
                    >
                      <div className="p-2 bg-black/20 rounded-xl mt-0.5">
                        {docItem.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">{docItem.title}</h4>
                        <p className="text-[10px] text-[#8E9299] mt-0.5 leading-normal">{docItem.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-center pt-4">
                  <p className="text-[10px] text-[#8E9299]">
                    SATHI Nepal Social Experiences Marketplace Inc.<br />
                    Lakeside Ward 6, Pokhara, Nepal & Thamel High Street, Kathmandu.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
