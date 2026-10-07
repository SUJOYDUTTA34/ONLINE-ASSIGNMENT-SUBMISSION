import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectContextValue {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Select({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  open: controlledOpen,
  onOpenChange,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const isControlledValue = controlledValue !== undefined;
  const activeValue = isControlledValue ? controlledValue : uncontrolledValue;

  const isControlledOpen = controlledOpen !== undefined;
  const isOpen = isControlledOpen ? controlledOpen : uncontrolledOpen;

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (!isControlledValue) setUncontrolledValue(newVal);
      onValueChange?.(newVal);
      if (!isControlledOpen) setUncontrolledOpen(false);
      onOpenChange?.(false);
    },
    [isControlledValue, onValueChange, isControlledOpen, onOpenChange]
  );

  const handleSetOpen: React.Dispatch<React.SetStateAction<boolean>> = React.useCallback(
    (action) => {
      const nextOpen = typeof action === 'function' ? action(isOpen) : action;
      if (!isControlledOpen) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlledOpen, isOpen, onOpenChange]
  );

  return (
    <SelectContext.Provider
      value={{
        value: activeValue,
        onValueChange: handleValueChange,
        open: isOpen,
        setOpen: handleSetOpen,
      }}
    >
      <div className="relative w-full inline-block text-left">{children}</div>
    </SelectContext.Provider>
  );
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);

  return (
    <button
      ref={ref}
      type="button"
      role="combobox"
      aria-expanded={context?.open}
      onClick={() => context?.setOpen((prev) => !prev)}
      className={cn(
        'flex h-12 w-full items-center justify-between rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      <div className="flex-1 flex items-center min-w-0 mr-2">{children}</div>
      <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200" />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        context?.setOpen(false);
      }
    }
    if (context?.open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [context?.open, context]);

  if (!context?.open) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[8rem] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xl animate-in fade-in-0 zoom-in-95 p-1 max-h-60 overflow-y-auto',
        className
      )}
      {...props}
    >
      <div ref={ref} className="space-y-0.5">{children}</div>
    </div>
  );
});
SelectContent.displayName = 'SelectContent';

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        onClick={() => context?.onValueChange(value)}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-xs sm:text-sm font-medium outline-none transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:bg-neutral-100 dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100',
          isSelected && 'bg-neutral-100 dark:bg-neutral-800 font-semibold',
          className
        )}
        {...props}
      >
        <span className="truncate">{children}</span>
        {isSelected && (
          <span className="absolute right-2.5 flex h-3.5 w-3.5 items-center justify-center text-neutral-900 dark:text-neutral-100">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

export const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  return (
    <span ref={ref} className={cn('truncate', className)} {...props}>
      {context?.value || placeholder || ''}
    </span>
  );
});
SelectValue.displayName = 'SelectValue';
