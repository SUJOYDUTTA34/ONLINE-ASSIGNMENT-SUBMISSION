import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

export interface ShinyButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: React.ReactNode;
  variant?:
    | 'primary'
    | 'dark'
    | 'outline'
    | 'secondary'
    | 'emerald'
    | 'danger'
    | 'ghost';
  size?: 'responsive' | 'sm' | 'md' | 'lg' | 'icon';
  shimmerColor?: string;
  shimmerDuration?: number;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

export const ShinyButton = React.forwardRef<HTMLButtonElement, ShinyButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'responsive',
      shimmerColor,
      shimmerDuration = 3,
      icon,
      iconPosition = 'left',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    // Responsive auto-sizing for Mobile, Tablet, Laptop, and PC
    const sizeClasses = {
      responsive:
        'text-xs sm:text-xs md:text-sm lg:text-sm xl:text-base py-2.5 px-4 sm:py-2.5 sm:px-4.5 md:py-3 md:px-5 lg:py-3 lg:px-6 xl:py-3.5 xl:px-7 min-h-[44px] sm:min-h-[42px] md:min-h-[44px] lg:min-h-[46px] rounded-xl sm:rounded-xl md:rounded-2xl',
      sm: 'text-xs py-2 px-3.5 min-h-[38px] rounded-xl',
      md: 'text-xs sm:text-sm py-2.5 px-4.5 min-h-[44px] rounded-xl',
      lg: 'text-sm sm:text-base py-3.5 px-6.5 min-h-[48px] rounded-2xl',
      icon: 'p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl',
    };

    // Color theme variants
    const variantClasses = {
      primary:
        'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/80 shadow-md shadow-blue-600/25 dark:shadow-blue-900/40',
      dark: 'bg-[#18181b] hover:bg-black text-white dark:bg-white dark:text-[#18181b] dark:hover:bg-neutral-100 border border-neutral-800 dark:border-neutral-200 shadow-md shadow-neutral-950/20 dark:shadow-white/10',
      outline:
        'bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs hover:border-slate-400 dark:hover:border-slate-600 backdrop-blur-xs',
      secondary:
        'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs',
      emerald:
        'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/80 shadow-md shadow-emerald-600/25',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white border border-rose-500/80 shadow-md shadow-rose-600/25',
      ghost:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-transparent shadow-none',
    };

    const isLightVariant = variant === 'outline' || variant === 'secondary' || variant === 'ghost';
    const defaultShimmer = shimmerColor || (isLightVariant ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.35)');

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        disabled={disabled}
        className={cn(
          'group relative inline-flex items-center justify-center gap-2 overflow-hidden font-semibold transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {/* Animated Shimmer Wave Effect */}
        <motion.span
          className="absolute inset-0 block pointer-events-none -z-0 -skew-x-12"
          initial={{ x: '-150%' }}
          animate={{ x: '150%' }}
          transition={{
            repeat: Infinity,
            repeatDelay: 2.2,
            duration: shimmerDuration,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${defaultShimmer} 50%, transparent 100%)`,
          }}
          aria-hidden="true"
        />

        {/* Ambient Top Highlight Sheen */}
        <span
          className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Icon & Content */}
        <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
          {icon && iconPosition === 'left' && (
            <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
              {icon}
            </span>
          )}
        </span>
      </motion.button>
    );
  }
);

ShinyButton.displayName = 'ShinyButton';

export default ShinyButton;
