import React, { useEffect, useRef, useState } from 'react';
import { View } from '../../types';
import { GearIcon } from '../icons/GearIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { LockIcon } from '../icons/LockIcon';
import { UnlockIcon } from '../icons/UnlockIcon';
import ThemeToggle from '../common/ThemeToggle';

interface HeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  onToggleSettings: () => void;
  showEditLock?: boolean;
  canEdit?: boolean;
  onToggleEditLock?: () => void;
}

const TAB_CONFIG = [
  {
    id: View.SCHEDULE,
    label: 'Khối ngoại',
    mobileLabel: 'Khối ngoại',
    ariaLabel: 'Xem lịch trực Khối Ngoại',
  },
  {
    id: View.DEPARTMENT_SCHEDULE,
    label: 'Hoạt động khoa',
    mobileLabel: 'Khoa',
    ariaLabel: 'Xem lịch Hoạt động Khoa',
  },
  {
    id: View.HOLIDAY_SCHEDULE,
    label: 'Lễ tết',
    mobileLabel: 'Lễ tết',
    ariaLabel: 'Xem lịch trực Lễ Tết',
  },
];

const Header: React.FC<HeaderProps> = ({
  view,
  onViewChange,
  onToggleSettings,
  showEditLock = false,
  canEdit = false,
  onToggleEditLock,
}) => {
  const [sliderStyle, setSliderStyle] = useState<React.CSSProperties>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const activeId = view === View.SETTINGS ? TAB_CONFIG[0].id : view;
    const activeButton = buttonRefs.current[activeId];
    if (activeButton) {
      setSliderStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        opacity: 1,
      });
    }
  }, [view]);

  // Keep tab slider perfectly synced when viewport resizes
  useEffect(() => {
    const activeId = view === View.SETTINGS ? TAB_CONFIG[0].id : view;
    const activeButton = buttonRefs.current[activeId];
    if (!activeButton) return;

    const resizeObserver = new ResizeObserver(() => {
      setSliderStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        opacity: 1,
      });
    });

    resizeObserver.observe(activeButton);
    return () => resizeObserver.disconnect();
  }, [view]);

  const handleTabChange = (newView: View) => {
    if (view === newView) return;
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        onViewChange(newView);
      });
    } else {
      onViewChange(newView);
    }
  };

  return (
    <header
      className="app-header fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pointer-events-none"
      role="banner"
    >
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="app-header-card glass rounded-2xl px-3 py-2.5 pointer-events-auto sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4 sm:gap-8">
              <h1 className="app-brand text-lg sm:text-2xl font-bold text-gradient shrink-0 tracking-tight">
                Lịch trực
              </h1>
              {view !== View.SETTINGS && (
                <nav role="tablist" aria-label="Chọn loại lịch" className="hidden sm:block">
                  <div className="relative flex items-center bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
                    <div
                      className="absolute top-1 bottom-1 bg-white dark:bg-slate-700 shadow-sm rounded-lg transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                      style={{
                        width: `${sliderStyle.width}px`,
                        transform: `translateX(${sliderStyle.left}px)`,
                        opacity: sliderStyle.opacity,
                      }}
                      aria-hidden="true"
                    ></div>
                    {TAB_CONFIG.map((tab) => (
                      <button
                        key={tab.id}
                        ref={(el) => {
                          buttonRefs.current[tab.id] = el;
                        }}
                        onClick={() => handleTabChange(tab.id)}
                        role="tab"
                        aria-selected={view === tab.id}
                        aria-controls={`${tab.id}-panel`}
                        aria-label={tab.ariaLabel}
                        className={`relative px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors duration-200 z-10 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
                          view === tab.id
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </nav>
              )}
            </div>
            <nav
              aria-label="Điều hướng cài đặt"
              className="app-header-actions flex shrink-0 items-center gap-1 sm:gap-2"
            >
              <ThemeToggle />
              {showEditLock && onToggleEditLock && (
                <button
                  onClick={onToggleEditLock}
                  className={`app-icon-button p-2.5 rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:outline-none ${
                    canEdit
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                  aria-label={canEdit ? 'Khóa chỉnh sửa' : 'Mở khóa chỉnh sửa'}
                  aria-pressed={canEdit}
                  title={canEdit ? 'Khóa chỉnh sửa' : 'Mở khóa chỉnh sửa'}
                >
                  {canEdit ? <UnlockIcon className="h-5 w-5" /> : <LockIcon className="h-5 w-5" />}
                </button>
              )}
              <button
                onClick={onToggleSettings}
                className="app-icon-button p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus:outline-none"
                aria-label={view === View.SETTINGS ? 'Quay lại lịch trực' : 'Mở cài đặt'}
                aria-pressed={view === View.SETTINGS}
              >
                {view === View.SETTINGS ? (
                  <CalendarIcon className="h-5 w-5" />
                ) : (
                  <GearIcon className="h-5 w-5" />
                )}
              </button>
            </nav>
          </div>

          {view !== View.SETTINGS && (
            <nav role="tablist" aria-label="Chọn loại lịch" className="mt-2 sm:hidden">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100/60 p-1 dark:bg-slate-800/60">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    role="tab"
                    aria-selected={view === tab.id}
                    aria-controls={`${tab.id}-panel`}
                    aria-label={tab.ariaLabel}
                    className={`min-h-9 rounded-lg px-2 text-center text-sm font-semibold leading-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
                      view === tab.id
                        ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                        : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="block truncate">{tab.mobileLabel}</span>
                  </button>
                ))}
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
