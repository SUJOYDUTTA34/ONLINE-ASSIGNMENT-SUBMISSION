import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';

export type ProgressBarStatus = 'pending' | 'in-progress' | 'complete' | 'error';
export type ProgressBarVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'gradient';
export type ProgressBarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  min?: number;
  label?: React.ReactNode;
  showValue?: boolean;
  status?: ProgressBarStatus;
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  indeterminate?: boolean;
  shimmer?: boolean;
  indicatorClassName?: string;
  formatValue?: (value: number, max: number) => string;
}

const sizeClasses: Record<ProgressBarSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
  xl: 'h-5',
};

const variantClasses: Record<ProgressBarVariant, string> = {
  default: 'bg-neutral-900 dark:bg-white',
  primary: 'bg-blue-600 dark:bg-blue-500',
  success: 'bg-emerald-600 dark:bg-emerald-500',
  warning: 'bg-amber-500 dark:bg-amber-400',
  error: 'bg-rose-600 dark:bg-rose-500',
  gradient: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600',
};

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value = 0,
      max = 100,
      min = 0,
      label,
      showValue = false,
      status,
      variant = 'primary',
      size = 'md',
      indeterminate = false,
      shimmer = true,
      className,
      indicatorClassName,
      formatValue,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const clampedValue = Math.min(Math.max(value, min), max);
    const percentage = Math.round(((clampedValue - min) / (max - min)) * 100);

    const effectiveStatus: ProgressBarStatus =
      status || (percentage >= 100 ? 'complete' : percentage > 0 ? 'in-progress' : 'pending');

    const formattedValue = formatValue
      ? formatValue(clampedValue, max)
      : `${percentage}%`;

    const statusIcons: Record<ProgressBarStatus, React.ReactNode> = {
      pending: <Clock className="w-3.5 h-3.5 text-neutral-400" />,
      'in-progress': <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
      complete: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
      error: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
    };

    return (
      <div
        ref={ref}
        className={cn('w-full flex flex-col gap-1.5', className)}
        {...props}
      >
        {/* Header / Labels */}
        {(label || showValue || status) && (
          <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-1.5">
              {status && statusIcons[effectiveStatus]}
              {label && <span>{label}</span>}
            </div>
            {showValue && !indeterminate && (
              <span className="font-mono text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {formattedValue}
              </span>
            )}
          </div>
        )}

        {/* Track Container */}
        <div
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : clampedValue}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={typeof label === 'string' ? label : ariaLabel || 'Progress'}
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 transition-all',
            sizeClasses[size]
          )}
        >
          {indeterminate ? (
            /* Indeterminate Shimmering Bar */
            <div
              className={cn(
                'absolute inset-y-0 w-1/3 rounded-full animate-indeterminate',
                variantClasses[variant],
                indicatorClassName
              )}
            />
          ) : (
            /* Determinate Fill */
            <div
              className={cn(
                'relative h-full rounded-full transition-all duration-300 ease-out',
                variantClasses[variant],
                indicatorClassName
              )}
              style={{ width: `${percentage}%` }}
            >
              {/* Optional animated shimmer highlight */}
              {shimmer && percentage > 0 && percentage < 100 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
