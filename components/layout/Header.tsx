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
    shortLabel: 'Khối ngoại',
    ariaLabel: 'Xem lịch trực Khối Ngoại',
  },
  {
    id: View.DEPARTMENT_SCHEDULE,
    label: 'Hoạt động khoa',
    shortLabel: 'Hoạt động',
    ariaLabel: 'Xem lịch Hoạt động Khoa',
  },
  {
    id: View.HOLIDAY_SCHEDULE,
    label: 'Lễ tết',
    shortLabel: 'Lễ tết',
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
  const handleTabChange = (newView: View) => {
    if (view === newView) return;
    if (document.startViewTransition) {
      document.startViewTransition(() => onViewChange(newView));
    } else {
      onViewChange(newView);
    }
  };

  return (
    <>
      <header
        className="app-header sticky top-0 z-50 border-b bg-white dark:bg-slate-950"
        role="banner"
      >
        <div className="mx-auto flex min-h-14 w-full max-w-[1920px] items-center gap-4 px-3 sm:min-h-16 sm:px-5 lg:px-6">
          <button
            type="button"
            onClick={() => handleTabChange(View.SCHEDULE)}
            className="app-brand flex shrink-0 items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Mở lịch trực Khối Ngoại"
          >
            <span className="brand-mark" aria-hidden="true">
              LT
            </span>
            <span className="text-lg font-bold tracking-tight sm:text-xl">Lịch trực</span>
          </button>

          {view !== View.SETTINGS ? (
            <nav
              role="tablist"
              aria-label="Chọn loại lịch"
              className="hidden min-w-0 flex-1 sm:flex"
            >
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  role="tab"
                  aria-selected={view === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  aria-label={tab.ariaLabel}
                  className="roster-primary-tab"
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          ) : (
            <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm text-slate-500 sm:flex dark:text-slate-400">
              <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <span>Quản trị lịch trực</span>
            </div>
          )}

          <nav
            aria-label="Điều hướng cài đặt"
            className="ml-auto flex shrink-0 items-center gap-1.5"
          >
            <ThemeToggle />
            {showEditLock && onToggleEditLock && (
              <button
                type="button"
                onClick={onToggleEditLock}
                className={`edit-mode-button ${canEdit ? 'is-unlocked' : ''}`}
                aria-label={canEdit ? 'Khóa chỉnh sửa' : 'Mở khóa chỉnh sửa'}
                aria-pressed={canEdit}
                title={canEdit ? 'Khóa chỉnh sửa' : 'Mở khóa chỉnh sửa'}
              >
                {canEdit ? <UnlockIcon className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
                <span className="hidden lg:inline">{canEdit ? 'Đang chỉnh sửa' : 'Chỉ xem'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleSettings}
              className="app-icon-button"
              aria-label={view === View.SETTINGS ? 'Quay lại lịch trực' : 'Mở cài đặt'}
              aria-pressed={view === View.SETTINGS}
              title={view === View.SETTINGS ? 'Quay lại lịch trực' : 'Cài đặt'}
            >
              {view === View.SETTINGS ? (
                <CalendarIcon className="h-5 w-5" />
              ) : (
                <GearIcon className="h-5 w-5" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {view !== View.SETTINGS && (
        <nav role="tablist" aria-label="Chọn loại lịch" className="mobile-bottom-nav sm:hidden">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              role="tab"
              aria-selected={view === tab.id}
              aria-label={tab.ariaLabel}
              className="mobile-bottom-tab"
            >
              <CalendarIcon className="h-5 w-5" />
              <span>{tab.shortLabel}</span>
            </button>
          ))}
        </nav>
      )}
    </>
  );
};

export default Header;
