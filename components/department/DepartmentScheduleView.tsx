import React, { useEffect, useRef, useState, useMemo } from 'react';
import { getCurrentMonthDate, getInitialScheduleMonthDate } from '../../utils/date';
import { START_DATE } from '../../constants';
import { Doctor, DepartmentRole, DepartmentAssignments, HolidayScheduleData } from '../../types';
import { useDepartmentCalendarGrid } from '../../hooks/useDepartmentCalendarGrid';
import DepartmentHeader from './DepartmentHeader';
import DepartmentDayCell from './DepartmentDayCell';
import StatsModal from './StatsModal';
import AssignmentPopover from './AssignmentPopover';
import ExportICSModal from './ExportICSModal';

import { exportDepartmentToPDF } from '../../utils/export';
import { generateDoctorICS, downloadICSFile } from '../../utils/icsExport';

// Helper to get date string in YYYY-MM-DD format using local time components
const getDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DepartmentScheduleViewProps {
  allDoctors: Doctor[];
  showPkdv: boolean;
  departmentAssignments: Record<string, Partial<DepartmentAssignments>>;
  onUpdateDepartmentAssignments: (date: Date, role: DepartmentRole, doctors: string[]) => void;
  onViewDateChange: (date: Date) => void;
  getDoctorsForDate: (date: Date) => string[] | undefined;
  holidaySchedule?: HolidayScheduleData;
}

interface EditingState {
  date: Date;
  role: DepartmentRole;
  target: HTMLElement;
}

