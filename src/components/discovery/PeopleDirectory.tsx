import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Companion } from '../../types';
import { PeopleCategoryGroups } from './PeopleCategoryGroups';
import type { PeopleView } from './peopleModes';
export type { PeopleMode, PeopleView } from './peopleModes';

interface Props {
  mode: PeopleView;
  onMode: (mode: PeopleView) => void;
  categoryStep: number;
  onCategoryStep: (step: number) => void;
  companions: Companion[];
  search: string;
  onSearch: (value: string) => void;
  category: string;
  categories: string[];
  onCategory: (value: string) => void;
  onFilters: () => void;
  activeFilters: number;
  onReset: () => void;
  savedOnly: boolean;
  onSavedOnly: (value: boolean) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void | Promise<void>;
  onShowToast?: (message: string, type?: string) => void;
  onViewCompanion: (companion: Companion) => void;
  loading: boolean;
  pagination: React.ReactNode;
  reasonsById?: ReadonlyMap<string, string>;
}

/** Current listings stay separate from service modes whose authoritative projection is not live. */
export function PeopleDirectory(props: Props) {
  const mode: PeopleView = 'all';
  return <section className="people-directory" aria-label="People directory">
    <header><h1>Free companions</h1><p>Discover people using interests, language, available days and your chosen city. These suggestions explain which details overlap.</p></header>
    {mode !== 'all' ? <>
      <div className="people-search-row">
        <label className="people-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search people</span>
          <input value={props.search} onChange={e => props.onSearch(e.target.value)} placeholder="Name, interest or location" type="search" />
        </label>
        <button className="discovery-secondary" onClick={props.onFilters}><SlidersHorizontal size={18} aria-hidden="true" />Filters{props.activeFilters > 0 ? ` (${props.activeFilters})` : ''}</button>
      </div>
      <div className="people-filter-row">
        <label>Interest <select value={props.category} onChange={e => props.onCategory(e.target.value)}>
          <option value="All">All interests</option>
          {[...new Set([...props.categories, ...(props.category !== 'All' ? [props.category] : [])])].map(category => <option key={category}>{category}</option>)}
        </select></label>
        <label className="people-saved"><input type="checkbox" checked={props.savedOnly} onChange={e => props.onSavedOnly(e.target.checked)} /> Saved only</label>
        {(props.search || props.activeFilters > 0 || props.savedOnly || props.category !== 'All') && <button className="discovery-secondary" onClick={props.onReset}>Reset</button>}
      </div>
      {props.companions.length ? <PeopleCategoryGroups companions={props.companions} favorites={props.favorites} selectedCategory={props.category} reasonsById={props.reasonsById}
        onToggleFavorite={props.onToggleFavorite} onViewCompanion={props.onViewCompanion} onShowToast={props.onShowToast ?? (() => {})} />
        : <p className="people-mode-notice" role="status">{props.loading ? 'Loading people…' : 'No matches in the loaded profiles. Try another interest or reset your filters.'}</p>}
      {props.pagination}
    </> : <>
      <div className="people-search-row">
        <label className="people-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search people</span>
          <input value={props.search} onChange={e => props.onSearch(e.target.value)} placeholder="Name, interest or location" type="search" />
        </label>
        <button className="discovery-secondary" onClick={props.onFilters}><SlidersHorizontal size={18} aria-hidden="true" />Filters{props.activeFilters > 0 ? ` (${props.activeFilters})` : ''}</button>
      </div>
      <div className="people-filter-row">
        <label>Interest <select value={props.category} onChange={e => props.onCategory(e.target.value)}>
          <option value="All">All interests</option>
          {[...new Set([...props.categories, ...(props.category !== 'All' ? [props.category] : [])])].map(category => <option key={category}>{category}</option>)}
        </select></label>
        <label className="people-saved"><input type="checkbox" checked={props.savedOnly} onChange={e => props.onSavedOnly(e.target.checked)} /> Saved only</label>
        {(props.search || props.activeFilters > 0 || props.savedOnly || props.category !== 'All') && <button className="discovery-secondary" onClick={props.onReset}>Reset</button>}
      </div>
      {props.companions.length ? <PeopleCategoryGroups companions={props.companions} favorites={props.favorites} selectedCategory={props.category} reasonsById={props.reasonsById}
        onToggleFavorite={props.onToggleFavorite} onViewCompanion={props.onViewCompanion} onShowToast={props.onShowToast ?? (() => {})} />
        : <p className="people-mode-notice" role="status">{props.loading ? 'Loading people…' : 'No matches in the loaded profiles. Try another interest or reset your filters.'}</p>}
      {props.pagination}
    </>}
  </section>;
}
