import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'User',
  className = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);

  // Derive initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm font-semibold',
    xl: 'w-24 h-24 text-2xl font-bold',
  };

  if (!src || hasError) {
    return (
      <div
        className={`rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 select-none shadow-xs font-semibold ${sizeClasses[size]} ${className}`}
        title={name}
      >
        {initials || <UserIcon className="w-1/2 h-1/2" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setHasError(true)}
      className={`rounded-full object-cover shrink-0 ${sizeClasses[size]} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
