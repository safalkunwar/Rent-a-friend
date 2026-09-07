import React, { useState, useCallback } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackType?: 'avatar' | 'thumbnail' | 'icon';
  textForInitials?: string;
}

// A new source gets its own readiness state; a late event from the previous
// image cannot hide or fail its replacement.
export const SafeImage: React.FC<SafeImageProps> = (props) => (
  <SafeImageSource key={JSON.stringify([props.src, props.srcSet])} {...props} />
);

const SafeImageSource: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackType = 'thumbnail',
  textForInitials,
  onLoad,
  onError,
  referrerPolicy = 'no-referrer',
  ...props
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cached images can finish before React receives a load event. Never reset
  // readiness in a passive effect after that event has already fired.
  const imageRef = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) {
      if (image.naturalWidth > 0) setLoading(false);
      else setError(true);
    }
  }, []);

  // Handle empty or invalid src up front
  const hasNoSrc = !src || src.trim() === '' || src === 'null' || src === 'undefined';

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const cleanName = name.replace(/[^\w\s-]/g, '').trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (error || hasNoSrc) {
    if (fallbackType === 'avatar') {
      const initials = getInitials(textForInitials || alt);
      return (
        <div
          className={`flex items-center justify-center bg-surface-elevated text-primary-action font-bold border border-border-token select-none ${className}`}
          title={alt}
        >
          {initials !== '?' ? (
            <span className="text-[11px] uppercase tracking-wider">{initials}</span>
          ) : (
            <User className="w-1/2 h-1/2 text-text-muted" />
          )}
        </div>
      );
    }

    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-surface to-surface-elevated border border-border-token text-text-muted relative overflow-hidden select-none ${className}`}
        title={alt}
      >
        <ImageIcon className="w-1/4 h-1/4 text-primary-action/40 mb-1" />
        <span className="text-[9px] text-text-muted/80 font-medium px-2 text-center truncate w-full">{alt}</span>
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-primary-action/30" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-surface-elevated animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary-action/20 border-t-primary-action rounded-full animate-spin" />
        </div>
      )}
      <img
        {...props}
        ref={imageRef}
        src={src || undefined}
        alt={alt}
        loading={props.loading ?? 'lazy'}
        onError={(event) => { setError(true); onError?.(event); }}
        onLoad={(event) => { setLoading(false); onLoad?.(event); }}
        referrerPolicy={referrerPolicy}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  );
};