const DepartmentScheduleView: React.FC<DepartmentScheduleViewProps> = (props) => {
  const {
    allDoctors,
    showPkdv,
    departmentAssignments,
    onUpdateDepartmentAssignments,
    onViewDateChange,
    getDoctorsForDate,
  } = props;

  // Helper to check if a date is within holiday period
  const isHolidayDate = (date: Date): boolean => {
    const hs = props.holidaySchedule;
    if (!hs?.startDate || !hs?.endDate) return false;
    const start = new Date(hs.startDate);
    const end = new Date(hs.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return check >= start && check <= end;
  };

  const [currentDate, setCurrentDate] = useState(() => getInitialScheduleMonthDate());
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isICSModalOpen, setIsICSModalOpen] = useState(false);
  const [hoveredDoctor, setHoveredDoctor] = useState<string | null>(null);
  const [selectedMobileWeekId, setSelectedMobileWeekId] = useState<string>('');
  const mobileWeekTablistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onViewDateChange(currentDate);
  }, [currentDate, onViewDateChange]);

  const calendarGrid = useDepartmentCalendarGrid(currentDate);
  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let index = 0; index < calendarGrid.length; index += 7) {
      weeks.push(calendarGrid.slice(index, index + 7));
    }
    return weeks;
  }, [calendarGrid]);

  const ctchDoctors = useMemo(() => {
    return allDoctors.filter((doc) => doc.isCtch).sort((a, b) => a.name.localeCompare(b.name));
  }, [allDoctors]);

  const handleOpenEditor = (e: React.MouseEvent, date: Date, role: DepartmentRole) => {
    setEditing({ date, role, target: e.currentTarget as HTMLElement });
  };

  const handlePopoverSave = (doctors: string[]) => {
    if (editing) {
      onUpdateDepartmentAssignments(editing.date, editing.role, doctors);
      setEditing(null);
    }
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

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  const currentMonthDays = calendarGrid.filter((day) => day.isCurrentMonth);

  const mobileWeekGroups = useMemo(() => {
    return calendarWeeks
      .map((week, idx) => {
        const days = week.filter(
          (day) => day.isCurrentMonth && day.date.getTime() >= START_DATE.getTime(),
        );
        if (days.length === 0) return null;
        return {
          id: `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-dept-week-${idx + 1}`,
          index: idx + 1,
          days,
          hasToday: days.some((day) => day.isToday),
          startDate: days[0].date,
          endDate: days[days.length - 1].date,
        };
      })
      .filter((group): group is NonNullable<typeof group> => group !== null);
  }, [calendarWeeks, currentDate]);

  useEffect(() => {
    if (mobileWeekGroups.length === 0) {
      setSelectedMobileWeekId('');
      return;
    }
    const todayWeek = mobileWeekGroups.find((group) => group.hasToday);
    setSelectedMobileWeekId((current) => {
      if (current === 'all' || mobileWeekGroups.some((group) => group.id === current)) {
        return current;
      }
      return todayWeek?.id || mobileWeekGroups[0].id;
    });
  }, [mobileWeekGroups]);

  useEffect(() => {
    const container = mobileWeekTablistRef.current;
    if (!container) return;
    const activeTab = container.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!activeTab) return;
    const targetLeft = Math.max(
      0,
      activeTab.offsetLeft - (container.clientWidth - activeTab.offsetWidth) / 2,
    );
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } else {
      container.scrollLeft = targetLeft;
    }
  }, [selectedMobileWeekId, mobileWeekGroups]);

  const mobileDisplayedDays = useMemo(() => {
    if (selectedMobileWeekId === 'all') {
      return currentMonthDays;
    }
    const activeWeek =
      mobileWeekGroups.find((week) => week.id === selectedMobileWeekId) || mobileWeekGroups[0];
    if (!activeWeek) return currentMonthDays;
    const todayIndex = activeWeek.days.findIndex((day) => day.isToday);
    if (todayIndex > 0) {
      return [...activeWeek.days.slice(todayIndex), ...activeWeek.days.slice(0, todayIndex)];
    }
    return activeWeek.days;
  }, [selectedMobileWeekId, mobileWeekGroups, currentMonthDays]);

  const formatShortRangeDate = (date: Date) =>
    date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });

  const handleToday = () => {
    const currentMonth = getCurrentMonthDate();
    const isSameMonth =
      currentDate.getFullYear() === currentMonth.getFullYear() &&
      currentDate.getMonth() === currentMonth.getMonth();
    if (!isSameMonth) {
      setCurrentDate(currentMonth);
      setSelectedMobileWeekId('');
      return;
    }
    const todayWeek = mobileWeekGroups.find((group) => group.hasToday);
    setSelectedMobileWeekId(todayWeek?.id || '');
  };

  return (
    <div className="department-roster">
      <DepartmentHeader
        currentDate={currentDate}
        onPrevMonth={() =>
          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
        }
        onNextMonth={() =>
          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
        }
        onToday={handleToday}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onExportPDF={async () =>
          exportDepartmentToPDF(
            calendarGrid,
            currentDate,
            departmentAssignments,
            getDoctorsForDate,
            showPkdv,
          )
        }
        onExportICS={() => setIsICSModalOpen(true)}
      />
      <div className="hidden overflow-x-auto sm:block">
        <div className="min-w-[980px] xl:min-w-0">
          <div className="weekday-row grid grid-cols-7">
            {weekDays.map((day) => (
              <div key={day} className="weekday-label">
                {day}
              </div>
            ))}
          </div>

          {calendarWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className="department-week grid grid-cols-7">
              {week.map((day, index) => (
                <DepartmentDayCell
                  key={index}
                  day={day}
                  assignments={departmentAssignments[getDateString(day.date)]}
                  onCallDoctors={getDoctorsForDate(day.date)}
                  showPkdv={showPkdv}
                  onOpenEditor={handleOpenEditor}
                  isHoliday={isHolidayDate(day.date)}
                  viewMode="card"
                  hoveredDoctor={hoveredDoctor}
                  onHoverDoctor={setHoveredDoctor}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="sm:hidden space-y-2.5">
        {mobileWeekGroups.length > 0 && (
          <div
            ref={mobileWeekTablistRef}
            className="scrollbar-none -mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1"
            role="tablist"
            aria-label="Chọn tuần hoạt động khoa"
          >
            {mobileWeekGroups.map((week) => {
              const isSelected = selectedMobileWeekId === week.id;
              return (
                <button
                  key={week.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedMobileWeekId(week.id)}
                  className={`flex shrink-0 snap-start items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {week.hasToday && (
                    <span
                      className={`h-2 w-2 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-indigo-500'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span>Tuần {week.index}</span>
                  <span
                    className={`text-[11px] font-semibold ${
                      isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    ({formatShortRangeDate(week.startDate)}–{formatShortRangeDate(week.endDate)})
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              role="tab"
              aria-selected={selectedMobileWeekId === 'all'}
              onClick={() => setSelectedMobileWeekId('all')}
              className={`shrink-0 snap-start rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                selectedMobileWeekId === 'all'
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              Cả tháng
            </button>
          </div>
        )}

        {mobileDisplayedDays.map((day) => (
          <DepartmentDayCell
            key={getDateString(day.date)}
            day={day}
            assignments={departmentAssignments[getDateString(day.date)]}
            onCallDoctors={getDoctorsForDate(day.date)}
            showPkdv={showPkdv}
            onOpenEditor={handleOpenEditor}
            isHoliday={isHolidayDate(day.date)}
            variant="list"
            hoveredDoctor={hoveredDoctor}
            onHoverDoctor={setHoveredDoctor}
          />
        ))}
      </div>
      {isStatsModalOpen && (
        <StatsModal
          currentDate={currentDate}
          departmentAssignments={departmentAssignments}
          allDoctors={allDoctors.filter((d) => d.isCtch).map((d) => d.name)}
          getDoctorsForDate={getDoctorsForDate}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}
      {editing && (
        <AssignmentPopover
          editingState={editing}
          assignmentDoctors={ctchDoctors.map((d) => d.name)}
          getDoctorsForDate={getDoctorsForDate}
          departmentAssignments={departmentAssignments}
          onSave={handlePopoverSave}
          onCancel={() => setEditing(null)}
        />
      )}
      <ExportICSModal
        isOpen={isICSModalOpen}
        onClose={() => setIsICSModalOpen(false)}
        allDoctors={ctchDoctors}
        onExport={handleExportICS}
      />
    </div>
  );
};

export default DepartmentScheduleView;
