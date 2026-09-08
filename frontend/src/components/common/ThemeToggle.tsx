import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';
import { useI18n } from '../../i18n/LanguageContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'segmented';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'icon', className }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { t } = useI18n();

  if (variant === 'segmented') {
    return (
      <div className={clsx('inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-xs', className)}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            theme === 'light'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
          )}
          title="Light Theme"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            theme === 'dark'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
          )}
          title="Dark Mission Control"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            theme === 'system'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
          )}
          title="Match System Preference"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>System</span>
        </button>
      </div>
    );
  }

  // Default 'icon' button variant
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={clsx(
        'ui-chip relative p-2 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500/40',
        resolvedTheme === 'dark'
          ? 'text-amber-300 hover:text-amber-200 hover:bg-[#1a2438] hover:border-white/16'
          : 'text-slate-600 hover:text-blue-600 hover:border-slate-300',
        className
      )}
      title={resolvedTheme === 'dark' ? t('THEME_LIGHT') : t('THEME_DARK')}
      aria-label={resolvedTheme === 'dark' ? t('THEME_LIGHT') : t('THEME_DARK')}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
};

export default ThemeToggle;
