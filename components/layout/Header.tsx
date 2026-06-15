import React from 'react';
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
    width: 96,
    ariaLabel: 'Xem lịch trực Khối Ngoại',
  },
  {
    id: View.DEPARTMENT_SCHEDULE,
    label: 'Hoạt động khoa',
    mobileLabel: 'Khoa',
    width: 115,
    ariaLabel: 'Xem lịch Hoạt động Khoa',
  },
  {
    id: View.HOLIDAY_SCHEDULE,
    label: 'Lễ tết',
    mobileLabel: 'Lễ tết',
    width: 72,
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
  const activeIndex = TAB_CONFIG.findIndex((tab) => tab.id === view);
  const activeTab = TAB_CONFIG[activeIndex] || TAB_CONFIG[0];

  // Calculate transform position
  const getTransformX = () => {
    let offset = 4; // Initial offset
    for (let i = 0; i < activeIndex; i++) {
      offset += TAB_CONFIG[i].width + 4; // width + gap
    }
    return offset;
  };

  return (
    <header
      className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pointer-events-none"
      role="banner"
    >
      <div className="container mx-auto">
        <div className="glass rounded-2xl px-3 py-2.5 pointer-events-auto sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4 sm:gap-8">
              <h1 className="text-lg sm:text-2xl font-bold text-gradient shrink-0 tracking-tight">
                Lịch trực
              </h1>
              {view !== View.SETTINGS && (
                <nav
                  role="tablist"
                  aria-label="Chọn loại lịch"
                  className="hidden sm:block"
                >
                  <div className="relative flex items-center bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
                    <div
                      className="absolute h-[calc(100%-8px)] my-1 bg-white dark:bg-slate-700 shadow-sm rounded-lg transition-all duration-300 ease-out"
                      style={{
                        width: `${activeTab.width}px`,
                        transform: `translateX(${getTransformX()}px)`,
                      }}
                      aria-hidden="true"
                    ></div>
                    {TAB_CONFIG.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => onViewChange(tab.id)}
                        role="tab"
                        aria-selected={view === tab.id}
                        aria-controls={`${tab.id}-panel`}
                        aria-label={tab.ariaLabel}
                        className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
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
          <nav aria-label="Điều hướng cài đặt" className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {showEditLock && onToggleEditLock && (
              <button
                onClick={onToggleEditLock}
                className={`p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
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
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                    onClick={() => onViewChange(tab.id)}
                    role="tab"
                    aria-selected={view === tab.id}
                    aria-controls={`${tab.id}-panel`}
                    aria-label={tab.ariaLabel}
                    className={`min-h-9 rounded-lg px-2 text-center text-sm font-semibold leading-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
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
