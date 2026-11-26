import React, { useState } from 'react';
import { CalendarDays, Check, Compass, SlidersHorizontal, Users } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { searchStrings } from '../../services/discoverySearch';

const INTERESTS = ['Travel and exploration', 'Food and cafes', 'Music', 'Movies and entertainment', 'Fitness and gym', 'Sports', 'Hiking and outdoors', 'Photography', 'Gaming', 'Reading', 'Learning', 'Technology', 'Entrepreneurship', 'Culture and local experiences', 'Casual conversations'];
const LANGUAGES = ['Nepali', 'English', 'Hindi', 'Newari', 'Tamang', 'Maithili', 'Japanese', 'French'];
const AVAILABILITY = ['Weekdays', 'Weekends', 'Flexible'];

interface Props {
  mode?: 'home' | 'explore' | 'companions';
  onExplore: (section?: string) => void;
  availableInterests?: string[];
}

/** Shared presentation: profile interests use the existing authenticated repository. */
export function DiscoveryWelcome({ mode = 'home', onExplore, availableInterests = [] }: Props) {
  const { currentUser, updateUserProfile, openAuthModal } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [draftLanguages, setDraftLanguages] = useState<string[]>([]);
  const [draftAvailability, setDraftAvailability] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const interests = searchStrings(currentUser?.interests);
  const languages = searchStrings(currentUser?.languages);
  const availability = typeof currentUser?.availability === 'string'
    ? currentUser.availability.split(/[,;|]/).map(value => value.trim()).filter(Boolean)
    : searchStrings(currentUser?.availability);
  const options = [...new Set([...interests, ...availableInterests, ...INTERESTS])];
  const startEditing = () => {
    if (!currentUser || currentUser.role === 'guest') { openAuthModal(); return; }
    setDraft([...interests]); setDraftLanguages([...languages]); setDraftAvailability([...availability]); setError(''); setStatus(''); setEditing(true);
  };
  const save = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try {
      await updateUserProfile({ interests: draft, languages: draftLanguages, availability: draftAvailability });
      setEditing(false); setStatus('Interests saved. Your feed has been updated.');
    } catch {
      setError('Could not save your interests. Your selection is still here—please try again.');
    } finally { setSaving(false); }
  };
  return (
    <section className="discovery-welcome" data-mode={mode} aria-label={mode === 'home' ? 'Your discovery' : 'Explore SATHI'}>
      {mode === 'explore' && <div className="discovery-intro">
        <div>
          <h1>Explore</h1>
          <p>Discover something to do, somewhere to go.</p>
        </div>
      </div>}
      {mode === 'home' && <div className="discovery-shortcuts" aria-label="Explore by type">
        {[
          { section: 'companions', label: 'Find a Sathi', Icon: Users },
          { section: 'activities', label: 'Activities', Icon: Compass },
          { section: 'events', label: 'Events', Icon: CalendarDays },
        ].map(({ section, label, Icon }) => (
          <button key={section} onClick={() => onExplore(section)} className="discovery-shortcut">
            <Icon size={18} aria-hidden="true" /><span><strong>{label}</strong></span>
          </button>
        ))}
      </div>}
      {mode !== 'explore' && <div className="discovery-tastes">
        <div className="discovery-tastes-heading">
          <div><h1>{currentUser?.name ? `Welcome, ${currentUser.name.split(' ')[0]}.` : 'Welcome to SATHI.'}</h1><p>{interests.length ? `Find someone who shares ${interests.slice(0, 2).join(' and ')}.` : 'Choose a few interests to make companion suggestions more relevant. This is optional and editable.'}</p></div>
          <button className="discovery-secondary" onClick={startEditing} disabled={saving} aria-expanded={editing}><SlidersHorizontal size={16} /> {interests.length ? 'Edit interests' : 'Make it yours'}</button>
        </div>
        {editing && <form className="discovery-interest-editor" onSubmit={e => { e.preventDefault(); void save(); }}>
          <fieldset disabled={saving}><legend>What do you enjoy? Choose up to 10.</legend>
            <div className="discovery-interest-options">{options.map(interest => <button key={interest} type="button" aria-pressed={draft.includes(interest)} disabled={!draft.includes(interest) && draft.length >= 10} onClick={() => setDraft(previous => previous.includes(interest) ? previous.filter(value => value !== interest) : [...previous, interest])}>
              {draft.includes(interest) && <Check size={14} aria-hidden="true" />}{interest}
            </button>)}</div>
          </fieldset>
          <fieldset disabled={saving} className="mt-4"><legend>Languages you speak (optional)</legend>
            <div className="discovery-interest-options">{LANGUAGES.map(language => <button key={language} type="button" aria-pressed={draftLanguages.includes(language)} disabled={!draftLanguages.includes(language) && draftLanguages.length >= 6} onClick={() => setDraftLanguages(previous => previous.includes(language) ? previous.filter(value => value !== language) : [...previous, language])}>
              {draftLanguages.includes(language) && <Check size={14} aria-hidden="true" />}{language}
            </button>)}</div>
          </fieldset>
          <fieldset disabled={saving} className="mt-4"><legend>When are you usually free? (optional)</legend>
            <div className="discovery-interest-options">{AVAILABILITY.map(period => <button key={period} type="button" aria-pressed={draftAvailability.includes(period)} onClick={() => setDraftAvailability(previous => previous.includes(period) ? previous.filter(value => value !== period) : [...previous, period])}>
              {draftAvailability.includes(period) && <Check size={14} aria-hidden="true" />}{period}
            </button>)}</div>
          </fieldset>
          <p>We use only what you choose to explain suggestions. You can skip these optional details and edit them later. Saved to your profile.</p>
          {error && <p role="alert" className="text-danger-token">{error}</p>}
          <div className="discovery-editor-actions"><button type="submit" disabled={saving} className="discovery-primary">{saving ? 'Saving…' : 'Save interests'}</button><button type="button" disabled={saving} className="discovery-secondary" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>}
        <span role="status" className={status ? 'discovery-save-status' : 'sr-only'}>{status}</span>
      </div>}
    </section>
  );
}
