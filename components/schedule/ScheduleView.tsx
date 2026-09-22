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
import StatsModal from '../department/StatsModal';
import MyScheduleModal from './MyScheduleModal';
import RestSafetyCheckerModal from './RestSafetyCheckerModal';
import { PlusIcon } from '../icons/PlusIcon';
import { LockIcon } from '../icons/LockIcon';
import { FatigueAlertIcon } from '../icons/FatigueAlertIcon';
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
  hasPostDutyWarning: boolean;
  hasFatigueWarning: boolean;
  id: string;
  index: number;
  pendingRequestCount: number;
  startDate: Date;
}

const MY_DOCTOR_STORAGE_KEY = 'roster_my_doctor_name';

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
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedMobileWeekId, setSelectedMobileWeekId] = useState<string>('');
  const [selectedMobileDayString, setSelectedMobileDayString] = useState<string>('');
  const [isCompactSchedule, setIsCompactSchedule] = useState(false);
  const [hoveredDoctor, setHoveredDoctor] = useState<string | null>(null);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [isMyScheduleOpen, setIsMyScheduleOpen] = useState(false);
  const [isSafetyCheckerOpen, setIsSafetyCheckerOpen] = useState(false);
  const [myDoctorName, setMyDoctorName] = useState<string>(() => {
    try {
      return localStorage.getItem(MY_DOCTOR_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const handleSelectMyDoctor = (doctorName: string) => {
    setMyDoctorName(doctorName);
    try {
      if (doctorName) {
        localStorage.setItem(MY_DOCTOR_STORAGE_KEY, doctorName);
      } else {
        localStorage.removeItem(MY_DOCTOR_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save myDoctorName to localStorage', err);
    }
  };

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

  const doctorNamesInMonth = useMemo(
    () =>
      Array.from(
        new Set(
          calendarGrid.filter((day) => day.isCurrentMonth).flatMap((day) => day.doctors || []),
        ),
      ).sort((a, b) => a.localeCompare(b, 'vi')),
    [calendarGrid],
  );

  const searchedDoctor = useMemo(() => {
    const query = doctorQuery.trim().toLocaleLowerCase('vi-VN');
    if (!query) return null;
    return (
      doctorNamesInMonth.find((name) => name.toLocaleLowerCase('vi-VN') === query) ||
      doctorNamesInMonth.find((name) => name.toLocaleLowerCase('vi-VN').includes(query)) ||
      null
    );
  }, [doctorNamesInMonth, doctorQuery]);

  const focusedDoctor = hoveredDoctor || searchedDoctor || selectedDoctor?.doctorName || null;
  const focusedDoctorDays = useMemo(
    () =>
      focusedDoctor
        ? calendarGrid.filter((day) => day.isCurrentMonth && day.doctors?.includes(focusedDoctor))
        : [],
    [calendarGrid, focusedDoctor],
  );
  const postDutyWarningCount = calendarGrid.reduce(
    (total, day) => total + day.postDutyWarningDoctors.length,
    0,
  );
  const fatigueWarningCount = calendarGrid.reduce(
    (total, day) => total + day.fatigueWarningDoctors.length,
    0,
  );

  const handleExportPDF = async () => {
    return exportScheduleToPDF(calendarGrid, currentDate);
  };

  const handleExportICS = (doctorName: string) => {
    const icsContent = generateDoctorICS(
      doctorName,
      calendarGrid,
      getDoctorsForDate,
      departmentAssignments,
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
        hasPostDutyWarning: days.some((day) => day.postDutyWarningDoctors.length > 0),
        hasFatigueWarning: days.some((day) => day.fatigueWarningDoctors.length > 0),
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

  const handleJumpToDate = (targetDate: Date) => {
    const dateStr = getDateString(targetDate);
    const isDifferentMonth =
      targetDate.getFullYear() !== currentDate.getFullYear() ||
      targetDate.getMonth() !== currentDate.getMonth();

    if (isDifferentMonth) {
      const newMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      setCurrentDate(newMonth);
      onViewDateChange?.(newMonth);
    }

    const matchingWeek = mobileWeekGroups.find((week) =>
      week.days.some((day) => getDateString(day.date) === dateStr),
    );
    if (matchingWeek) {
      setSelectedMobileWeekId(matchingWeek.id);
    }
    setSelectedMobileDayString(dateStr);

    setTimeout(() => {
      const cellElement = document.querySelector(`[data-date="${dateStr}"]`);
      if (cellElement) {
        cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cellElement.classList.add('ring-4', 'ring-teal-500', 'ring-offset-2');
        setTimeout(() => {
          cellElement.classList.remove('ring-4', 'ring-teal-500', 'ring-offset-2');
        }, 2500);
      }
    }, 150);
  };

  return (
    <>
      <div ref={scheduleShellRef} data-compact={isCompactSchedule} className="schedule-shell">
        <ScheduleHeader
          currentDate={currentDate}
          selectedDoctor={selectedDoctor}
          selectedShiftDate={selectedTourDate}
          doctorQuery={doctorQuery}
          doctorNames={doctorNamesInMonth}
          postDutyWarningCount={postDutyWarningCount}
          fatigueWarningCount={fatigueWarningCount}
          onDoctorQueryChange={setDoctorQuery}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onCancelSelection={cancelSelection}
          onOpenStats={() => setIsStatsModalOpen(true)}
          onExportPDF={handleExportPDF}
          onExportICS={() => setIsICSModalOpen(true)}
          myDoctorName={myDoctorName}
          onOpenMySchedule={() => setIsMyScheduleOpen(true)}
          onOpenSafetyChecker={() => setIsSafetyCheckerOpen(true)}
        />

        <div className={`schedule-workspace ${isCompactSchedule ? 'hidden' : 'grid'}`}>
          <div ref={calendarRef} className="schedule-desktop overflow-x-auto">
            <div className="min-w-[980px] xl:min-w-0">
              <div className="weekday-row grid grid-cols-7">
                {weekDays.map((day, index) => {
                  const isSaturday = index === 5;
                  const isSunday = index === 6;
                  return (
                    <div
                      key={day}
                      className={`weekday-label ${isSaturday ? 'is-saturday' : ''} ${isSunday ? 'is-sunday' : ''}`}
                      data-weekend={isSaturday || isSunday ? 'true' : undefined}
                    >
                      <span>{day}</span>
                    </div>
                  );
                })}
              </div>

              <div className="calendar-month-grid grid grid-cols-7">
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
                    hoveredDoctor={focusedDoctor}
                    onHoverDoctor={setHoveredDoctor}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="doctor-inspector" aria-label="Thông tin bác sĩ trong lịch tháng">
            {focusedDoctor ? (
              <>
                <div className="inspector-heading">
                  <span className="doctor-avatar" aria-hidden="true">
                    {focusedDoctor
                      .replace(/^Bs\.\s*/i, '')
                      .split(/\s+/)
                      .slice(-2)
                      .map((part) => part[0])
                      .join('')
                      .toLocaleUpperCase('vi-VN')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="inspector-kicker">Lịch tháng</p>
                    <h3 className="truncate">{focusedDoctor}</h3>
                    <p>{focusedDoctorDays.length} ngày trực trong tháng</p>
                  </div>
                  {doctorQuery && (
                    <button
                      type="button"
                      onClick={() => setDoctorQuery('')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Bỏ xem riêng, trở lại xem toàn bộ lịch"
                      aria-label="Bỏ xem riêng"
                    >
                      <span className="text-sm font-bold">✕</span>
                    </button>
                  )}
                </div>

                {doctorQuery && (
                  <button
                    type="button"
                    onClick={() => setDoctorQuery('')}
                    className="w-full mt-2.5 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>✕</span>
                    <span>Bỏ xem riêng (Hiện toàn bộ lịch)</span>
                  </button>
                )}

                <div className="inspector-alerts">
                  {focusedDoctorDays.some((day) =>
                    day.postDutyWarningDoctors.includes(focusedDoctor),
                  ) && (
                    <div className="inspector-alert is-critical">
                      <FatigueAlertIcon className="h-5 w-5" />
                      <div>
                        <strong>Ra trực</strong>
                        <span>Có lịch trực liền ngày</span>
                      </div>
                    </div>
                  )}
                  {focusedDoctorDays.some((day) =>
                    day.fatigueWarningDoctors.includes(focusedDoctor),
                  ) && (
                    <div className="inspector-alert is-warning">
                      <FatigueAlertIcon className="h-5 w-5" />
                      <div>
                        <strong>Mới ra trực</strong>
                        <span>Trực lại sau một ngày nghỉ</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="inspector-list">
                  <div className="inspector-list-title">
                    <span>Các ngày trực</span>
                    <span>{focusedDoctorDays.length}</span>
                  </div>
                  {focusedDoctorDays.map((day) => (
                    <button
                      type="button"
                      key={getDateString(day.date)}
                      onClick={() => {
                        setSelectedMobileDayString(getDateString(day.date));
                        if (day.date.getMonth() !== currentDate.getMonth()) {
                          setCurrentDate(day.date);
                        }
                      }}
                      className="inspector-duty-row"
                    >
                      <span>
                        {day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span>{day.date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                      <strong>Tua {day.tourName}</strong>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="inspector-empty">
                <div className="inspector-empty-mark" aria-hidden="true">
                  BS
                </div>
                <h3>Theo dõi một bác sĩ</h3>
                <p>
                  Rê chuột vào tên hoặc tìm bác sĩ để xem chuỗi ngày trực và cảnh báo trong tháng.
                </p>
              </div>
            )}
          </aside>
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
                  aria-label={`Tuần ${week.index}, ${formatShortDate(week.startDate)} - ${formatShortDate(week.endDate)}${week.hasModified ? ', có lịch đã chỉnh' : ''}${week.hasPostDutyWarning ? ', có cảnh báo ra trực' : ''}${week.hasFatigueWarning ? ', có cảnh báo trực lại quá sớm' : ''}`}
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
                  {(week.hasPostDutyWarning || week.hasFatigueWarning) && (
                    <FatigueAlertIcon
                      className={`absolute bottom-2 right-2 h-3.5 w-3.5 ${week.hasPostDutyWarning ? 'text-rose-500' : 'text-amber-500'}`}
                    />
                  )}
                  <span className="block text-sm font-bold">Tuần {week.index}</span>
                  <span
                    className={`mt-0.5 block text-xs font-semibold ${
                      isSelected ? 'text-teal-950' : 'text-slate-500 dark:text-slate-400'
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
                    data-date={dateString}
                    type="button"
                    onClick={() => setSelectedMobileDayString(dateString)}
                    className={`relative min-h-[72px] min-w-0 flex-1 rounded-xl border px-1.5 py-1.5 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isSelected
                        ? 'border-indigo-500 bg-white text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-200'
                        : 'border-transparent bg-white/60 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Xem lịch ngày ${day.date.toLocaleDateString('vi-VN')}${day.postDutyWarningDoctors.length > 0 ? ', có cảnh báo bác sĩ ra trực' : ''}${day.fatigueWarningDoctors.length > 0 ? ', có cảnh báo bác sĩ trực lại quá sớm' : ''}`}
                  >
                    <span className="block text-xs font-bold uppercase">
                      {getWeekdayShortLabel(day.date)}
                    </span>
                    <span className="mt-0.5 block text-base font-bold">{day.date.getDate()}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">
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
                      {(day.postDutyWarningDoctors.length > 0 ||
                        day.fatigueWarningDoctors.length > 0) && (
                        <FatigueAlertIcon
                          className={`h-3 w-3 ${day.postDutyWarningDoctors.length > 0 ? 'text-rose-500' : 'text-amber-500'}`}
                        />
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
                    {selectedMobileDay.postDutyWarningDoctors.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                        <FatigueAlertIcon className="h-3.5 w-3.5" />
                        {selectedMobileDay.postDutyWarningDoctors.length} BS ra trực
                      </span>
                    )}
                    {selectedMobileDay.fatigueWarningDoctors.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                        <FatigueAlertIcon className="h-3.5 w-3.5" />
                        {selectedMobileDay.fatigueWarningDoctors.length} BS trực lại quá sớm
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
                  const hasDoctorPostDutyWarning =
                    selectedMobileDay.postDutyWarningDoctors.includes(doctor);
                  const hasDoctorFatigueWarning =
                    !hasDoctorPostDutyWarning &&
                    selectedMobileDay.fatigueWarningDoctors.includes(doctor);
                  const isHoveredDoctor = hoveredDoctor === doctor;

                  const rowClassName = `flex min-h-10 w-full items-center gap-3 border-b px-3 text-left transition-colors last:border-b-0 sm:min-h-12 ${
                    isHoveredDoctor
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-inset ring-blue-500/30 dark:border-blue-500 dark:bg-blue-500'
                      : hoveredDoctor
                        ? 'border-slate-100 text-slate-700 opacity-20 blur-[0.2px] dark:border-slate-700 dark:text-slate-200'
                        : isSelected
                          ? 'border-green-100 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : hasDoctorPostDutyWarning
                            ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-100'
                            : hasDoctorFatigueWarning
                              ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100'
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
                      {(hasDoctorPostDutyWarning || hasDoctorFatigueWarning) && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${hasDoctorPostDutyWarning ? 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-800/40 dark:text-rose-100' : 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-800/40 dark:text-amber-100'}`}
                          title={
                            hasDoctorPostDutyWarning
                              ? 'Bác sĩ này cũng trực ngày hôm trước và đang trong ngày ra trực'
                              : 'Bác sĩ này trực cách đây 2 ngày và mới có 1 ngày ra trực'
                          }
                        >
                          <FatigueAlertIcon className="h-3.5 w-3.5" />
                          {hasDoctorPostDutyWarning ? 'Ra trực' : 'Mới ra trực 1 ngày'}
                        </span>
                      )}
                    </>
                  );

                  return (
                    <React.Fragment key={`${doctor}-${doctorIndex}`}>
                      {canEditDoctorRow ? (
                        <button
                          type="button"
                          onClick={() => handleDoctorClick(selectedMobileDay, doctorIndex, doctor)}
                          onMouseEnter={() => setHoveredDoctor(doctor)}
                          onMouseLeave={() => setHoveredDoctor(null)}
                          onFocus={() => setHoveredDoctor(doctor)}
                          onBlur={() => setHoveredDoctor(null)}
                          className={`${rowClassName} hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:hover:bg-slate-800`}
                          aria-pressed={isSelected}
                          aria-label={`Chọn ${doctor} ngày ${selectedMobileDay.date.getDate()} để hoán đổi hoặc thay thế${hasDoctorPostDutyWarning ? '. Cảnh báo bác sĩ đang ra trực' : hasDoctorFatigueWarning ? '. Cảnh báo bác sĩ mới ra trực một ngày' : ''}`}
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

      {isStatsModalOpen && (
        <StatsModal
          currentDate={currentDate}
          departmentAssignments={departmentAssignments}
          allDoctors={allDoctors.map((doctor) => doctor.name)}
          getDoctorsForDate={getDoctorsForDate}
          title="Thống kê toàn khối ngoại"
          mode="directOnly"
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      <ExportICSModal
        isOpen={isICSModalOpen}
        onClose={() => setIsICSModalOpen(false)}
        allDoctors={allDoctors}
        onExport={handleExportICS}
      />

      <MyScheduleModal
        isOpen={isMyScheduleOpen}
        onClose={() => setIsMyScheduleOpen(false)}
        allDoctors={allDoctors}
        calendarGrid={calendarGrid}
        currentDate={currentDate}
        myDoctorName={myDoctorName}
        onSelectMyDoctor={handleSelectMyDoctor}
        onSpotlightDoctor={(doctorName) => {
          setDoctorQuery(doctorName);
        }}
        onRequestShiftChange={(day) => {
          setIsMyScheduleOpen(false);
          handleRequestClick(day);
        }}
        onJumpToDate={(date) => {
          handleJumpToDate(date);
        }}
        getDoctorsForDate={getDoctorsForDate}
        departmentAssignments={departmentAssignments}
      />

      <RestSafetyCheckerModal
        isOpen={isSafetyCheckerOpen}
        onClose={() => setIsSafetyCheckerOpen(false)}
        calendarGrid={calendarGrid}
        currentDate={currentDate}
        onJumpToDate={(date) => {
          handleJumpToDate(date);
        }}
        onDoctorClick={(day, docIndex, doctorName) => {
          setIsSafetyCheckerOpen(false);
          handleDoctorClick(day, docIndex, doctorName);
        }}
        canEdit={canEdit}
      />
    </>
  );
};

export default ScheduleView;
