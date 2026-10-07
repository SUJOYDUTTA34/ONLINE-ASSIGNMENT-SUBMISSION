import * as React from 'react';
import { cn } from '@/lib/utils';

export const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800', className)}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

export const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt = '', ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    if (hasError || !props.src) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-neutral-200 dark:bg-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300 uppercase">
          {alt ? alt.slice(0, 2) : 'AV'}
        </div>
      );
    }

    return (
      <img
        ref={ref}
        alt={alt}
        onError={() => setHasError(true)}
        className={cn('aspect-square h-full w-full object-cover', className)}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300',
        className
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = 'AvatarFallback';
