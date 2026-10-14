import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, FlaskConical, MapPin, Search, Users, X } from 'lucide-react';
import { PeopleCategoryGroups } from '../components/discovery/PeopleCategoryGroups';
import { filterTestPeople, MODE_LABELS, PEOPLE_FIXTURES, TEST_CATEGORIES, type TestCompanion, type TestMode, type TestState } from './peopleFixtures';

const ignore = () => {};
const STATE_LABELS = { ready: 'Discovery-ready example', review_pending: 'Review pending example', unavailable: 'Unavailable example' };

export function PeopleStagePreview() {
  const [mode, setMode] = useState<TestMode | 'all'>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [state, setState] = useState<TestState | 'all'>('all');
  const [selected, setSelected] = useState<TestCompanion | null>(null);
  const [dark, setDark] = useState(false);
  const detail = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) { detail.current?.scrollIntoView?.({ block: 'center' }); detail.current?.focus({ preventScroll: true }); }
  }, [selected]);
  const people = filterTestPeople({ mode, query, category, state });
  const changeFilter = (action: () => void) => { action(); setSelected(null); };
  return <div className="stage-preview min-h-screen bg-background text-text-primary">
    <header className="stage-preview-header"><a href="/companions"><ArrowLeft size={16} /> Back to People</a><span><FlaskConical size={16} /> Local test view</span><button onClick={() => { document.documentElement.classList.toggle('theme-light', dark); setDark(!dark); }}>{dark ? 'Light theme' : 'Dark theme'}</button></header>
    <main className="mx-auto max-w-6xl px-4 sm:px-8 py-8 space-y-7">
      <div className="stage-preview-notice" role="note"><strong>24 fictional companions · no live actions</strong><p>Layout tests only. These profiles are not accounts, and cannot receive messages, bookings or payments. Nothing here is saved to Firebase.</p></div>
      <section className="stage-preview-intro"><div><p className="discovery-eyebrow">YOUR KIND OF COMPANY</p><h1>Find your people.<br /><span>Make room for a good day.</span></h1><p>Start with a shared interest. Choose a friend, a local host, or a guide.</p></div><img src="/sathi-logo-circle.png" alt="SATHI" /></section>
      <nav aria-label="People service modes" className="stage-mode-tabs">
        {(['all', 'free_friend', 'local_host', 'guide'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => changeFilter(() => setMode(value))}>
          <strong>{value === 'all' ? 'All people' : `${MODE_LABELS[value]}s`}</strong><small>{value === 'all' ? 'Explore every type' : value === 'free_friend' ? 'Shared interests · NPR 0' : value === 'local_host' ? 'Local experiences · Phase 2' : 'Agency-led · Phase 4'}</small>
        </button>)}
      </nav>
      <div className="stage-preview-filters">
        <label className="stage-search"><Search size={18} /><input aria-label="Search test companions" placeholder="Name, city or interest" value={query} onChange={event => changeFilter(() => setQuery(event.target.value))} /></label>
        <label>Category<select value={category} onChange={event => changeFilter(() => setCategory(event.target.value))}>{['All', ...TEST_CATEGORIES].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Test state<select value={state} onChange={event => changeFilter(() => setState(event.target.value as TestState | 'all'))}><option value="all">All states</option>{Object.entries(STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap justify-between gap-3 items-center"><p role="status" className="text-sm text-text-secondary">{people.length} of {PEOPLE_FIXTURES.length} test companions</p><button className="discovery-secondary" onClick={() => { setMode('all'); setCategory('All'); setQuery(''); setState('all'); setSelected(null); }}>Reset view</button></div>
      {selected && <section ref={detail} tabIndex={-1} className="stage-preview-detail" aria-label="Test profile details"><div className="flex items-start justify-between gap-4"><div><p className="discovery-eyebrow">FICTIONAL PROFILE PREVIEW</p><h2 className="text-xl font-semibold mt-2">{selected.name}</h2></div><button className="discovery-secondary" aria-label="Close test profile" onClick={() => setSelected(null)}><X size={18} /></button></div><p>{selected.bio}</p><p>{selected.mode === 'guide' ? `Agency: ${selected.agency}. Real guide eligibility would require independently verified credentials and affiliation.` : selected.mode === 'free_friend' ? 'Hangout fee: NPR 0. Real requests and messaging require the Phase 2 acceptance/entitlement flow.' : 'Real host requests require eligibility checks; paid checkout remains gated by Phase 5.'}</p><button className="discovery-primary" disabled>{selected.mode === 'free_friend' ? 'Hangout requests unavailable in preview' : 'Booking unavailable in preview'}</button></section>}
      {people.length ? <PeopleCategoryGroups companions={people} favorites={[]} onToggleFavorite={ignore} onViewCompanion={ignore} onShowToast={ignore} renderCard={person => {
        const sample = person as TestCompanion;
        return <article className="stage-person-card">
          <div className={`stage-person-art stage-person-art--${sample.mode}`}><span className="stage-fixture-label">TEST PROFILE</span><span className="stage-initials" aria-hidden="true">{sample.name.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><span className="stage-mode-label">{MODE_LABELS[sample.mode]}</span></div>
          <div className="stage-person-body"><div><h4>{sample.name}</h4><p className="flex gap-1.5 items-center"><MapPin size={14} />{sample.location}</p></div><p>{sample.languages.join(' · ')}</p><p className="stage-person-state"><Users size={14} /> {STATE_LABELS[sample.testState]}</p>{sample.agency && <p className="stage-agency">{sample.agency}</p>}<div className="stage-person-footer"><div><small>{sample.mode === 'free_friend' ? 'Hangout fee' : 'Example rate'}</small><strong>NPR {sample.hourlyRate}{sample.mode !== 'free_friend' && <small> / hour</small>}</strong></div><button className="discovery-secondary" onClick={() => setSelected(sample)}>Preview <ArrowUpRight size={16} /></button></div></div>
        </article>;
      }} /> : <div className="stage-preview-notice"><h2>No test companions match</h2><p>Change a filter or reset the view. No fallback people are inserted.</p></div>}
      <footer className="text-sm text-text-secondary border-t border-border-token pt-6">Design coverage: Phase 1 review states · Phase 2 Friends/Hosts · Phase 4 Guides · Phase 10 categorized discovery. These phases are not certified or activated by this preview.</footer>
    </main>
  </div>;
}
