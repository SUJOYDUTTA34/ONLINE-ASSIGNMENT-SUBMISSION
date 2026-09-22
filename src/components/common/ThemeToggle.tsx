import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { playAudioEffect } from '../../lib/audio';

interface ThemeToggleProps {
  id?: string;
  variant?: 'button' | 'pill' | 'switch' | 'compact';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  id = 'theme-toggle-btn',
  variant = 'button',
  className = '',
  showLabel = false,
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const syncTheme = () => {
      const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
      setIsDark(dark);
    };

    window.addEventListener('storage', syncTheme);
    window.addEventListener('theme-changed', syncTheme);
    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('theme-changed', syncTheme);
    };
  }, []);

  const toggleTheme = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const nextDark = !isDark;
    setIsDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    try {
      playAudioEffect('chime');
    } catch {
      // silent fallback
    }

    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark: nextDark } }));
  };

  if (variant === 'switch') {
    return (
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={`relative inline-flex h-7 w-13 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
          isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-200 border border-slate-300'
        } ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span
          className={`pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md transition duration-200 ease-in-out text-slate-700 dark:text-amber-400 ${
            isDark ? 'translate-x-6' : 'translate-x-0'
          }`}
        >
          {isDark ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
        </span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        id={id}
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs ${
          isDark
            ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-slate-700'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
        } ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-slate-600" />
            <span>Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      id={id}
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 sm:p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer shadow-xs ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border-slate-700/80 hover:border-slate-600 shadow-slate-950/20'
          : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200/90 hover:border-slate-300 shadow-slate-200/40'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 transition-transform duration-300 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="ml-1.5 text-xs font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
