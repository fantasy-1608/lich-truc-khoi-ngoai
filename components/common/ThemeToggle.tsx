import React, { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useTheme } from '../../hooks/useTheme';
import { SunIcon } from '../icons/SunIcon';
import { MoonIcon } from '../icons/MoonIcon';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const transitioning = useRef(false);

  // Lucian #219 circular reveal. One live UI; snapshots avoid duplicating controls.
  const handleToggle = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (transitioning.current) return;
    if (
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      toggleTheme();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    transitioning.current = true;
    document.documentElement.dataset.themeReveal = 'true';
    const transition = document.startViewTransition(() => flushSync(toggleTheme));
    try {
      await transition.ready;
      await document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 700,
          easing: 'cubic-bezier(.65,0,.35,1)',
          pseudoElement: '::view-transition-new(root)',
        },
      ).finished;
    } catch {
      // Unsupported snapshot animation still leaves the selected theme applied.
    } finally {
      await transition.finished.catch(() => {});
      delete document.documentElement.dataset.themeReveal;
      transitioning.current = false;
    }
  };

  return (
    <button
      onClick={(event) => {
        void handleToggle(event);
      }}
      className="app-icon-button theme-reveal-button"
      aria-label={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
      aria-pressed={theme === 'dark'}
      title={theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}
    >
      <span key={theme} className="theme-reveal-icon" aria-hidden="true">
        {theme === 'light' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
      </span>
    </button>
  );
};

export default ThemeToggle;
