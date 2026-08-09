import React, { useState } from 'react';
import { X, Save, User, Phone, MapPin, AlignLeft, DollarSign, Languages, Award, Calendar } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { companionRepository } from '../../repositories/CompanionRepository';
import { useCompanions } from '../../hooks/useFirestoreData';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useAppContext();
  const { companions } = useCompanions();
  const { showToast } = useToast();

  const companionProfile = companions.find(c => c.userId === currentUser?.id);

  // General Account States
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');

  // Companion Profile States
  const [hourlyRate, setHourlyRate] = useState(companionProfile?.hourlyRate || 1000);
  const [languages, setLanguages] = useState(companionProfile?.languages?.join(', ') || 'Nepali, English');
  const [interests, setInterests] = useState(companionProfile?.interests?.join(', ') || 'Hiking, Food, Photography');
  const [availableDays, setAvailableDays] = useState<string[]>(companionProfile?.availableDays || ['Sunday', 'Saturday']);

  const [saving, setSaving] = useState(false);

  if (!isOpen || !currentUser) return null;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleToggleDay = (day: string) => {
    setAvailableDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Save general account details to users collection
      const userUpdates = {
        name,
        phone,
        bio,
        location
      };
      await updateUserProfile(userUpdates);

      // 2. If companion, save companion details to companions collection
      if (currentUser.role === 'companion' && companionProfile) {
        const compUpdates = {
          name,
          bio,
          location,
          hourlyRate: Number(hourlyRate),
          languages: languages.split(',').map(s => s.trim()).filter(Boolean),
          interests: interests.split(',').map(s => s.trim()).filter(Boolean),
          availableDays
        };
        await companionRepository.editCompanionProfile(companionProfile.id, compUpdates);
      }

      showToast('Profile and account details updated successfully!', 'success');
      onClose();
    } catch (err) {
      showToast('Error saving profile changes. Check connection.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border-token rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-border-token flex justify-between items-center bg-background">
          <h3 className="text-md font-extrabold text-text-primary flex items-center gap-2">
            ✏️ Edit SATHI Profile
          </h3>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5 text-left custom-scrollbar">
          
          {/* Section 1: Account Details */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-primary-action">Account Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="tel"
                    placeholder="+977 98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Kathmandu, Nepal"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Personal Bio</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                  <textarea
                    rows={3}
                    placeholder="Tell us a little bit about yourself..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Companion Specific Details */}
          {currentUser.role === 'companion' && companionProfile && (
            <div className="space-y-4 pt-4 border-t border-border-token/40">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-primary-action">Companion Guide Profile</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Hourly Rate (NPR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="number"
                      min={100}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Languages (comma-separated)</label>
                  <div className="relative">
                    <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Nepali, English, Newari"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Interests / Skills (comma-separated)</label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Hiking, Culture, Local Temples, Newari Food"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary-action" /> Available Days
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {daysOfWeek.map(day => {
                    const isSelected = availableDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => handleToggleDay(day)}
                        className={`py-2 px-3 rounded-xl border text-center font-bold text-[10px] transition-all ${
                          isSelected 
                            ? 'bg-primary-action/15 border-primary-action text-primary-action' 
                            : 'bg-surface-elevated border-border-token/60 text-text-secondary hover:border-white/10 hover:text-text-primary'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-border-token/40 flex gap-3 justify-end bg-background -mx-5 -mb-5 p-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-surface-elevated border border-border-token/60 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-primary-action hover:bg-primary-action-hover disabled:bg-primary-action/40 text-background font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
