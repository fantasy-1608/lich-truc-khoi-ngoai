import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { SunIcon } from '../icons/SunIcon';
import { MoonIcon } from '../icons/MoonIcon';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-slate-700 hover:text-amber-600 dark:hover:text-yellow-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      aria-label="Toggle Dark Mode"
    >
      {theme === 'light' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
};

export default ThemeToggle;
