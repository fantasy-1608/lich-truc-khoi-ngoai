import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getNextMonthDate } from '../../utils/date';
import {
  Tour,
  SelectedDoctor,
  ResetPopoverState,
  ScheduleCalendarDay,
  Doctor,
  HolidayScheduleData,
  ScheduleSnapshotEntry,
  ShiftRequest,
  ShiftRequestDraft,
  ShiftRequestStatus,
} from '../../types';
import { useCalendarGrid } from '../../hooks/useCalendarGrid';
import ScheduleHeader from './ScheduleHeader';
import ScheduleDayCell from './ScheduleDayCell';
import ReplaceDoctorPopup from './ReplaceDoctorPopup';
import AddDoctorPopup from './AddDoctorPopup';
import ResetPopover from './ResetPopover';
import { exportScheduleToPDF } from '../../utils/export';
import ShiftRequestModal from './ShiftRequestModal';
import ShiftRequestsPanel from './ShiftRequestsPanel';
import DayShiftRequestsModal from './DayShiftRequestsModal';
import ExportICSModal from '../department/ExportICSModal';
import { PlusIcon } from '../icons/PlusIcon';
import { LockIcon } from '../icons/LockIcon';
import { generateDoctorICS, downloadICSFile } from '../../utils/icsExport';
import { DepartmentAssignments } from '../../types';

interface ScheduleViewProps {
  tours: Tour[];
  tourOrder: string[];
  tourOverrides: Record<string, string>;
  doctorOverrides: Record<string, string[]>;
  scheduleSnapshots: Record<string, ScheduleSnapshotEntry>;
  showAddDoctorShortcut: boolean;
  allDoctors: Doctor[];
  doctorsById: Record<string, Doctor>;
  toursById: Record<string, Tour>;
  getDoctorsForDate: (date: Date) => string[] | undefined;
  rotationStartDate: string | null;
  onSwapTours: (date1: Date, date2: Date) => void;
  onSwapDoctors: (
    selection1: { date: Date; doctorIndex: number },
    selection2: { date: Date; doctorIndex: number },
  ) => void;
  onReplaceDoctor: (selection: { date: Date; doctorIndex: number }, newDoctorName: string) => void;
  onAddDoctorToDate: (date: Date, doctorName: string) => void;
  onResetOverrides: (date: Date) => void;
  onViewDateChange?: (date: Date) => void;
  holidaySchedule?: HolidayScheduleData;
  canManageShiftRequests: boolean;
  canEdit: boolean;
  isMobilePortrait: boolean;
  showMobileEditNotice: boolean;
  shiftRequests: ShiftRequest[];
  shiftRequestsLoading: boolean;
  pendingRequestCountsByDate: Record<string, number>;
  onSubmitShiftRequest: (draft: ShiftRequestDraft) => Promise<void>;
  onUpdateShiftRequestReview: (
    id: string,
    status: ShiftRequestStatus,
    reviewNote: string,
  ) => Promise<void>;
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>;
}

const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatShortDate = (date: Date): string =>
  date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
  });

const getWeekdayShortLabel = (date: Date): string => {
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return labels[date.getDay()];
};

interface MobileWeekGroup {
  days: ScheduleCalendarDay[];
  endDate: Date;
  hasHoliday: boolean;
  hasModified: boolean;
  hasToday: boolean;
  id: string;
  index: number;
  pendingRequestCount: number;
  startDate: Date;
}

