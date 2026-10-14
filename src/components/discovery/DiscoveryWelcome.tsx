import React, { useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, Compass, Heart, SlidersHorizontal, Users } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { searchStrings } from '../../services/discoverySearch';

const INTERESTS = ['Hiking Partner', 'Coffee Buddy', 'Food Explorer', 'Photography Guide', 'Cultural Guide', 'Travel Companion', 'Local Host', 'Cycling Guide', 'Yoga Instructor', 'Language Exchange Partner'];

interface Props {
  mode?: 'home' | 'explore';
  onExplore: (section?: string) => void;
  availableInterests?: string[];
}

/** Shared presentation: profile interests use the existing authenticated repository. */
export function DiscoveryWelcome({ mode = 'home', onExplore, availableInterests = [] }: Props) {
  const { currentUser, updateUserProfile, openAuthModal } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const interests = searchStrings(currentUser?.interests);
  const options = [...new Set([...interests, ...availableInterests, ...INTERESTS])];
  const startEditing = () => {
    if (!currentUser || currentUser.role === 'guest') { openAuthModal(); return; }
    setDraft([...interests]); setError(''); setStatus(''); setEditing(true);
  };
  const save = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try {
      await updateUserProfile({ interests: draft });
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
      {mode === 'home' ? <div className="discovery-shortcuts" aria-label="Explore by type">
        {[
          { section: 'companions', label: 'Find a Sathi', Icon: Users },
          { section: 'activities', label: 'Activities', Icon: Compass },
          { section: 'events', label: 'Events', Icon: CalendarDays },
        ].map(({ section, label, Icon }) => (
          <button key={section} onClick={() => onExplore(section)} className="discovery-shortcut">
            <Icon size={18} aria-hidden="true" /><span><strong>{label}</strong></span>
          </button>
        ))}
      </div> : <button className="discovery-secondary mt-4" onClick={() => onExplore('community')}><Heart size={16} /> From the community <ArrowUpRight size={16} /></button>}
      {mode === 'home' && <div className="discovery-tastes">
        <div className="discovery-tastes-heading">
          <div><h1>{currentUser?.name ? `Welcome, ${currentUser.name.split(' ')[0]}.` : 'Welcome to SATHI.'}</h1><p>{interests.length ? `Find someone who shares ${interests.slice(0, 2).join(' and ')}.` : 'Find someone to explore with today.'}</p></div>
          <button className="discovery-secondary" onClick={startEditing} disabled={saving} aria-expanded={editing}><SlidersHorizontal size={16} /> {interests.length ? 'Edit interests' : 'Make it yours'}</button>
        </div>
        {editing && <form className="discovery-interest-editor" onSubmit={e => { e.preventDefault(); void save(); }}>
          <fieldset disabled={saving}><legend>What do you enjoy? Choose up to 10.</legend>
            <div className="discovery-interest-options">{options.map(interest => <button key={interest} type="button" aria-pressed={draft.includes(interest)} disabled={!draft.includes(interest) && draft.length >= 10} onClick={() => setDraft(previous => previous.includes(interest) ? previous.filter(value => value !== interest) : [...previous, interest])}>
              {draft.includes(interest) && <Check size={14} aria-hidden="true" />}{interest}
            </button>)}</div>
          </fieldset>
          <p>We prioritise matching categories, while keeping other discoveries in your feed. Saved to your profile.</p>
          {error && <p role="alert" className="text-danger-token">{error}</p>}
          <div className="discovery-editor-actions"><button type="submit" disabled={saving} className="discovery-primary">{saving ? 'Saving…' : 'Save interests'}</button><button type="button" disabled={saving} className="discovery-secondary" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>}
        <span role="status" className={status ? 'discovery-save-status' : 'sr-only'}>{status}</span>
      </div>}
    </section>
  );
}
