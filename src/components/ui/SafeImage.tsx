import React, { useState, useEffect } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackType?: 'avatar' | 'thumbnail' | 'icon';
  textForInitials?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackType = 'thumbnail',
  textForInitials,
  ...props
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reset state if src changes
  useEffect(() => {
    setError(false);
    setLoading(true);
  }, [src]);

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
        src={src || undefined}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        referrerPolicy="no-referrer"
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        {...props}
      />
    </div>
  );
};