const ScheduleView: React.FC<ScheduleViewProps> = (props) => {
  const {
    tourOrder,
    tourOverrides,
    doctorOverrides,
    scheduleSnapshots,
    showAddDoctorShortcut,
    onSwapTours,
    onSwapDoctors,
    allDoctors,
    onReplaceDoctor,
    onAddDoctorToDate,
    onResetOverrides,
    doctorsById,
    toursById,
    getDoctorsForDate,
    rotationStartDate,
    onViewDateChange,
    holidaySchedule,
    canManageShiftRequests,
    canEdit,
    isMobilePortrait,
    showMobileEditNotice,
    shiftRequests,
    shiftRequestsLoading,
    pendingRequestCountsByDate,
    onSubmitShiftRequest,
    onUpdateShiftRequestReview,
    departmentAssignments,
  } = props;

  const isHolidayDate = (date: Date): boolean => {
    if (!holidaySchedule?.startDate || !holidaySchedule?.endDate) return false;
    const start = new Date(holidaySchedule.startDate);
    const end = new Date(holidaySchedule.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check >= start && check <= end;
  };

  const [currentDate, setCurrentDate] = useState(getNextMonthDate());
  const [selectedDoctor, setSelectedDoctor] = useState<SelectedDoctor | null>(null);
  const [selectedTourDate, setSelectedTourDate] = useState<Date | null>(null);
  const [resetPopover, setResetPopover] = useState<ResetPopoverState | null>(null);
  const [addDoctorDay, setAddDoctorDay] = useState<ScheduleCalendarDay | null>(null);
  const [requestDay, setRequestDay] = useState<ScheduleCalendarDay | null>(null);
  const [requestsDate, setRequestsDate] = useState<string | null>(null);
  const [isICSModalOpen, setIsICSModalOpen] = useState(false);
  const [selectedMobileWeekId, setSelectedMobileWeekId] = useState<string>('');
  const [selectedMobileDayString, setSelectedMobileDayString] = useState<string>('');
  const [isCompactSchedule, setIsCompactSchedule] = useState(false);

  const scheduleShellRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    onViewDateChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    onViewDateChange?.(newDate);
  };

  const calendarGrid = useCalendarGrid(
    currentDate,
    doctorsById,
    toursById,
    tourOrder,
    doctorOverrides,
    tourOverrides,
    getDoctorsForDate,
    rotationStartDate,
    scheduleSnapshots,
  );

  const handleExportPDF = async () => {
    return exportScheduleToPDF(calendarGrid, currentDate);
  };

  const handleExportICS = (doctorName: string) => {
    const icsContent = generateDoctorICS(
      doctorName,
      calendarGrid,
      getDoctorsForDate,
      departmentAssignments
    );
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const filename = `LichTruc_${doctorName}_T${month}-${year}.ics`;
    downloadICSFile(filename, icsContent);
  };

  const handleTourClick = (day: ScheduleCalendarDay) => {
    if (!day.doctors) return;
    setSelectedDoctor(null);

    if (!selectedTourDate) {
      setSelectedTourDate(day.date);
    } else {
      if (selectedTourDate.getTime() === day.date.getTime()) {
        setSelectedTourDate(null);
      } else {
        onSwapTours(selectedTourDate, day.date);
        setSelectedTourDate(null);
      }
    }
  };

  const handleDoctorClick = (day: ScheduleCalendarDay, doctorIndex: number, doctorName: string) => {
    if (!day.doctors) return;
    setSelectedTourDate(null);

    const currentSelection = { date: day.date, doctorIndex, doctorName };

    if (!selectedDoctor) {
      setSelectedDoctor(currentSelection);
    } else {
      if (
        selectedDoctor.date.getTime() === day.date.getTime() &&
        selectedDoctor.doctorIndex === doctorIndex
      ) {
        setSelectedDoctor(null);
      } else {
        onSwapDoctors(
          { date: selectedDoctor.date, doctorIndex: selectedDoctor.doctorIndex },
          { date: day.date, doctorIndex },
        );
        setSelectedDoctor(null);
      }
    }
  };

  const handleReplaceClick = (newDoctorName: string) => {
    if (selectedDoctor) {
      onReplaceDoctor(
        { date: selectedDoctor.date, doctorIndex: selectedDoctor.doctorIndex },
        newDoctorName,
      );
      setSelectedDoctor(null);
    }
  };

  const handleAddDoctorClick = (doctorName: string) => {
    if (!addDoctorDay) return;
    onAddDoctorToDate(addDoctorDay.date, doctorName);
    setAddDoctorDay(null);
  };

  const openAddDoctor = (day: ScheduleCalendarDay) => {
    if (!day.doctors || !canEdit) return;
    setSelectedDoctor(null);
    setSelectedTourDate(null);
    setAddDoctorDay(day);
  };

  const cancelSelection = () => {
    setSelectedDoctor(null);
    setSelectedTourDate(null);
    setAddDoctorDay(null);
  };

  const handleResetIconClick = (e: React.MouseEvent, date: Date) => {
    e.stopPropagation();
    if (resetPopover?.target === e.currentTarget) {
      setResetPopover(null);
    } else {
      setResetPopover({ date, target: e.currentTarget as HTMLElement });
    }
  };

  const confirmReset = () => {
    if (resetPopover) {
      onResetOverrides(resetPopover.date);
      setResetPopover(null);
    }
  };

  const handleRequestClick = (day: ScheduleCalendarDay) => {
    if (!day.doctors) return;
    setSelectedDoctor(null);
    setSelectedTourDate(null);
    setRequestDay(day);
  };

  const handleViewRequestsClick = (day: ScheduleCalendarDay) => {
    if (!canManageShiftRequests) return;
    setRequestsDate(getDateString(day.date));
  };

  const handleGoToRequestDate = (dateString: string) => {
    const nextDate = parseDateString(dateString);
    const monthDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    setCurrentDate(monthDate);
    onViewDateChange?.(monthDate);
  };

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const mobileWeekGroups = useMemo<MobileWeekGroup[]>(() => {
    const groups: MobileWeekGroup[] = [];

    for (let rowStart = 0; rowStart < calendarGrid.length; rowStart += 7) {
      const days = calendarGrid.slice(rowStart, rowStart + 7).filter((day) => day.isCurrentMonth);

      if (days.length === 0) continue;

      const index = groups.length + 1;
      const pendingRequestCount = days.reduce(
        (total, day) => total + (pendingRequestCountsByDate[getDateString(day.date)] || 0),
        0,
      );

      groups.push({
        days,
        endDate: days[days.length - 1].date,
        hasHoliday: days.some((day) => isHolidayDate(day.date)),
        hasModified: days.some((day) => day.isModified),
        hasToday: days.some((day) => day.isToday),
        id: `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-week-${index}`,
        index,
        pendingRequestCount,
        startDate: days[0].date,
      });
    }

    return groups;
  }, [calendarGrid, currentDate, holidaySchedule, pendingRequestCountsByDate]);

  useEffect(() => {
    if (mobileWeekGroups.length === 0) {
      setSelectedMobileWeekId('');
      setSelectedMobileDayString('');
      return;
    }

    const defaultWeek = mobileWeekGroups.find((group) => group.hasToday) || mobileWeekGroups[0];
    const allDayStrings = new Set(
      mobileWeekGroups.flatMap((group) => group.days.map((day) => getDateString(day.date))),
    );

    setSelectedMobileWeekId((current) =>
      mobileWeekGroups.some((group) => group.id === current) ? current : defaultWeek.id,
    );
    setSelectedMobileDayString((current) => {
      if (allDayStrings.has(current)) return current;
      const defaultDay = defaultWeek.days.find((day) => day.isToday) || defaultWeek.days[0];
      return getDateString(defaultDay.date);
    });
  }, [mobileWeekGroups]);

  useEffect(() => {
    const shell = scheduleShellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;

    const updateCompactState = () => {
      const shellWidth = shell.getBoundingClientRect().width;
      setIsCompactSchedule(shellWidth < 720);
    };

    updateCompactState();
    const observer = new ResizeObserver(updateCompactState);
    observer.observe(shell);
    window.addEventListener('resize', updateCompactState);
    window.addEventListener('orientationchange', updateCompactState);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateCompactState);
      window.removeEventListener('orientationchange', updateCompactState);
    };
  }, []);

  const selectedMobileWeek =
    mobileWeekGroups.find((week) => week.id === selectedMobileWeekId) || mobileWeekGroups[0];
  const selectedMobileDay =
    selectedMobileWeek?.days.find((day) => getDateString(day.date) === selectedMobileDayString) ||
    selectedMobileWeek?.days[0];
  const showPortraitEditPause = canEdit && isMobilePortrait;
  const shouldShowMobileEditNotice = showPortraitEditPause || showMobileEditNotice;
  const hasActiveSelection = Boolean(selectedDoctor || selectedTourDate);

  const selectMobileWeek = (week: MobileWeekGroup) => {
    setSelectedMobileWeekId(week.id);
    setSelectedMobileDayString(
      getDateString((week.days.find((day) => day.isToday) || week.days[0]).date),
    );
  };

  return (
    <>
      <div
        ref={scheduleShellRef}
        data-compact={isCompactSchedule}
        className="schedule-shell glass-card rounded-2xl p-3 sm:mt-20 sm:rounded-3xl sm:p-8 mt-28"
      >
        <ScheduleHeader
          currentDate={currentDate}
          selectedDoctor={selectedDoctor}
          selectedShiftDate={selectedTourDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onCancelSelection={cancelSelection}
          onExportPDF={handleExportPDF}
          onExportICS={() => setIsICSModalOpen(true)}
        />

        <div
          ref={calendarRef}
          className={`schedule-desktop ${isCompactSchedule ? 'hidden' : 'block'} bg-white/50 dark:bg-slate-800/50 rounded-2xl p-4 shadow-inner overflow-x-auto`}
        >
          <div className="min-w-[980px] xl:min-w-0">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center font-bold text-sm text-indigo-900/70 dark:text-indigo-100/70 py-2 uppercase tracking-wider"
                >
                  <span>{day}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarGrid.map((day, index) => (
                <ScheduleDayCell
                  key={index}
                  day={day}
                  selectedDoctor={selectedDoctor}
                  selectedTourDate={selectedTourDate}
                  onTourClick={handleTourClick}
                  onDoctorClick={handleDoctorClick}
                  onAddDoctorClick={openAddDoctor}
                  onResetIconClick={handleResetIconClick}
                  onRequestClick={handleRequestClick}
                  onViewRequestsClick={handleViewRequestsClick}
                  pendingRequestCount={pendingRequestCountsByDate[getDateString(day.date)] || 0}
                  canManageRequests={canManageShiftRequests}
                  showAddDoctorShortcut={canEdit && showAddDoctorShortcut}
                  isHoliday={isHolidayDate(day.date)}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className={`schedule-compact ${isCompactSchedule ? 'block' : 'hidden'} mt-3 space-y-3`}
        >
          {shouldShowMobileEditNotice && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-200">
              <LockIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm font-semibold leading-snug">
                {showPortraitEditPause
                  ? 'Đang tạm khóa thao tác sửa trên mobile dọc. Xoay ngang điện thoại để chỉnh tiếp.'
                  : 'Mobile dọc chỉ để xem. Muốn chỉnh lịch, hãy xoay ngang điện thoại hoặc dùng máy tính.'}
              </p>
            </div>
          )}

          <div
            className="scrollbar-none -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
            role="tablist"
            aria-label="Chọn tuần trong tháng"
          >
            {mobileWeekGroups.map((week) => {
              const isSelected = week.id === selectedMobileWeek?.id;

              return (
                <button
                  key={week.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`Tuần ${week.index}, ${formatShortDate(week.startDate)} - ${formatShortDate(week.endDate)}${week.hasModified ? ', có lịch đã chỉnh' : ''}`}
                  onClick={() => selectMobileWeek(week)}
                  className={`relative min-w-[104px] snap-start rounded-2xl border px-3 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
                  }`}
                >
                  {week.hasModified && (
                    <span
                      className="absolute right-3 top-3 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-white dark:ring-slate-800"
                      aria-hidden="true"
                    />
                  )}
                  <span className="block text-sm font-bold">Tuần {week.index}</span>
                  <span
                    className={`mt-0.5 block text-[11px] font-semibold ${
                      isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatShortDate(week.startDate)} - {formatShortDate(week.endDate)}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedMobileWeek && (
            <div className="flex gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-700/70 dark:bg-slate-800/60">
              {selectedMobileWeek.days.map((day) => {
                const dateString = getDateString(day.date);
                const isSelected =
                  dateString === getDateString(selectedMobileDay?.date || day.date);
                const pendingCount = pendingRequestCountsByDate[dateString] || 0;

                return (
                  <button
                    key={dateString}
                    type="button"
                    onClick={() => setSelectedMobileDayString(dateString)}
                    className={`relative min-h-[72px] min-w-0 flex-1 rounded-xl border px-1.5 py-1.5 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isSelected
                        ? 'border-indigo-500 bg-white text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-200'
                        : 'border-transparent bg-white/60 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Xem lịch ngày ${day.date.toLocaleDateString('vi-VN')}`}
                  >
                    <span className="block text-[11px] font-bold uppercase">
                      {getWeekdayShortLabel(day.date)}
                    </span>
                    <span className="mt-0.5 block text-base font-bold">{day.date.getDate()}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                      {day.tourName || '-'}
                    </span>
                    <span className="mt-0.5 block h-1.5">
                      {day.isToday && (
                        <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      )}
                    </span>
                    <span className="absolute right-1 top-1 flex gap-0.5" aria-hidden="true">
                      {day.isModified && (
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      )}
                      {pendingCount > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                      {isHolidayDate(day.date) && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedMobileDay && selectedMobileDay.doctors && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/70 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold leading-tight text-slate-900 dark:text-white sm:text-lg">
                      {selectedMobileDay.date.toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </h3>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {canEdit && !shouldShowMobileEditNotice ? (
                      <button
                        type="button"
                        onClick={() => handleTourClick(selectedMobileDay)}
                        className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-800/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/45"
                        aria-pressed={
                          selectedTourDate?.getTime() === selectedMobileDay.date.getTime()
                        }
                        aria-label={`Chọn tua ngày ${selectedMobileDay.date.getDate()} để hoán đổi`}
                      >
                        Tua {selectedMobileDay.tourName}
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-300">
                        Tua {selectedMobileDay.tourName}
                      </span>
                    )}
                    {selectedMobileDay.isModified && (
                      <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                        Đã chỉnh
                      </span>
                    )}
                    {canEdit && !shouldShowMobileEditNotice && selectedMobileDay.isModified && (
                      <button
                        type="button"
                        onClick={(e) => handleResetIconClick(e, selectedMobileDay.date)}
                        className="rounded-full border border-orange-200 bg-white px-2.5 py-1 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-orange-800/70 dark:bg-slate-900/70 dark:text-orange-300 dark:hover:bg-orange-900/30"
                      >
                        Xóa thay đổi
                      </button>
                    )}
                    {hasActiveSelection && (
                      <button
                        type="button"
                        onClick={cancelSelection}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Hủy chọn
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRequestClick(selectedMobileDay)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                  aria-label={`Gửi yêu cầu trực cho ngày ${selectedMobileDay.date.getDate()}`}
                  title="Gửi yêu cầu đổi/nghỉ trực"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              {canEdit && showAddDoctorShortcut && !shouldShowMobileEditNotice && (
                <button
                  type="button"
                  onClick={() => openAddDoctor(selectedMobileDay)}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
                >
                  <PlusIcon className="h-4 w-4" />
                  Thêm bác sĩ cho ngày này
                </button>
              )}

              <div
                className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40 sm:mt-4"
                aria-label="Danh sách bác sĩ trực"
              >
                {selectedMobileDay.doctors.map((doctor, doctorIndex) => {
                  const isSelected =
                    selectedDoctor?.date.getTime() === selectedMobileDay.date.getTime() &&
                    selectedDoctor.doctorIndex === doctorIndex;
                  const canEditDoctorRow = canEdit && !shouldShowMobileEditNotice;

                  const rowClassName = `flex min-h-10 w-full items-center gap-3 border-b px-3 text-left transition-colors last:border-b-0 sm:min-h-12 ${
                    isSelected
                      ? 'border-green-100 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'border-slate-100 text-slate-700 dark:border-slate-700 dark:text-slate-200'
                  }`;
                  const rowContent = (
                    <>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {doctorIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
                        {doctor}
                      </span>
                    </>
                  );

                  return (
                    <React.Fragment key={`${doctor}-${doctorIndex}`}>
                      {canEditDoctorRow ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleDoctorClick(selectedMobileDay, doctorIndex, doctor)
                          }
                          className={`${rowClassName} hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:hover:bg-slate-800`}
                          aria-pressed={isSelected}
                          aria-label={`Chọn ${doctor} ngày ${selectedMobileDay.date.getDate()} để hoán đổi hoặc thay thế`}
                        >
                          {rowContent}
                        </button>
                      ) : (
                        <div className={rowClassName}>{rowContent}</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {isHolidayDate(selectedMobileDay.date) && (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    Có lịch lễ
                  </span>
                )}
                {(pendingRequestCountsByDate[getDateString(selectedMobileDay.date)] || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => handleViewRequestsClick(selectedMobileDay)}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  >
                    {pendingRequestCountsByDate[getDateString(selectedMobileDay.date)]} yêu cầu
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        <ShiftRequestsPanel
          canManage={canManageShiftRequests}
          isLoading={shiftRequestsLoading}
          requests={shiftRequests}
          onGoToDate={handleGoToRequestDate}
          onUpdateReview={onUpdateShiftRequestReview}
        />
      </div>

      {resetPopover && (
        <ResetPopover
          popoverState={resetPopover}
          onConfirm={confirmReset}
          onCancel={() => setResetPopover(null)}
        />
      )}

      {selectedDoctor && (
        <ReplaceDoctorPopup
          allDoctors={allDoctors}
          selectedDoctor={selectedDoctor}
          onReplaceClick={handleReplaceClick}
          onClose={cancelSelection}
        />
      )}

      {addDoctorDay && (
        <AddDoctorPopup
          allDoctors={allDoctors}
          day={addDoctorDay}
          onAddClick={handleAddDoctorClick}
          onClose={() => setAddDoctorDay(null)}
        />
      )}

      {requestDay && requestDay.doctors && (
        <ShiftRequestModal
          date={requestDay.date}
          doctorsOnDate={requestDay.doctors}
          allDoctors={allDoctors}
          onClose={() => setRequestDay(null)}
          onSubmit={onSubmitShiftRequest}
        />
      )}

      {requestsDate && (
        <DayShiftRequestsModal
          date={requestsDate}
          requests={shiftRequests.filter(
            (request) =>
              request.date === requestsDate &&
              (request.status === 'pending' || request.status === 'in_review'),
          )}
          onClose={() => setRequestsDate(null)}
          onUpdateReview={onUpdateShiftRequestReview}
        />
      )}

      <ExportICSModal
        isOpen={isICSModalOpen}
        onClose={() => setIsICSModalOpen(false)}
        allDoctors={allDoctors}
        onExport={handleExportICS}
      />
    </>
  );
};

export default ScheduleView;
