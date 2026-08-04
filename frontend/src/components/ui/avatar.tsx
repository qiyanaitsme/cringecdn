import * as React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt = '', className }) => (
  <div
    className={`relative flex h-9 w-9 max-h-9 max-w-9 overflow-hidden rounded-full border bg-muted ${className || ''}`}
  >
    {src ? (
      <img src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-muted/50 text-xs">
        {alt?.[0]?.toUpperCase() || '?'}
      </div>
    )}
  </div>
);
Avatar.displayName = 'Avatar';

export { Avatar };