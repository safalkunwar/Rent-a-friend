import React from 'react';
import { Companion } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { Heart, MapPin, Star, ArrowRight } from 'lucide-react';

interface CompanionCardProps {
  companion: Companion;
  isFav?: boolean;
  onToggleFavorite?: (companionId: string) => void;
  onViewCompanion?: (companion: Companion) => void;
  onShowToast?: (message: string, type?: string) => void;
  layout?: 'default' | 'compact' | 'featured';
}

export const CompanionCard: React.FC<CompanionCardProps> = ({
  companion,
  isFav = false,
  onToggleFavorite,
  onViewCompanion,
  onShowToast,
  layout = 'default',
}) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(companion.id);
    onShowToast?.(isFav ? "Removed from saved" : "Saved companion!", "success");
  };

  const handleCardClick = () => {
    onViewCompanion?.(companion);
  };

  if (layout === 'compact') {
    return (
      <div
        onClick={handleCardClick}
        className="shrink-0 w-40 bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-lg flex flex-col snap-start cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left"
      >
        <div className="relative h-36 bg-surface-elevated">
          <SafeImage src={companion.imageUrl} className="w-full h-full object-cover" alt={companion.name} fallbackType="thumbnail" />
          {companion.isVerified && (
            <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7px] text-primary-action font-extrabold flex items-center gap-0.5 border border-primary-action/20">
              VERIFIED
            </span>
          )}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-text-primary hover:bg-black/60 transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-red-500 fill-current' : 'text-text-primary'}`} />
            </button>
          )}
        </div>
        <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold text-text-primary truncate">
              {companion.name}, {companion.age}
            </h4>
            <div className="flex items-center gap-1 text-[9px] text-text-secondary">
              <MapPin className="w-2.5 h-2.5 text-primary-action" />
              <span className="truncate">{companion.location}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-primary-action font-bold">
              <Star className="w-2.5 h-2.5 fill-current" />
              <span>{companion.rating} ({companion.reviewsCount || 0})</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
            <div>
              <p className="text-[7px] text-text-secondary uppercase font-bold leading-none">Rate</p>
              <p className="text-[10px] font-black text-primary-action mt-0.5">NPR {companion.hourlyRate}/hr</p>
            </div>
            <div className="w-5 h-5 rounded-full bg-primary-action flex items-center justify-center text-background shadow-md">
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'featured') {
    return (
      <div
        onClick={handleCardClick}
        className="shrink-0 w-72 bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-xl flex flex-col snap-start cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left"
      >
        <div className="relative h-52 bg-surface-elevated">
          <SafeImage src={companion.imageUrl} className="w-full h-full object-cover" alt={companion.name} fallbackType="thumbnail" />
          {companion.isVerified && (
            <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] text-primary-action font-extrabold flex items-center gap-0.5 border border-primary-action/20">
              VERIFIED
            </span>
          )}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
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
      className="shrink-0 w-44 bg-surface rounded-[24px] border border-white/5 overflow-hidden shadow-xl flex flex-col snap-start cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left"
    >
      <div className="relative h-44 bg-surface-elevated">
        <SafeImage src={companion.imageUrl} className="w-full h-full object-cover" alt={companion.name} fallbackType="thumbnail" />
        {companion.isVerified && (
          <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] text-primary-action font-extrabold flex items-center gap-0.5 border border-primary-action/20">
            VERIFIED
          </span>
        )}
        {onToggleFavorite && (
          <button
            onClick={handleFavoriteClick}
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
