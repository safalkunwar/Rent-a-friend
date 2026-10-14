import React, { useState } from 'react';
import { Companion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { Heart, MapPin, Star, ArrowRight } from 'lucide-react';
import { canDisplayCompanionApproval } from '../../services/bookingEligibility';
import { bookingV2PresentationEnabled } from '../../services/releaseGates';

interface CompanionCardProps {
  companion: Companion;
  isFav?: boolean;
  onToggleFavorite?: (companionId: string) => void | Promise<void>;
  onViewCompanion?: (companion: Companion) => void;
  onShowToast?: (message: string, type?: string) => void;
  layout?: 'default' | 'compact' | 'featured' | 'home';
  relevanceReason?: string | null;
}

export const CompanionCard: React.FC<CompanionCardProps> = ({
  companion,
  isFav = false,
  onToggleFavorite,
  onViewCompanion,
  onShowToast,
  layout = 'default',
  relevanceReason,
}) => {
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleFavorite || favoriteSaving) return;
    setFavoriteSaving(true);
    try {
      await onToggleFavorite(companion.id);
    } catch {
      onShowToast?.('Could not update saved people. Please try again.', 'error');
    } finally {
      setFavoriteSaving(false);
    }
  };

  const handleCardClick = () => {
    onViewCompanion?.(companion);
  };

  if (layout === 'home') {
    return (
      <article className="home-person-card bg-surface rounded-2xl border border-border-token overflow-hidden min-w-0 flex flex-col text-left">
        <div className="home-person-photo relative bg-surface-elevated">
          <SafeImage src={companion.imageUrl || companion.images?.[0]} className="w-full h-full object-cover" alt={companion.name} fallbackType="thumbnail" />
          {onToggleFavorite && <button type="button" onClick={handleFavoriteClick} disabled={favoriteSaving} aria-busy={favoriteSaving} aria-label={`${isFav ? 'Unsave' : 'Save'} ${companion.name}`} aria-pressed={isFav} className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-surface border border-border-token flex items-center justify-center text-text-primary disabled:opacity-60">
            <Heart aria-hidden="true" className={`w-4 h-4 ${isFav ? 'text-red-500 fill-current' : ''}`} />
          </button>}
        </div>
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="text-base font-semibold text-text-primary leading-snug">{companion.name}</h3>
          {companion.location && <p className="text-sm text-text-secondary flex items-center gap-1"><MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /><span className="truncate">{companion.location}</span></p>}
          {relevanceReason && <p className="text-sm text-text-secondary">{relevanceReason}</p>}
          {Number.isFinite(companion.hourlyRate) && companion.hourlyRate > 0 && <p className="text-sm text-text-secondary">Listed rate · NPR {companion.hourlyRate}/hr</p>}
          <button type="button" onClick={handleCardClick} className="discovery-secondary w-full mt-auto" aria-label={`View ${companion.name}'s profile`}>View profile <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </article>
    );
  }

  if (layout === 'compact') {
    return (
      <div className="people-profile-card shrink-0 w-44 bg-surface rounded-2xl border border-border-token overflow-hidden flex flex-col snap-start text-left">
        <div className="relative h-40 bg-surface-elevated">
          <SafeImage src={companion.imageUrl} className="w-full h-full object-cover" alt={companion.name} fallbackType="thumbnail" />
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              disabled={favoriteSaving}
              aria-busy={favoriteSaving}
              aria-label={`${isFav ? 'Unsave' : 'Save'} ${companion.name}`}
              aria-pressed={isFav}
              className="absolute top-2 right-2 w-11 h-11 rounded-full bg-surface border border-border-token flex items-center justify-center text-text-primary"
            >
              <Heart aria-hidden="true" className={`w-4 h-4 ${isFav ? 'text-red-500 fill-current' : 'text-text-primary'}`} />
            </button>
          )}
        </div>
        <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-text-primary">
              {companion.name}{companion.age > 0 ? `, ${companion.age}` : ''}
            </h4>
            <div className="flex items-center gap-1 text-sm text-text-secondary">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="truncate">{companion.location}</span>
            </div>
            {companion.reviewsCount > 0 && companion.rating > 0 && <div className="flex items-center gap-1 text-sm text-text-secondary">
              <Star className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{companion.rating} ({companion.reviewsCount || 0})</span>
            </div>}
          </div>
          <div className="space-y-3 pt-3">
            <p className="text-sm text-text-secondary">{Number.isFinite(companion.hourlyRate) && companion.hourlyRate >= 0 ? `Listed rate · NPR ${companion.hourlyRate}/hr` : 'Rate not listed'}</p>
            <button onClick={handleCardClick} className="discovery-secondary w-full" aria-label={`View ${companion.name}'s profile`}>View profile <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'featured') {
    return (
      <div
        onClick={handleCardClick}
        className="shrink-0 w-80 bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-xl flex flex-col snap-start cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left"
      >
        <div className="relative h-56 bg-surface-elevated">
          <SafeImage src={companion.imageUrl} className="w-full h-full object-cover" alt={companion.name} fallbackType="thumbnail" />
          {canDisplayCompanionApproval(companion, bookingV2PresentationEnabled) && (
            <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] text-primary-action font-extrabold flex items-center gap-0.5 border border-primary-action/20">
              APPLICATION APPROVED
            </span>
          )}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              disabled={favoriteSaving}
              aria-busy={favoriteSaving}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-text-primary hover:bg-black/60 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-current' : 'text-text-primary'}`} />
            </button>
          )}
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-text-primary truncate flex items-center gap-1">
              {companion.name}, {companion.age}
            </h4>
            <div className="flex items-center gap-1 text-[10px] text-text-secondary">
              <MapPin className="w-3 h-3 text-primary-action" />
              <span className="truncate">{companion.location}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-primary-action font-bold">
              <Star className="w-3 h-3 fill-current" />
              <span>{companion.rating} ({companion.reviewsCount || 0})</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <div>
              <p className="text-[8px] text-text-secondary uppercase font-bold leading-none">Rate</p>
              <p className="text-xs font-black text-primary-action mt-0.5">NPR {companion.hourlyRate}/hr</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-primary-action flex items-center justify-center text-background shadow-md">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className="shrink-0 w-48 bg-surface rounded-[24px] border border-white/5 overflow-hidden shadow-xl flex flex-col snap-start cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left"
    >
      <div className="relative h-48 bg-surface-elevated">
        <SafeImage src={companion.imageUrl} className="w-full h-full object-cover" alt={companion.name} fallbackType="thumbnail" />
        {canDisplayCompanionApproval(companion, bookingV2PresentationEnabled) && (
          <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] text-primary-action font-extrabold flex items-center gap-0.5 border border-primary-action/20">
            APPLICATION APPROVED
          </span>
        )}
        {onToggleFavorite && (
          <button
            onClick={handleFavoriteClick}
            disabled={favoriteSaving}
            aria-busy={favoriteSaving}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-text-primary hover:bg-black/60 transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-current' : 'text-text-primary'}`} />
          </button>
        )}
      </div>
      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-text-primary truncate flex items-center gap-1">
            {companion.name}, {companion.age}
          </h4>
          <div className="flex items-center gap-1 text-[10px] text-text-secondary">
            <MapPin className="w-3 h-3 text-primary-action" />
            <span className="truncate">{companion.location}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-primary-action font-bold">
            <Star className="w-3 h-3 fill-current" />
            <span>{companion.rating} ({companion.reviewsCount || 0})</span>
          </div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <div>
            <p className="text-[8px] text-text-secondary uppercase font-bold leading-none">Rate</p>
            <p className="text-xs font-black text-primary-action mt-0.5">NPR {companion.hourlyRate}/hr</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary-action flex items-center justify-center text-background shadow-md">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
