import React from 'react';
import type { Companion } from '../../types';
import { useCompanionCategories } from '../../hooks/useCompanionCategories';
import { CompanionCard } from '../companions/CompanionCard';

interface Props {
  companions: Companion[];
  favorites: string[];
  onToggleFavorite: (id: string) => void | Promise<void>;
  onViewCompanion: (companion: Companion) => void;
  onShowToast: (message: string, type?: string) => void;
  renderCard?: (companion: Companion) => React.ReactNode;
  selectedCategory?: string;
}

/** Group the already-filtered page; never fetch or duplicate people per interest. */
export function PeopleCategoryGroups({ companions, favorites, onToggleFavorite, onViewCompanion, onShowToast, renderCard, selectedCategory = 'All' }: Props) {
  const primaryGroups = useCompanionCategories(companions);
  // The parent has already filtered matches, including secondary interests.
  // Label that result set with the selected interest, without rewriting profiles.
  const groups = selectedCategory !== 'All' && companions.length
    ? [{ category: selectedCategory, emoji: primaryGroups.find(group => group.category === selectedCategory)?.emoji || '✨', companions }]
    : primaryGroups;
  return <div className="people-category-groups space-y-7">
    {groups.map(group => <section key={group.category} aria-label={`${group.category} people`} className="space-y-4">
      <div className="flex items-center gap-3 border-b border-border-token pb-3">
        <span aria-hidden="true" className="text-xl">{group.emoji}</span>
        <h3 className="text-lg font-semibold text-text-primary">{group.category}</h3>
        <span className="ml-auto shrink-0 text-xs text-text-secondary rounded-full bg-surface-elevated px-3 py-1.5">{group.companions.length} {group.companions.length === 1 ? 'person' : 'people'}</span>
      </div>
      <div className="people-category-grid">
        {group.companions.map(companion => renderCard ? <React.Fragment key={companion.id}>{renderCard(companion)}</React.Fragment> : <CompanionCard key={companion.id} companion={companion}
          isFav={favorites.includes(companion.id)} onToggleFavorite={onToggleFavorite}
          onViewCompanion={onViewCompanion} onShowToast={onShowToast} layout="compact" />)}
      </div>
    </section>)}
  </div>;
}
