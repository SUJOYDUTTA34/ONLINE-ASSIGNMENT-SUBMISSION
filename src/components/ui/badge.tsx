import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900 shadow-xs',
    secondary: 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50',
    destructive: 'bg-red-500 text-neutral-50 dark:bg-red-900 dark:text-neutral-50 shadow-xs',
    outline: 'border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
