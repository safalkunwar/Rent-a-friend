import React from 'react';
import { SafeImage } from './SafeImage';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  isVerified?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  isOnline = false,
  isVerified = false,
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl'
  };

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <SafeImage
        src={src}
        alt={alt}
        fallbackType="avatar"
        textForInitials={alt}
        className={`rounded-full object-cover ${sizeClasses[size]} border border-[#2A2D31]/40 shadow-sm`}
      />
      {isOnline && (
        <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-[#22C55E] ring-2 ring-[#0F1113] theme-light:ring-white" />
      )}
    </div>
  );
};
